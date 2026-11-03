using System.Globalization;
using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Elrond.Domain.Regras;
using Microsoft.Extensions.Logging;

namespace Elrond.Application.Services;

/// <summary>Lançamento escolhido para pagar, como a tela de agendamento mostra.</summary>
public sealed record PreparoPagamentoDto(
    string MovimentoId, long Numero, string EmpresaId, string Favorecido, string Email, string ChaveSugerida, decimal Valor,
    string Vencimento, string Descricao, string Banco, string Problema, PagamentoBancario? Atual);

/// <summary>Um lançamento a mandar ao banco: Pix (chave) ou boleto (linha digitável; vencimento só se o código não trouxer).</summary>
public sealed record ItemAgendamentoDto(string MovimentoId, string Chave, string Forma = PagamentoBancario.FormaPix, string Codigo = "", string Vencimento = "");
public sealed record AgendarPagamentosDto(List<ItemAgendamentoDto> Itens, string Data);
public sealed record ResultadoAgendamentoDto(string MovimentoId, bool Ok, string Mensagem, PagamentoBancario? Pagamento);

/// <summary>Uma conferência do Monitor: nivel = ok | aviso | erro.</summary>
public sealed record ConferenciaDto(string Nivel, string Texto);

/// <summary>Linha do Monitor de pagamentos: o pagamento, o lançamento como está agora e as conferências.</summary>
public sealed record ItemMonitorDto(PagamentoBancario Pagamento, string Empresa, string Conta, decimal ValorLancamento, string VencimentoLancamento,
    string Aprovacao, string DescricaoLancamento, List<ConferenciaDto> Conferencias);

/// <summary>Comprovante do Pix pago pelo ELROND (o banco devolve dados, não PDF): o que mostrar e imprimir no lançamento.</summary>
public sealed record ComprovantePixDto(
    string MovimentoId, long Numero, string Descricao, decimal Valor, string EfetivadoEm,
    string Favorecido, string Chave, string TipoChave,
    string Banco, string Empresa, string Conta, string Ambiente,
    string IdPix, string CodigoBanco,
    string AgendadoPor, string AgendadoEm, string ConfirmadoComo, string ConfirmadoEm,
    string EmailSituacao, string EmailPara, string EmailEm,
    string EmpresaCnpj = "",
    string Forma = PagamentoBancario.FormaPix, string CodigoBarras = "", string VencimentoBoleto = "", string Beneficiario = "");

/// <summary>
/// Pagamentos pelo banco (piloto: Pix). Para cada lançamento a pagar APROVADO, grava o pagamento
/// antes de mandar ao banco (o id dele é a chave de idempotência), envia e traduz a resposta. Pix
/// efetivado na hora dá baixa no lançamento e avisa o favorecido por e-mail; Pix que espera aprovação
/// no app do banco fica "aguardando aprovação" até o aviso do banco (ou a conferência de hora em
/// hora) dizer que foi pago. A baixa usa a conta ligada à integração (Conta do Caixa).
/// </summary>
public sealed class PagamentoService(
    ICrudRepository<PagamentoBancario> pagamentos,
    ICrudRepository<Movimento> movimentos,
    ICrudRepository<IntegracaoBancaria> integracoes,
    ICrudRepository<Fornecedor> fornecedores,
    ICrudRepository<Carteira> carteiras,
    ICrudRepository<Empresa> empresas,
    IUserRepository usuarios,
    IBancos bancos,
    ICofreBancario cofre,
    IFinanceiroService financeiro,
    EmailService email,
    IAuditoriaService auditoria,
    TimeProvider relogio,
    ILogger<PagamentoService> log)
{
    private static readonly UsuarioAtual Banco = new("sistema", "Aviso do banco", "Admin");
    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");

    /// <summary>Comprovante do Pix que liquidou o lançamento; null se ele não foi pago pelo ELROND.</summary>
    public async Task<ComprovantePixDto?> ComprovanteAsync(string movimentoId)
    {
        var m = await movimentos.GetByIdAsync(movimentoId);
        if (m is null) return null;
        var p = (m.PagamentoBancarioId.Length > 0 ? await pagamentos.GetByIdAsync(m.PagamentoBancarioId) : null)
                ?? (await pagamentos.ListarAsync(x => x.MovimentoId == m.Id && x.Situacao == PagamentoBancario.Pago)).FirstOrDefault();
        if (p is null || p.Situacao != PagamentoBancario.Pago) return null;
        var integ = await integracoes.GetByIdAsync(p.IntegracaoId);
        var empresa = await empresas.GetByIdAsync(p.EmpresaId);
        var conta = integ is not null && integ.CarteiraId.Length > 0 ? await carteiras.GetByIdAsync(integ.CarteiraId) : null;
        var tipo = ChavePix.Normalizar(p.Chave).Tipo;
        var mail = p.FavorecidoEmail;
        var mailMascarado = mail.Contains('@') ? $"{mail[..Math.Min(2, mail.IndexOf('@'))]}***{mail[mail.IndexOf('@')..]}" : string.Empty;
        return new ComprovantePixDto(
            m.Id, m.Numero, p.Descricao, p.Valor, p.PagoEm,
            p.FavorecidoNome, ChavePix.Mascarar(p.Chave), tipo,
            bancos.Modulo(p.Banco)?.Nome ?? p.Banco, empresa?.Nome ?? string.Empty,
            conta?.Nome ?? string.Empty, p.Ambiente,
            p.EndToEnd, p.IdBanco,
            p.CriadoPor, p.CriadoEm, QuemConfirmou(p.ConfirmadaPor), p.ConfirmadaEm,
            p.EmailSituacao, mailMascarado, p.EmailEm,
            empresa?.Cnpj ?? string.Empty,
            p.Forma, p.CodigoBarras, p.VencimentoBoleto, p.Beneficiario);
    }

    public async Task<List<PagamentoBancario>> ListarAsync() =>
        (await pagamentos.GetAllAsync()).OrderByDescending(p => p.CriadoEm).Take(300).ToList();

    /// <summary>O que a tela de agendamento precisa: favorecido, chave sugerida do cadastro, valor e o que impede pagar.</summary>
    public async Task<List<PreparoPagamentoDto>> PrepararAsync(List<string> movimentoIds)
    {
        var ids = (movimentoIds ?? new()).ToHashSet();
        var movs = await movimentos.ListarAsync(m => ids.Contains(m.Id));
        var todasInteg = await integracoes.GetAllAsync();
        var atuais = (await pagamentos.ListarAsync(p => ids.Contains(p.MovimentoId))).Where(p => p.Vigente).ToList();
        var lista = new List<PreparoPagamentoDto>();
        foreach (var m in movs)
        {
            var (nome, mail, chave) = await FavorecidoAsync(m);
            // Já no formato do Pix (celular com +55); se a do cadastro não serve, vai como está para a pessoa corrigir.
            if (ChavePix.Normalizar(chave) is { Ok: true } formatada) chave = formatada.Chave;
            var integ = IntegracaoDe(todasInteg, m.EmpresaId);
            var atual = atuais.FirstOrDefault(p => p.MovimentoId == m.Id);
            lista.Add(new PreparoPagamentoDto(m.Id, m.Numero, m.EmpresaId, nome, mail, chave, m.Liquido, m.Vencimento, m.Descricao,
                integ is null ? string.Empty : bancos.Modulo(integ.Banco)?.Nome ?? integ.Banco, Problema(m, integ, atual), atual));
        }
        return lista.OrderBy(p => p.Vencimento).ToList();
    }

    /// <summary>Agenda (ou paga hoje) cada lançamento pelo banco. Cada um responde por si: um que falha não trava os outros.</summary>
    /// <param name="forcarRepresar">Quem agenda sem poder liberar: represa sempre, mesmo com o represamento desligado na integração.</param>
    public async Task<List<ResultadoAgendamentoDto>> AgendarAsync(AgendarPagamentosDto dto, UsuarioAtual quem, CancellationToken ct = default, bool forcarRepresar = false)
    {
        var hoje = DateOnly.FromDateTime(relogio.GetLocalNow().DateTime);
        var resultados = new List<ResultadoAgendamentoDto>();
        if (!DateOnly.TryParseExact(dto.Data ?? string.Empty, "yyyy-MM-dd", out var data) || data < hoje)
            return (dto.Itens ?? new()).Select(i => new ResultadoAgendamentoDto(i.MovimentoId, false, "Data inválida: escolha hoje ou um dia futuro.", null)).ToList();
        if (!cofre.Configurado)
            return (dto.Itens ?? new()).Select(i => new ResultadoAgendamentoDto(i.MovimentoId, false, "A chave de cifra das credenciais não está configurada neste ambiente.", null)).ToList();
        var todasInteg = await integracoes.GetAllAsync();
        foreach (var item in dto.Itens ?? new())
        {
            var r = await AgendarUmAsync(item, data.ToString("yyyy-MM-dd"), todasInteg, quem, ct, forcarRepresar);
            resultados.Add(r);
        }
        return resultados;
    }

    private async Task<ResultadoAgendamentoDto> AgendarUmAsync(ItemAgendamentoDto item, string data, List<IntegracaoBancaria> todasInteg, UsuarioAtual quem, CancellationToken ct, bool forcarRepresar = false)
    {
        var m = await movimentos.GetByIdAsync(item.MovimentoId);
        if (m is null) return new(item.MovimentoId, false, "Lançamento não encontrado.", null);
        var integ = IntegracaoDe(todasInteg, m.EmpresaId);
        var atual = (await pagamentos.ListarAsync(p => p.MovimentoId == m.Id)).FirstOrDefault(p => p.Vigente);
        if (Problema(m, integ, atual) is { Length: > 0 } problema) return new(m.Id, false, problema, atual);
        if (item.Forma == PagamentoBancario.FormaBoleto) return await AgendarBoletoAsync(m, item, data, integ!, quem, ct, forcarRepresar);
        var chavePix = ChavePix.Normalizar(item.Chave);
        if (!chavePix.Ok) return new(m.Id, false, chavePix.Erro, null);
        var chave = chavePix.Chave;
        var (nome, mail, _) = await FavorecidoAsync(m);

        var p = new PagamentoBancario
        {
            Id = Guid.NewGuid().ToString(),
            EmpresaId = m.EmpresaId,
            IntegracaoId = integ!.Id,
            Banco = integ.Banco,
            Ambiente = integ.Ambiente,
            MovimentoId = m.Id,
            MovimentoNumero = m.Numero,
            FavorecidoNome = nome,
            FavorecidoEmail = mail,
            Chave = chave,
            Valor = m.Liquido,
            Data = data,
            Descricao = Descricao(m),
            Situacao = PagamentoBancario.Pendente,
        };
        if (integ.RepresarPagamentos || forcarRepresar) return await RepresarAsync(p, m, quem);
        // Grava antes de chamar o banco: queda no meio não perde o rastro (e o id reenviado não paga duas vezes).
        await pagamentos.AddAsync(p);
        return await EnviarPixAsync(p, m, integ, quem, ct);
    }

    private async Task<ResultadoAgendamentoDto> EnviarPixAsync(PagamentoBancario p, Movimento m, IntegracaoBancaria integ, UsuarioAtual quem, CancellationToken ct)
    {
        var modulo = bancos.Modulo(integ.Banco)!.Pagamento!;
        var envio = await modulo.PagarPixAsync(cofre.Abrir(integ), new PedidoPix(p.Id, p.Valor, p.Data, p.Descricao, p.Chave), ct);
        p.IdBanco = envio.IdBanco;
        p.Mensagem = envio.Mensagem;
        p.Situacao = envio.Desfecho switch
        {
            DesfechoPagamento.Processado => PagamentoBancario.Processando, // confirma na consulta logo abaixo
            DesfechoPagamento.AguardandoAprovacao => PagamentoBancario.AguardandoAprovacao,
            DesfechoPagamento.Agendado => PagamentoBancario.Agendado,
            DesfechoPagamento.Recusado => PagamentoBancario.Recusado,
            _ => PagamentoBancario.Incerto,
        };
        await pagamentos.UpdateAsync(p.Id, p);
        await auditoria.RegistrarAsync("pagar", "PagamentoBancario", p.Id,
            $"{quem.Nome} mandou ao banco o Pix de {p.Valor.ToString("C", PtBr)} para {p.FavorecidoNome} (lançamento {m.Numero}, {p.Data}): {Rotulo(p.Situacao)}{(p.Mensagem.Length > 0 ? $" — {p.Mensagem}" : string.Empty)}");
        if (envio.Desfecho == DesfechoPagamento.Processado) p = await AtualizarAsync(p, "envio", ct) ?? p;
        var ok = p.Situacao is not (PagamentoBancario.Recusado or PagamentoBancario.Falha or PagamentoBancario.Cancelado);
        return new(m.Id, ok, ok ? Rotulo(p.Situacao) : $"O banco não aceitou: {p.Mensagem}", p);
    }

    /// <summary>
    /// Boleto: confere o código (dígitos, valor e vencimento impressos) contra o lançamento, grava e manda
    /// ao banco UMA vez. Sem resposta, fica "sem confirmação" e a conferência procura pelo código no banco;
    /// nunca reenvia sozinho (o Inter não tem idempotência para boleto: reenviar pagaria duas vezes).
    /// </summary>
    private async Task<ResultadoAgendamentoDto> AgendarBoletoAsync(Movimento m, ItemAgendamentoDto item, string data, IntegracaoBancaria integ, UsuarioAtual quem, CancellationToken ct, bool forcarRepresar = false)
    {
        var hoje = DateOnly.FromDateTime(relogio.GetLocalNow().DateTime);
        var (codigo, erro) = CodigoBoleto.Ler(item.Codigo, hoje);
        if (codigo is null) return new(m.Id, false, erro, null);
        var vencimento = codigo.Vencimento?.ToString("yyyy-MM-dd")
            ?? (DateOnly.TryParseExact(item.Vencimento ?? string.Empty, "yyyy-MM-dd", out var v) ? v.ToString("yyyy-MM-dd") : m.Vencimento);
        if (!DateOnly.TryParseExact(vencimento, "yyyy-MM-dd", out _)) return new(m.Id, false, "Informe o vencimento do boleto.", null);
        // O valor impresso no código tem de bater com o lançamento; depois do vencimento pode ser maior (juros e multa).
        if (codigo.Valor > 0 && m.Liquido != codigo.Valor && !(m.Liquido > codigo.Valor && string.CompareOrdinal(data, vencimento) > 0))
            return new(m.Id, false, $"O boleto é de {codigo.Valor.ToString("C", PtBr)} e o lançamento, de {m.Liquido.ToString("C", PtBr)}: ajuste o lançamento (ou confira se é o boleto certo).", null);
        var mesmo = (await pagamentos.ListarAsync(p => p.CodigoBarras == codigo.CodigoBarras)).FirstOrDefault(p => p.Vigente);
        if (mesmo is not null) return new(m.Id, false, $"Este boleto já foi mandado ao banco pelo lançamento {mesmo.MovimentoNumero} ({Rotulo(mesmo.Situacao)}).", mesmo);
        var (nome, mail, _) = await FavorecidoAsync(m);

        var p = new PagamentoBancario
        {
            Id = Guid.NewGuid().ToString(),
            EmpresaId = m.EmpresaId,
            IntegracaoId = integ.Id,
            Banco = integ.Banco,
            Ambiente = integ.Ambiente,
            MovimentoId = m.Id,
            MovimentoNumero = m.Numero,
            FavorecidoNome = nome,
            FavorecidoEmail = mail,
            Forma = PagamentoBancario.FormaBoleto,
            CodigoBarras = codigo.CodigoBarras, // sempre os 44 do código de barras: linha e código do mesmo boleto são o mesmo
            VencimentoBoleto = vencimento,
            Valor = m.Liquido,
            Data = data,
            Descricao = Descricao(m),
            Situacao = PagamentoBancario.Pendente,
        };
        if (integ.RepresarPagamentos || forcarRepresar) return await RepresarAsync(p, m, quem);
        // Grava antes de chamar o banco: queda no meio não perde o rastro e o mesmo código não vai de novo.
        await pagamentos.AddAsync(p);
        return await EnviarBoletoAsync(p, m, integ, quem, ct);
    }

    private async Task<ResultadoAgendamentoDto> EnviarBoletoAsync(PagamentoBancario p, Movimento m, IntegracaoBancaria integ, UsuarioAtual quem, CancellationToken ct)
    {
        var modulo = bancos.Modulo(integ.Banco)!.Pagamento!;
        var envio = await modulo.PagarBoletoAsync(cofre.Abrir(integ), new PedidoBoleto(p.Id, p.CodigoBarras, p.Valor, p.Data, p.VencimentoBoleto), ct);
        p.IdBanco = envio.IdBanco;
        p.Mensagem = envio.Mensagem;
        p.Situacao = envio.Desfecho switch
        {
            DesfechoPagamento.Processado => PagamentoBancario.Processando,
            DesfechoPagamento.AguardandoAprovacao => PagamentoBancario.AguardandoAprovacao,
            DesfechoPagamento.Agendado => PagamentoBancario.Agendado,
            DesfechoPagamento.Recusado => PagamentoBancario.Recusado,
            _ => PagamentoBancario.Incerto,
        };
        await pagamentos.UpdateAsync(p.Id, p);
        await auditoria.RegistrarAsync("pagar", "PagamentoBancario", p.Id,
            $"{quem.Nome} mandou ao banco o boleto de {p.Valor.ToString("C", PtBr)} de {p.FavorecidoNome} (lançamento {m.Numero}, pagar em {p.Data}, vence {p.VencimentoBoleto}): {Rotulo(p.Situacao)}{(p.Mensagem.Length > 0 ? $" — {p.Mensagem}" : string.Empty)}");
        if (envio.Desfecho == DesfechoPagamento.Processado) p = await AtualizarAsync(p, "envio", ct) ?? p;
        var ok = p.Situacao is not (PagamentoBancario.Recusado or PagamentoBancario.Falha or PagamentoBancario.Cancelado);
        return new(m.Id, ok, ok ? Rotulo(p.Situacao) : $"O banco não aceitou: {p.Mensagem}", p);
    }

    /// <summary>
    /// Monitor dos pagamentos assistidos: cada pagamento com o lançamento ao lado e a conferência de cada um
    /// (o que bate, o que avisa e o que impede liberar). Os represados primeiro, depois os em andamento.
    /// </summary>
    public async Task<List<ItemMonitorDto>> MonitorAsync(int dias = 30)
    {
        var desde = relogio.GetUtcNow().AddDays(-dias).ToString("o", CultureInfo.InvariantCulture);
        var lista = (await pagamentos.GetAllAsync()).Where(p => p.Situacao == PagamentoBancario.Represado || p.EmAberto || string.CompareOrdinal(p.CriadoEm, desde) >= 0).ToList();
        var ids = lista.Select(p => p.MovimentoId).ToHashSet();
        var movs = (await movimentos.ListarAsync(m => ids.Contains(m.Id))).ToDictionary(m => m.Id);
        var nomesEmpresa = (await empresas.GetAllAsync()).ToDictionary(e => e.Id, e => e.Nome);
        var integs = (await integracoes.GetAllAsync()).ToDictionary(i => i.Id);
        var contas = (await carteiras.GetAllAsync()).ToDictionary(c => c.Id, c => c.Nome);
        var hoje = DateOnly.FromDateTime(relogio.GetLocalNow().DateTime);
        int Ordem(PagamentoBancario p) => p.Situacao == PagamentoBancario.Represado ? 0 : p.EmAberto ? 1 : 2;
        return lista.OrderBy(Ordem).ThenByDescending(p => p.CriadoEm).Select(p =>
        {
            movs.TryGetValue(p.MovimentoId, out var m);
            integs.TryGetValue(p.IntegracaoId, out var integ);
            var conta = integ is not null && contas.TryGetValue(integ.CarteiraId, out var nc) ? nc : string.Empty;
            return new ItemMonitorDto(p, nomesEmpresa.GetValueOrDefault(p.EmpresaId, string.Empty), conta,
                m?.Liquido ?? 0m, m?.Vencimento ?? string.Empty, m?.Aprovacao ?? string.Empty, m?.Descricao ?? string.Empty,
                Conferencias(p, m, hoje, lista));
        }).ToList();
    }

    /// <summary>O que conferir antes de liberar: ok (bate), aviso (olhar com atenção) ou erro (não libera).</summary>
    public static List<ConferenciaDto> Conferencias(PagamentoBancario p, Movimento? m, DateOnly hoje, IEnumerable<PagamentoBancario> todos)
    {
        var l = new List<ConferenciaDto>();
        void Add(string nivel, string texto) => l.Add(new ConferenciaDto(nivel, texto));
        if (m is null) { Add("erro", "O lançamento não existe mais."); return l; }
        if (m.Cancelado) Add("erro", "Lançamento cancelado.");
        if (m.PagoEm.Length > 0 && p.Situacao == PagamentoBancario.Represado) Add("erro", "Lançamento já liquidado (pago de outro jeito?).");
        Add(m.Aprovacao == "aprovado" ? "ok" : "erro", m.Aprovacao == "aprovado" ? "Lançamento aprovado." : "Lançamento não está aprovado.");
        Add(m.Liquido == p.Valor ? "ok" : "erro", m.Liquido == p.Valor ? $"Valor igual ao do lançamento ({p.Valor.ToString("C", PtBr)})." : $"Valor diferente: lançamento {m.Liquido.ToString("C", PtBr)}, pagamento {p.Valor.ToString("C", PtBr)}.");
        if (p.Forma == PagamentoBancario.FormaBoleto)
        {
            var (c, erro) = CodigoBoleto.Ler(p.CodigoBarras, hoje);
            if (c is null) { Add("erro", $"Código do boleto: {erro}"); return l; }
            Add("ok", $"Código do boleto confere ({(c.Arrecadacao ? "conta de consumo/tributo" : "boleto bancário")}).");
            if (c.Valor > 0) Add(c.Valor == p.Valor ? "ok" : "aviso", c.Valor == p.Valor ? "Valor impresso no código igual ao pagamento." : $"O código diz {c.Valor.ToString("C", PtBr)} e o pagamento é de {p.Valor.ToString("C", PtBr)} (juros/multa?).");
            if (DateOnly.TryParseExact(p.VencimentoBoleto, "yyyy-MM-dd", out var venc))
            {
                var limite = DiasUteis.ProximoUtil(venc);
                var pagar = DateOnly.TryParseExact(p.Data, "yyyy-MM-dd", out var d) ? (d < hoje ? hoje : d) : hoje;
                if (pagar > limite)
                    Add("aviso", $"Boleto vencido em {venc:dd/MM/yyyy}: quem recebe pode cobrar juros e multa, e o banco pode recusar pelo valor original. Se houver encargos, inclua no lançamento (item variável) e mande de novo.");
                else if (limite != venc)
                    Add("ok", $"Vence em {venc:dd/MM/yyyy}, dia não útil: pagando até {limite:dd/MM/yyyy} não tem encargo.");
                else Add("ok", $"Dentro do vencimento ({venc:dd/MM/yyyy}).");
            }
            if (todos.Any(x => x.Id != p.Id && x.CodigoBarras == p.CodigoBarras && x.Vigente)) Add("erro", "Este boleto tem outro pagamento em andamento.");
        }
        else
        {
            var chave = ChavePix.Normalizar(p.Chave);
            Add(chave.Ok ? "ok" : "erro", chave.Ok ? $"Chave Pix válida ({chave.Tipo})." : $"Chave Pix: {chave.Erro}");
        }
        if (p.FavorecidoEmail.Length == 0) Add("aviso", "Favorecido sem e-mail no cadastro: o comprovante não vai por e-mail.");
        return l;
    }

    /// <summary>Grava o pagamento PARADO (não vai ao banco): espera a conferência e a liberação no Monitor.</summary>
    private async Task<ResultadoAgendamentoDto> RepresarAsync(PagamentoBancario p, Movimento m, UsuarioAtual quem)
    {
        p.Situacao = PagamentoBancario.Represado;
        p.Mensagem = "Represado: confira no Monitor de pagamentos e libere para o banco.";
        await pagamentos.AddAsync(p);
        await auditoria.RegistrarAsync("represar", "PagamentoBancario", p.Id,
            $"{quem.Nome} preparou {(p.Forma == PagamentoBancario.FormaBoleto ? "o boleto" : "o Pix")} de {p.Valor.ToString("C", PtBr)} para {p.FavorecidoNome} (lançamento {m.Numero}): represado, não foi ao banco");
        return new(m.Id, true, Rotulo(p.Situacao), p);
    }

    /// <summary>
    /// Libera o represado para o banco, depois de conferir de novo o lançamento (pode ter mudado desde que foi
    /// represado): segue aprovado, em aberto e com o mesmo valor. Data que já passou vira hoje.
    /// </summary>
    public async Task<Result<PagamentoBancario>> LiberarAsync(string id, UsuarioAtual quem, CancellationToken ct = default)
    {
        var p = await pagamentos.GetByIdAsync(id);
        if (p is null) return Result.Failure<PagamentoBancario>("Pagamento não encontrado.");
        if (p.Situacao != PagamentoBancario.Represado) return Result.Failure<PagamentoBancario>($"Este pagamento não está represado ({Rotulo(p.Situacao)}).");
        var m = await movimentos.GetByIdAsync(p.MovimentoId);
        var integ = await integracoes.GetByIdAsync(p.IntegracaoId);
        if (m is null) return Result.Failure<PagamentoBancario>("O lançamento deste pagamento não existe mais.");
        var problema = m.Tipo != "pagar" ? "Só lançamento a pagar." : m.Cancelado ? "O lançamento foi cancelado." : m.PagoEm.Length > 0 ? "O lançamento já foi liquidado."
            : m.Aprovacao != "aprovado" ? "O lançamento não está mais aprovado." : m.Liquido != p.Valor ? $"O lançamento mudou de valor ({m.Liquido.ToString("C", PtBr)}; o represado é de {p.Valor.ToString("C", PtBr)}): cancele o represado e mande de novo."
            : integ is null || !integ.Libera(IntegracaoBancaria.RecursoPagamento) || bancos.Modulo(integ.Banco)?.Pagamento is null ? "A integração do banco está desligada."
            : !cofre.Configurado ? "A chave de cifra das credenciais não está configurada neste ambiente." : string.Empty;
        if (problema.Length > 0) return Result.Failure<PagamentoBancario>(problema);
        var hoje = DateOnly.FromDateTime(relogio.GetLocalNow().DateTime).ToString("yyyy-MM-dd");
        if (string.CompareOrdinal(p.Data, hoje) < 0) p.Data = hoje;
        p.Situacao = PagamentoBancario.Pendente;
        p.Mensagem = string.Empty;
        p.LiberadoPor = quem.Nome;
        p.LiberadoEm = relogio.GetUtcNow().ToString("o", CultureInfo.InvariantCulture);
        await pagamentos.UpdateAsync(p.Id, p);
        await auditoria.RegistrarAsync("liberar", "PagamentoBancario", p.Id,
            $"{quem.Nome} conferiu e liberou para o banco {(p.Forma == PagamentoBancario.FormaBoleto ? "o boleto" : "o Pix")} de {p.Valor.ToString("C", PtBr)} para {p.FavorecidoNome} (lançamento {m.Numero}, pagar em {p.Data})");
        var r = p.Forma == PagamentoBancario.FormaBoleto ? await EnviarBoletoAsync(p, m, integ!, quem, ct) : await EnviarPixAsync(p, m, integ!, quem, ct);
        return r.Pagamento is { } final ? Result.Success(final) : Result.Failure<PagamentoBancario>(r.Mensagem);
    }

    /// <summary>Desiste do represado (nada foi ao banco): o lançamento pode ser mandado de novo.</summary>
    public async Task<Result<PagamentoBancario>> CancelarRepresadoAsync(string id, UsuarioAtual quem)
    {
        var p = await pagamentos.GetByIdAsync(id);
        if (p is null) return Result.Failure<PagamentoBancario>("Pagamento não encontrado.");
        if (p.Situacao != PagamentoBancario.Represado) return Result.Failure<PagamentoBancario>("Só o pagamento represado (que não foi ao banco) é cancelado aqui.");
        p.Situacao = PagamentoBancario.Cancelado;
        p.Mensagem = $"Represado cancelado por {quem.Nome}: não foi ao banco.";
        await pagamentos.UpdateAsync(p.Id, p);
        await auditoria.RegistrarAsync("cancelar", "PagamentoBancario", p.Id, $"{quem.Nome} cancelou o represado de {p.Valor.ToString("C", PtBr)} para {p.FavorecidoNome} (lançamento {p.MovimentoNumero}): não foi ao banco");
        return Result.Success(p);
    }

    /// <summary>
    /// Boleto que ficou sem confirmação e o banco não mostra: depois de conferir de novo no banco, encerra o
    /// pagamento para o lançamento poder ser mandado outra vez. Quem descarta diz que conferiu no app.
    /// </summary>
    public async Task<Result<PagamentoBancario>> DescartarAsync(string id, UsuarioAtual quem, CancellationToken ct = default)
    {
        var p = await pagamentos.GetByIdAsync(id);
        if (p is null) return Result.Failure<PagamentoBancario>("Pagamento não encontrado.");
        if (p.Forma != PagamentoBancario.FormaBoleto || p.IdBanco.Length > 0 || p.Situacao is not (PagamentoBancario.Incerto or PagamentoBancario.Pendente))
            return Result.Failure<PagamentoBancario>("Só dá para descartar o boleto que ficou sem confirmação e que o banco não mostra.");
        var integ = await integracoes.GetByIdAsync(p.IntegracaoId);
        if (integ is null || bancos.Modulo(integ.Banco)?.Pagamento is not { } modulo || !cofre.Configurado)
            return Result.Failure<PagamentoBancario>("Integração do banco indisponível: não dá para conferir agora.");
        var (achado, falha) = await modulo.ProcurarBoletoAsync(cofre.Abrir(integ), p.CodigoBarras, ct);
        if (falha.Length > 0) return Result.Failure<PagamentoBancario>($"Não deu para conferir no banco agora: {falha}");
        if (achado.Length > 0)
        {
            p.IdBanco = achado;
            await pagamentos.UpdateAsync(p.Id, p);
            return await AtualizarAsync(p, "tela", ct) is { } r
                ? Result.Failure<PagamentoBancario>($"O banco tem este boleto ({Rotulo(r.Situacao)}): ele não foi descartado.")
                : Result.Failure<PagamentoBancario>("O banco tem este boleto: ele não foi descartado.");
        }
        p.Situacao = PagamentoBancario.Cancelado;
        p.Mensagem = $"Descartado por {quem.Nome}: o envio não chegou ao banco.";
        await pagamentos.UpdateAsync(p.Id, p);
        await auditoria.RegistrarAsync("cancelar", "PagamentoBancario", p.Id,
            $"{quem.Nome} descartou o boleto de {p.Valor.ToString("C", PtBr)} (lançamento {p.MovimentoNumero}) que ficou sem confirmação: o banco não mostra o pagamento");
        return Result.Success(p);
    }

    /// <summary>Consulta no banco e aplica (botão "Atualizar" da tela).</summary>
    public async Task<Result<PagamentoBancario>> AtualizarAsync(string id, CancellationToken ct = default)
    {
        var p = await pagamentos.GetByIdAsync(id);
        if (p is null) return Result.Failure<PagamentoBancario>("Pagamento não encontrado.");
        return await AtualizarAsync(p, "tela", ct) is { } r ? Result.Success(r) : Result.Failure<PagamentoBancario>("Não foi possível consultar o banco agora.");
    }

    /// <summary>Aviso do banco (pix-pagamento): acha a integração pelo token, confere cada pagamento no banco e aplica.</summary>
    public async Task<Result<int>> ReceberAvisoAsync(string token, string corpo, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(token) || token.Length < 24) return Result.Failure<int>("Aviso sem identificação.");
        var integracao = (await integracoes.ListarAsync(i => i.AvisoToken == token)).FirstOrDefault();
        if (integracao is null || bancos.Modulo(integracao.Banco)?.Pagamento is not { } modulo) return Result.Failure<int>("Aviso desconhecido.");
        var agora = relogio.GetUtcNow().ToString("o", CultureInfo.InvariantCulture);
        var nossos = 0;
        foreach (var a in modulo.LerAviso(corpo))
        {
            var p = (await pagamentos.ListarAsync(x => x.IntegracaoId == integracao.Id && x.IdBanco == a.IdBanco)).FirstOrDefault();
            if (p is null) continue; // Pix feito fora do ELROND (no app): não é nosso
            nossos++;
            if (p.AvisoEm.Length == 0) p.AvisoEm = agora;
            if (a.DataHora.Length > 0 && p.PagoEm.Length == 0 && InterPago(a.Situacao)) p.PagoEm = a.DataHora;
            await pagamentos.UpdateAsync(p.Id, p);
            await AtualizarAsync(p, "aviso", ct);
        }
        return Result.Success(nossos);
    }

    /// <summary>Rotina: confere no banco os pagamentos que ainda esperam (rede de segurança do aviso).</summary>
    public async Task<int> ConferirAbertosAsync(CancellationToken ct = default, bool incluirAgendadosFuturos = true)
    {
        var hoje = relogio.GetLocalNow().ToString("yyyy-MM-dd");
        // Agendado para outro dia não muda antes do dia: na rodada rápida fica de fora (poupa consultas ao banco).
        var abertos = (await pagamentos.GetAllAsync())
            .Where(p => p.EmAberto && (incluirAgendadosFuturos || !(p.Situacao == PagamentoBancario.Agendado && string.CompareOrdinal(p.Data, hoje) > 0)))
            .ToList();
        var mudaram = 0;
        foreach (var p in abertos)
        {
            var antes = p.Situacao;
            var r = await AtualizarAsync(p, "rotina", ct);
            if (r is not null && r.Situacao != antes) mudaram++;
            await Task.Delay(TimeSpan.FromSeconds(1), ct); // o Inter limita as consultas por minuto
        }
        return mudaram;
    }

    /// <summary>Consulta e aplica a situação do banco; pago → baixa no lançamento e e-mail ao favorecido.</summary>
    private async Task<PagamentoBancario?> AtualizarAsync(PagamentoBancario p, string origem, CancellationToken ct)
    {
        // Represado não foi ao banco: consultar não pode mandar (o Pix sem código seria reenviado).
        if (p.Situacao == PagamentoBancario.Represado) return p;
        var integ = await integracoes.GetByIdAsync(p.IntegracaoId);
        if (integ is null || bancos.Modulo(integ.Banco)?.Pagamento is not { } modulo || !cofre.Configurado) return null;
        var credencial = cofre.Abrir(integ);
        if (p.Forma == PagamentoBancario.FormaBoleto) return await AtualizarBoletoAsync(p, integ, modulo, credencial, origem, ct);
        if (p.IdBanco.Length == 0)
        {
            // Envio incerto: reenviar com o MESMO id é seguro (idempotência) e devolve o código do pagamento.
            var envio = await modulo.PagarPixAsync(credencial, new PedidoPix(p.Id, p.Valor, p.Data, p.Descricao, p.Chave), ct);
            if (envio.IdBanco.Length == 0)
            {
                if (envio.Desfecho == DesfechoPagamento.Recusado) { p.Situacao = PagamentoBancario.Recusado; p.Mensagem = envio.Mensagem; await pagamentos.UpdateAsync(p.Id, p); }
                return p;
            }
            p.IdBanco = envio.IdBanco;
        }
        var c = await modulo.ConsultarPixAsync(credencial, p.IdBanco, ct);
        if (c.Situacao is not { } s) return c.NaoExiste ? p : null;
        var antes = p.Situacao;
        p.Situacao = s.Situacao;
        p.SituacaoBanco = s.SituacaoBanco;
        if (s.EndToEnd.Length > 0) p.EndToEnd = s.EndToEnd;
        if (s.PagoEm.Length > 0) p.PagoEm = s.PagoEm;
        if (s.Mensagem.Length > 0) p.Mensagem = s.Mensagem;
        if (p.Situacao == PagamentoBancario.Pago && antes != PagamentoBancario.Pago)
        {
            p.ConfirmadaEm = relogio.GetUtcNow().ToString("o", CultureInfo.InvariantCulture);
            p.ConfirmadaPor = origem;
            await pagamentos.UpdateAsync(p.Id, p);
            await DarBaixaAsync(p, integ);
            await AvisarFavorecidoAsync(p, ct);
            await auditoria.RegistrarAsync("pago", "PagamentoBancario", p.Id,
                $"Pix de {p.Valor.ToString("C", PtBr)} para {p.FavorecidoNome} efetivado no banco (confirmado {QuemConfirmou(origem)}); lançamento {p.MovimentoNumero} baixado");
        }
        else await pagamentos.UpdateAsync(p.Id, p);
        return p;
    }

    /// <summary>Boleto: sem o código do banco, procura pelo código de barras (nunca reenvia); depois consulta e aplica.</summary>
    private async Task<PagamentoBancario?> AtualizarBoletoAsync(PagamentoBancario p, IntegracaoBancaria integ, IPagamentoBancario modulo, CredencialBanco credencial, string origem, CancellationToken ct)
    {
        if (p.IdBanco.Length == 0)
        {
            var (achado, falha) = await modulo.ProcurarBoletoAsync(credencial, p.CodigoBarras, ct);
            if (falha.Length > 0) return null;
            if (achado.Length == 0)
            {
                p.Mensagem = "O banco não mostra este boleto: o envio não chegou. Confira no app do banco antes de mandar de novo.";
                await pagamentos.UpdateAsync(p.Id, p);
                return p;
            }
            p.IdBanco = achado;
        }
        var c = await modulo.ConsultarBoletoAsync(credencial, p.IdBanco, ct);
        if (c.Situacao is not { } s) return c.NaoExiste ? p : null;
        var antes = p.Situacao;
        p.Situacao = s.Situacao;
        p.SituacaoBanco = s.SituacaoBanco;
        if (s.EndToEnd.Length > 0) p.EndToEnd = s.EndToEnd;
        if (s.PagoEm.Length > 0) p.PagoEm = s.PagoEm;
        if (s.Beneficiario.Length > 0) p.Beneficiario = s.Beneficiario;
        if (s.Mensagem.Length > 0) p.Mensagem = s.Mensagem;
        if (p.Situacao == PagamentoBancario.Pago && antes != PagamentoBancario.Pago)
        {
            p.ConfirmadaEm = relogio.GetUtcNow().ToString("o", CultureInfo.InvariantCulture);
            p.ConfirmadaPor = origem;
            await pagamentos.UpdateAsync(p.Id, p);
            await DarBaixaAsync(p, integ);
            await AvisarFavorecidoAsync(p, ct);
            await auditoria.RegistrarAsync("pago", "PagamentoBancario", p.Id,
                $"Boleto de {p.Valor.ToString("C", PtBr)} de {p.FavorecidoNome} pago no banco (confirmado {QuemConfirmou(origem)}); lançamento {p.MovimentoNumero} baixado");
        }
        else await pagamentos.UpdateAsync(p.Id, p);
        return p;
    }

    private async Task DarBaixaAsync(PagamentoBancario p, IntegracaoBancaria integ)
    {
        var dia = p.PagoEm.Length >= 10 ? p.PagoEm[..10] : relogio.GetLocalNow().ToString("yyyy-MM-dd");
        var r = await financeiro.LiquidarAsync(new BaixaDto(new() { p.MovimentoId }, dia, integ.CarteiraId), Banco);
        // Já baixado (à mão, ou por outro aviso): está tudo certo.
        if (!r.IsSuccess) log.LogInformation("Baixa do pagamento {Id} não aplicada: {Erro}", p.Id, r.Error);
        // O Pix saiu pelo ELROND: marca o lançamento (trava estorno e alteração).
        if (await movimentos.GetByIdAsync(p.MovimentoId) is { } m && m.PagamentoBancarioId != p.Id)
        {
            m.PagamentoBancarioId = p.Id;
            await movimentos.UpdateAsync(m.Id, m);
        }
    }

    private async Task AvisarFavorecidoAsync(PagamentoBancario p, CancellationToken ct)
    {
        // O mesmo comprovante da tela (só o que interessa ao favorecido), no corpo e em PDF anexo.
        var c = await ComprovanteAsync(p.MovimentoId);
        var aviso = c is null
            ? ComprovanteEmail.SemComprovante(p)
            : ComprovanteEmail.Montar(c);
        var r = await email.EnviarAsync(p.FavorecidoEmail, aviso.Assunto, aviso.Html, aviso.Texto, "pagamento", p.Id, aviso.Anexos, layoutProprio: true, ct);
        p.EmailEm = relogio.GetUtcNow().ToString("o", CultureInfo.InvariantCulture);
        p.EmailSituacao = r.IsSuccess ? "enviado" : $"não enviado: {r.Error}";
        await pagamentos.UpdateAsync(p.Id, p);
    }

    /// <summary>Integração da empresa que paga pelo banco (ativa, com pagamento ligado e banco que paga).</summary>
    private IntegracaoBancaria? IntegracaoDe(List<IntegracaoBancaria> todas, string empresaId) =>
        todas.FirstOrDefault(i => i.EmpresaId == empresaId && i.Libera(IntegracaoBancaria.RecursoPagamento) && bancos.Modulo(i.Banco)?.Pagamento is not null);

    /// <summary>O que impede pagar este lançamento pelo banco (vazio = pode).</summary>
    private static string Problema(Movimento m, IntegracaoBancaria? integ, PagamentoBancario? atual) =>
        m.Tipo != "pagar" ? "Só lançamento a pagar." :
        m.Cancelado ? "Lançamento cancelado." :
        m.PagoEm.Length > 0 ? "Já está liquidado." :
        m.Aprovacao != "aprovado" ? "Ainda não aprovado: só lançamento aprovado vai para o banco." :
        atual is not null ? $"Já tem pagamento no banco ({Rotulo(atual.Situacao)})." :
        integ is null ? "A empresa deste lançamento não tem integração bancária com pagamento ligado (Administrativo › Integrações Bancárias)." :
        integ.CarteiraId.Length == 0 ? "A integração não tem a Conta do Caixa ligada (é nela que o pagamento é baixado)." :
        m.Liquido <= 0 ? "Valor zerado." :
        string.Empty;

    /// <summary>Favorecido do lançamento: funcionário (func-{id}) ou fornecedor, com e-mail e a chave Pix do cadastro.</summary>
    private async Task<(string Nome, string Email, string Chave)> FavorecidoAsync(Movimento m)
    {
        // Transferência entre contas: o Pix vai para a empresa da conta de destino (chave sugerida: o CNPJ dela).
        if (m.Transferencia && await movimentos.GetByIdAsync(m.OrigemId) is { } entrada
            && await carteiras.GetByIdAsync(entrada.CarteiraId) is { } destino && await empresas.GetByIdAsync(destino.EmpresaId) is { } dona)
            return ($"{dona.Nome} · {destino.Nome}", string.Empty, new string(dona.Cnpj.Where(char.IsDigit).ToArray()));
        if (m.ParceiroId.StartsWith("func-", StringComparison.Ordinal) && Guid.TryParse(m.ParceiroId[5..], out var uid) && await usuarios.FindByIdAsync(uid) is { } u)
            return (u.Name, u.Email, u.Banco?.Pix ?? string.Empty);
        if (m.ParceiroId.Length > 0 && await fornecedores.GetByIdAsync(m.ParceiroId) is { } f)
        {
            var mail = f.Email.Length > 0 ? f.Email : f.Contatos.Select(c => c.Email).FirstOrDefault(e => e.Length > 0) ?? string.Empty;
            return (f.NomeFantasia.Length > 0 ? f.NomeFantasia : f.Nome, mail, f.Banco?.Pix ?? string.Empty);
        }
        return (m.ParceiroNome, string.Empty, string.Empty);
    }

    private static string Descricao(Movimento m)
    {
        var d = $"Lanç. {m.Numero} · {m.Descricao}".Trim(' ', '·');
        return d.Length > 140 ? d[..140] : d;
    }

    private static bool InterPago(string status) => status.ToUpperInvariant() is "PAGO" or "PROCESSADO" or "REALIZADO";

    private static string QuemConfirmou(string origem) => origem switch { "aviso" => "pelo aviso do banco", "rotina" => "pela conferência automática", "envio" => "na hora do envio", _ => "pela consulta na tela" };

    public static string Rotulo(string situacao) => situacao switch
    {
        PagamentoBancario.Pendente => "enviando ao banco",
        PagamentoBancario.Represado => "represado: aguarda liberação no Monitor de pagamentos",
        PagamentoBancario.AguardandoAprovacao => "aguardando aprovação no app do banco",
        PagamentoBancario.Agendado => "agendado no banco",
        PagamentoBancario.Processando => "em processamento no banco",
        PagamentoBancario.Pago => "pago",
        PagamentoBancario.Recusado => "recusado pelo banco",
        PagamentoBancario.Cancelado => "cancelado no banco",
        PagamentoBancario.Falha => "falhou no banco",
        _ => "sem confirmação do banco (conferindo)",
    };
}
