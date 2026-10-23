using System.Globalization;
using System.Net;
using System.Text;
using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace Elrond.Application.Services;

/// <summary>O que a tela de faturar manda. Nulo = o padrão (cliente para vencimento e centro de custo, empresa para plano e conta).</summary>
public sealed record FaturarDto(
    List<string> DocumentoIds, string? Vencimento = null, string? CentroCustoId = null, string? PlanoContaId = null, string? CarteiraId = null,
    decimal Adicional = 0, decimal Desconto = 0, string? Observacao = null, bool Enviar = true);

/// <summary>Quem recebe e o quê (a tela mostra antes de faturar).</summary>
public sealed record DestinatarioFaturaDto(string Nome, string Email, bool Fatura, bool Boleto, bool NotaFiscal);

/// <summary>Padrões e conferências para a tela antes de faturar (nada é gravado).</summary>
public sealed record SugestaoFaturaDto(
    string EmpresaId, string ClienteId, string ClienteNome, string Tipo, int Documentos, decimal Valor,
    string Vencimento, string VencimentoRegra, string CentroCustoId, string PlanoContaId, string CarteiraId,
    long NumeroProvavel, IReadOnlyList<DestinatarioFaturaDto> Destinatarios, IReadOnlyList<string> Avisos);

/// <summary>Fatura como as listas mostram (com o boleto e o lançamento ao lado).</summary>
public sealed record FaturaClienteDto(
    FaturaCliente Fatura, string BoletoSituacao, string BoletoLinha, string BoletoMensagem, string PagoEm, decimal ValorPago, string UltimoEnvio, bool UltimoEnvioOk);

public sealed record FaturadoDto(FaturaClienteDto Fatura, IReadOnlyList<string> Avisos);

/// <summary>
/// Fatura para o cliente a partir dos CT-es e minutas pendentes (piloto com a SIIMP): confere os documentos
/// (mesma empresa, mesmo cliente, mesmo tipo, ainda pendentes), numera continuando a sequência da SIIMP
/// por CNPJ, cria o lançamento a receber (já aprovado: é a fatura emitida), emite o boleto e manda o e-mail
/// para os contatos marcados no cadastro do cliente, cada um com os anexos que recebe. Boleto pago → o
/// lançamento é baixado (<see cref="BaixaDaFaturaPeloBoleto"/>).
/// </summary>
public sealed class FaturaClienteService(
    ICrudRepository<FaturaCliente> faturas,
    ICrudRepository<DocumentoFaturavel> documentos,
    ICrudRepository<Cliente> clientes,
    ICrudRepository<Empresa> empresas,
    ICrudRepository<CategoriaCusto> centros,
    ICrudRepository<Carteira> carteiras,
    ICrudRepository<PlanoConta> planos,
    ICrudRepository<Movimento> movimentos,
    ICrudRepository<CobrancaBancaria> cobrancasGravadas,
    ICrudRepository<PessoaSiimpLida> pessoasSiimp,
    ICrudRepository<NumeracaoDocumento> numeracoes,
    ISiimp siimp,
    INumeradorDocumentos numerador,
    IUnidadeTrabalho uow,
    IFinanceiroService financeiro,
    ICobrancaService cobrancas,
    EmailService email,
    IAuditoriaService auditoria,
    TimeProvider relogio,
    ILogger<FaturaClienteService> log)
{
    public const string OrigemCobranca = "fatura";
    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");
    private static readonly TimeZoneInfo Brasilia = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");
    /// <summary>A SIIMP passou a ser usada em 01/10/2025: a maior fatura dela está daí para frente.</summary>
    private const string InicioSiimp = "2025-10-01";

    private DateOnly Hoje => DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(relogio.GetUtcNow(), Brasilia).DateTime);
    private string Agora => relogio.GetUtcNow().ToString("o", CultureInfo.InvariantCulture);

    private sealed record Montagem(FaturaCliente Fatura, Empresa Empresa, Cliente Cliente, List<DocumentoFaturavel> Docs, string VencimentoRegra);

    // ══════════════════════════ consulta e prévia ══════════════════════════

    public async Task<Result<SugestaoFaturaDto>> SugerirAsync(FaturarDto d, CancellationToken ct = default)
    {
        var m = await MontarAsync(d, ct);
        if (!m.IsSuccess) return Result.Failure<SugestaoFaturaDto>(m.Error!);
        var (f, empresa, cliente, _, regra) = m.Value!;
        var avisos = new List<string>();
        if (f.PlanoContaId.Length == 0) avisos.Add("Sem plano de contas padrão para este tipo de fatura: escolha um (o padrão fica em Empresa › Faturamento).");
        if (f.CarteiraId.Length == 0) avisos.Add("Sem conta de recebimento padrão: escolha uma (o padrão fica em Empresa › Faturamento).");
        if (f.CentroCustoId.Length == 0) avisos.Add("O cliente não tem centro de custo no cadastro.");
        if (cobrancas.ConferirPedido(Pedido(f)) is { } erroBoleto) avisos.Add($"Boleto: {erroBoleto}");
        var destinatarios = Destinatarios(cliente);
        if (destinatarios.Count == 0) avisos.Add("Nenhum contato do cliente está marcado para receber fatura, boleto ou nota (cadastro do cliente › Contatos): a fatura sai, mas o e-mail não.");
        var ultimoSiimp = await UltimaDaSiimpAsync(empresa, ct);
        if (ultimoSiimp.Aviso is { } a) avisos.Add(a);
        var gravado = (await numeracoes.GetByIdAsync(NumeracaoDocumento.IdDe(empresa.Id, TipoNumeracao.Fatura)))?.Ultimo ?? 0;
        return Result.Success(new SugestaoFaturaDto(
            empresa.Id, cliente.Id, cliente.Nome, f.Tipo, f.Documentos.Count, f.Total, f.Vencimento, regra, f.CentroCustoId, f.PlanoContaId, f.CarteiraId,
            Math.Max(gravado, ultimoSiimp.Numero) + 1, destinatarios.Select(c => new DestinatarioFaturaDto(c.Nome, c.Email, c.RecebeFatura, c.RecebeBoleto, c.RecebeNotaFiscal)).ToList(), avisos));
    }

    /// <summary>PDF da fatura como vai sair (número provável, marcada como prévia). Nada é gravado.</summary>
    public async Task<Result<byte[]>> PreviaAsync(FaturarDto d, CancellationToken ct = default)
    {
        var m = await MontarAsync(d, ct);
        if (!m.IsSuccess) return Result.Failure<byte[]>(m.Error!);
        var (f, empresa, _, _, _) = m.Value!;
        var ultimoSiimp = await UltimaDaSiimpAsync(empresa, ct);
        var gravado = (await numeracoes.GetByIdAsync(NumeracaoDocumento.IdDe(empresa.Id, TipoNumeracao.Fatura)))?.Ultimo ?? 0;
        f.Numero = Math.Max(gravado, ultimoSiimp.Numero) + 1;
        return Result.Success(FaturaPdf.Gerar(DadosPdf(f, empresa, "Prévia", null)));
    }

    public async Task<List<FaturaClienteDto>> ListarAsync(string? empresaId, string de, string ate)
    {
        var lista = (await faturas.ListarAsync(f => string.Compare(f.Emissao, de) >= 0 && string.Compare(f.Emissao, ate) <= 0))
            .Where(f => string.IsNullOrEmpty(empresaId) || f.EmpresaId == empresaId)
            .OrderByDescending(f => f.Emissao).ThenByDescending(f => f.Numero).ToList();
        return await DtosAsync(lista);
    }

    public async Task<Result<FaturaClienteDto>> ObterAsync(string id) =>
        await faturas.GetByIdAsync(id) is { } f ? Result.Success((await DtosAsync([f]))[0]) : Result.Failure<FaturaClienteDto>("Fatura não encontrada.");

    public async Task<Result<byte[]>> PdfAsync(string id)
    {
        if (await faturas.GetByIdAsync(id) is not { } f) return Result.Failure<byte[]>("Fatura não encontrada.");
        if (await empresas.GetByIdAsync(f.EmpresaId) is not { } empresa) return Result.Failure<byte[]>("A empresa desta fatura não existe mais.");
        var mov = f.MovimentoId.Length > 0 ? await movimentos.GetByIdAsync(f.MovimentoId) : null;
        return Result.Success(FaturaPdf.Gerar(DadosPdf(f, empresa, null, mov)));
    }

    // ══════════════════════════ faturar ══════════════════════════

    public async Task<Result<FaturadoDto>> FaturarAsync(FaturarDto d, UsuarioAtual quem, CancellationToken ct = default)
    {
        var m = await MontarAsync(d, ct);
        if (!m.IsSuccess) return Result.Failure<FaturadoDto>(m.Error!);
        var (f, empresa, cliente, docs, _) = m.Value!;

        if (!DateOnly.TryParseExact(f.Vencimento, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var venc) || venc < Hoje)
            return Result.Failure<FaturadoDto>("O vencimento precisa ser hoje ou depois.");
        if (f.Total <= 0) return Result.Failure<FaturadoDto>("O total da fatura precisa ser maior que zero.");
        if (f.PlanoContaId.Length == 0 || await planos.GetByIdAsync(f.PlanoContaId) is null) return Result.Failure<FaturadoDto>("Escolha o plano de contas do lançamento a receber.");
        if (f.CarteiraId.Length == 0 || await carteiras.GetByIdAsync(f.CarteiraId) is not { } carteira) return Result.Failure<FaturadoDto>("Escolha a conta que recebe.");
        if (carteira.EmpresaId.Length > 0 && carteira.EmpresaId != empresa.Id) return Result.Failure<FaturadoDto>($"A conta \"{carteira.Nome}\" é de outra empresa.");
        // O boleto é parte da fatura: confere o pagador antes de gastar um número.
        if (cobrancas.ConferirPedido(Pedido(f)) is { } erroBoleto) return Result.Failure<FaturadoDto>($"{erroBoleto} Ajuste o cadastro do cliente e tente de novo.");

        var ultimoSiimp = await UltimaDaSiimpAsync(empresa, ct);
        if (ultimoSiimp.Erro is { } erroSiimp) return Result.Failure<FaturadoDto>($"Não foi possível ler a última fatura da SIIMP para continuar a numeração: {erroSiimp}");

        f.Id = Guid.NewGuid().ToString();
        f.Situacao = SituacaoFaturaCliente.Emitida;
        f.Eventos.Add(new EventoFatura { Em = Agora, Quem = quem.Nome, Texto = $"Fatura emitida com {f.Documentos.Count} documento(s), {Dinheiro(f.Total)}" });
        Movimento? lancamento = null;
        string? falhou = null;
        try
        {
            await uow.ExecutarAsync(async () =>
            {
                f.Numero = await numerador.ProximoAsync(empresa.Id, TipoNumeracao.Fatura, ultimoSiimp.Numero);
                var criado = await financeiro.CriarAsync(new NovoMovimentoDto(new Movimento
                {
                    Tipo = "receber",
                    EmpresaId = empresa.Id,
                    ParceiroId = cliente.Id,
                    ParceiroNome = cliente.Nome,
                    Descricao = $"Fatura {f.Numero} · {Referencia(f)}",
                    PlanoContaId = f.PlanoContaId,
                    CentroCustoId = f.CentroCustoId,
                    Documento = $"Fatura {f.Numero}",
                    Competencia = f.Emissao[..7],
                    Vencimento = f.Vencimento,
                    Valor = f.Total,
                    CarteiraId = f.CarteiraId,
                    FormaPagamento = "Boleto",
                    Origem = Movimento.OrigemFatura,
                    OrigemId = f.Id,
                    Observacao = f.Observacao,
                }), quem);
                if (!criado.IsSuccess) throw new InvalidOperationException(criado.Error);
                lancamento = criado.Value![0];
                f.MovimentoId = lancamento.Id;
                await faturas.AddAsync(f);
                foreach (var doc in docs)
                {
                    doc.FaturaId = f.Id;
                    doc.Situacao = DocumentoFaturavel.FaturadoElrond;
                    doc.Motivo = $"Fatura {f.Numero} do ELROND";
                }
                await documentos.SalvarLoteAsync(Array.Empty<DocumentoFaturavel>(), docs);
            });
        }
        catch (InvalidOperationException e)
        {
            falhou = e.Message;
        }
        if (falhou is not null) return Result.Failure<FaturadoDto>($"A fatura não foi gravada: {falhou}");
        await auditoria.RegistrarAsync("criar", "FaturaCliente", f.Id,
            $"Fatura {f.Numero} ({empresa.Nome}) para {cliente.Nome}: {f.Documentos.Count} documento(s), {Dinheiro(f.Total)}, vence {FaturaPdf.Data(f.Vencimento)} · lançamento {lancamento?.Numero}");

        var avisos = new List<string>();
        var boleto = await EmitirBoletoAsync(f, quem, ct);
        if (boleto is not null) avisos.Add(boleto);
        if (d.Enviar && boleto is null)
        {
            var envio = await EnviarAsync(f.Id, quem, ct);
            if (!envio.IsSuccess) avisos.Add(envio.Error!);
            else if (envio.Value!.Any(e => e.Erro.Length > 0)) avisos.Add("Alguns e-mails não saíram: veja os envios da fatura.");
        }
        else if (d.Enviar) avisos.Add("O e-mail não saiu porque o boleto não foi emitido: emita o boleto e envie pela tela.");
        var atual = await faturas.GetByIdAsync(f.Id) ?? f;
        return Result.Success(new FaturadoDto((await DtosAsync([atual]))[0], avisos));
    }

    /// <summary>Emite (ou reemite, depois de uma falha) o boleto da fatura. Devolve o aviso para a tela, ou null quando saiu.</summary>
    public async Task<string?> EmitirBoletoAsync(FaturaCliente f, UsuarioAtual quem, CancellationToken ct = default)
    {
        var r = await cobrancas.EmitirAsync(f.EmpresaId, new OrigemCobranca(OrigemCobranca, f.Id, "1", $"Fatura {f.Numero} · parcela 1/1"), Pedido(f), ct);
        var atual = await faturas.GetByIdAsync(f.Id) ?? f;
        if (r.IsSuccess)
        {
            atual.CobrancaId = r.Value!.Id;
            atual.Eventos.Add(new EventoFatura { Em = Agora, Quem = quem.Nome, Texto = $"Boleto emitido no {r.Value.Banco} (seu número {r.Value.SeuNumero})" });
        }
        else
        {
            log.LogWarning("Boleto da fatura {Numero} ({Empresa}) não emitido: {Erro}", f.Numero, f.EmpresaId, r.Error);
            atual.Eventos.Add(new EventoFatura { Em = Agora, Quem = quem.Nome, Texto = $"Boleto não emitido: {r.Error}" });
        }
        await faturas.UpdateAsync(atual.Id, atual);
        f.CobrancaId = atual.CobrancaId;
        return r.IsSuccess ? null : $"A fatura foi gravada, mas o boleto não saiu: {r.Error}";
    }

    public async Task<Result<FaturaClienteDto>> EmitirBoletoAsync(string id, UsuarioAtual quem, CancellationToken ct = default)
    {
        if (await faturas.GetByIdAsync(id) is not { } f) return Result.Failure<FaturaClienteDto>("Fatura não encontrada.");
        if (f.Situacao != SituacaoFaturaCliente.Emitida) return Result.Failure<FaturaClienteDto>("Fatura cancelada não gera boleto.");
        if (f.CobrancaId.Length > 0 && await cobrancasGravadas.GetByIdAsync(f.CobrancaId) is { Vigente: true } atual)
            return Result.Failure<FaturaClienteDto>($"Esta fatura já tem boleto ({CobrancaService.Rotulo(atual.Situacao)}).");
        var erro = await EmitirBoletoAsync(f, quem, ct);
        if (erro is not null) return Result.Failure<FaturaClienteDto>(erro);
        return await ObterAsync(id);
    }

    // ══════════════════════════ e-mail ══════════════════════════

    /// <summary>
    /// Manda a fatura para cada contato marcado no cliente, com os anexos de cada um (fatura, boleto, CT-e ou
    /// NFS-e). O financeiro da empresa vai em cópia. Falha de um contato não impede os outros.
    /// </summary>
    public async Task<Result<List<EnvioFatura>>> EnviarAsync(string id, UsuarioAtual quem, CancellationToken ct = default)
    {
        if (await faturas.GetByIdAsync(id) is not { } f) return Result.Failure<List<EnvioFatura>>("Fatura não encontrada.");
        if (f.Situacao != SituacaoFaturaCliente.Emitida) return Result.Failure<List<EnvioFatura>>("Fatura cancelada não é enviada.");
        if (await empresas.GetByIdAsync(f.EmpresaId) is not { } empresa) return Result.Failure<List<EnvioFatura>>("A empresa desta fatura não existe mais.");
        var cliente = await clientes.GetByIdAsync(f.ClienteId);
        var contatos = cliente is null ? [] : Destinatarios(cliente);
        if (contatos.Count == 0)
            return Result.Failure<List<EnvioFatura>>("Nenhum contato do cliente está marcado para receber fatura, boleto ou nota (cadastro do cliente › Contatos).");

        // Anexos, cada um lido uma vez só.
        var pdfFatura = new AnexoEmail($"Fatura {f.Numero}.pdf", "application/pdf",
            FaturaPdf.Gerar(DadosPdf(f, empresa, null, f.MovimentoId.Length > 0 ? await movimentos.GetByIdAsync(f.MovimentoId) : null)));
        AnexoEmail? boleto = null;
        if (contatos.Any(c => c.RecebeBoleto))
        {
            if (f.CobrancaId.Length == 0) return Result.Failure<List<EnvioFatura>>("A fatura ainda não tem boleto: emita o boleto antes de enviar.");
            // O banco libera o PDF alguns segundos depois de registrar: tenta de novo antes de desistir.
            for (var tentativa = 1; tentativa <= 4 && boleto is null; tentativa++)
            {
                var pdf = await cobrancas.PdfAsync(f.CobrancaId, ct);
                if (pdf.IsSuccess) boleto = new AnexoEmail($"Boleto fatura {f.Numero}.pdf", "application/pdf", pdf.Value!);
                else if (tentativa < 4) await Task.Delay(TimeSpan.FromSeconds(3), relogio, ct);
                else return Result.Failure<List<EnvioFatura>>($"O PDF do boleto ainda não está disponível no banco ({pdf.Error}). Envie pela tela em instantes.");
            }
        }
        var fiscais = new List<AnexoEmail>();
        var faltando = new List<string>();
        if (contatos.Any(c => c.RecebeNotaFiscal))
            foreach (var doc in f.Documentos)
            {
                var (nome, arquivo) = doc.Tipo == "cte"
                    ? ($"CT-e {doc.Numero}.pdf", await siimp.DacteAsync(doc.SiimpId, ct))
                    : doc.NfseId > 0 ? ($"NFS-e {doc.NfseNumero}.pdf", await siimp.NfsePdfAsync(doc.NfseId, ct)) : ($"Minuta {doc.Numero}", RespostaSiimp<ArquivoSiimp>.Falha("sem NFS-e ligada"));
                if (arquivo.Dados is { } a) fiscais.Add(new AnexoEmail(nome, a.Tipo, a.Conteudo));
                else faltando.Add($"{nome.Replace(".pdf", string.Empty)} ({arquivo.Erro})");
            }

        var envios = new List<EnvioFatura>();
        foreach (var c in contatos)
        {
            var anexos = new List<AnexoEmail>();
            var itens = new List<string>();
            if (c.RecebeBoleto && boleto is not null) { anexos.Add(boleto); itens.Add("Boleto"); }
            if (c.RecebeFatura) { anexos.Add(pdfFatura); itens.Add("Fatura"); }
            if (c.RecebeNotaFiscal && fiscais.Count > 0) { anexos.AddRange(fiscais); itens.Add(f.Tipo == "cte" ? "CTes" : "NFSe"); }
            var (html, texto) = CorpoEmail(f, empresa, c.Nome, itens);
            var r = await email.EnviarAsync(c.Email, $"Fatura {f.Numero}", html, texto, "fatura", f.Id, anexos, layoutProprio: true, copia: empresa.Faturamento?.Email, ct);
            envios.Add(new EnvioFatura { Em = Agora, Quem = quem.Nome, Para = c.Email, Anexos = anexos.Select(a => a.Nome).ToList(), Erro = r.IsSuccess ? string.Empty : r.Error! });
        }

        var atual = await faturas.GetByIdAsync(f.Id) ?? f;
        atual.Envios.AddRange(envios);
        var ok = envios.Count(e => e.Erro.Length == 0);
        atual.Eventos.Add(new EventoFatura
        {
            Em = Agora, Quem = quem.Nome,
            Texto = $"E-mail enviado para {ok} de {envios.Count} contato(s){(faltando.Count > 0 ? $" · sem anexo: {string.Join(", ", faltando)}" : string.Empty)}",
        });
        await faturas.UpdateAsync(atual.Id, atual);
        await auditoria.RegistrarAsync("enviar", "FaturaCliente", f.Id, $"Fatura {f.Numero} enviada por e-mail: {string.Join(", ", envios.Select(e => e.Erro.Length == 0 ? e.Para : $"{e.Para} (falhou)"))}");
        return Result.Success(envios);
    }

    /// <summary>O texto do e-mail que o financeiro manda hoje (saudação pela hora de Brasília).</summary>
    public (string Html, string Texto) CorpoEmail(FaturaCliente f, Empresa empresa, string contato, IReadOnlyList<string> itens)
    {
        var hora = TimeZoneInfo.ConvertTime(relogio.GetUtcNow(), Brasilia).Hour;
        var saudacao = hora < 12 ? "bom dia" : hora < 18 ? "boa tarde" : "boa noite";
        var primeiro = (contato ?? string.Empty).Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? string.Empty;
        var abertura = primeiro.Length > 0 ? $"{primeiro}, {saudacao}!" : $"{char.ToUpperInvariant(saudacao[0])}{saudacao[1..]}!";
        var assinatura = empresa.RazaoSocial.Length > 0 ? empresa.RazaoSocial : empresa.Nome;
        string H(string s) => WebUtility.HtmlEncode(s);

        var html = new StringBuilder();
        html.Append("""<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;line-height:1.5">""");
        html.Append($"<p>{H(abertura)}</p>");
        html.Append($"<p>Gentileza, notar anexo, faturamento ref. fatura n° {f.Numero}.</p>");
        if (itens.Count > 0) html.Append("<ul>").Append(string.Concat(itens.Select(i => $"<li>{H(i)}</li>"))).Append("</ul>");
        html.Append("<p>Qualquer dúvida, me avise.</p>");
        html.Append($"<p>Time Financeiro<br>{H(assinatura)}</p></div>");

        var texto = new StringBuilder()
            .AppendLine(abertura).AppendLine()
            .AppendLine($"Gentileza, notar anexo, faturamento ref. fatura n° {f.Numero}.").AppendLine();
        foreach (var i in itens) texto.AppendLine($"- {i}");
        texto.AppendLine().AppendLine("Qualquer dúvida, me avise.").AppendLine().AppendLine("Time Financeiro").AppendLine(assinatura);
        return (html.ToString(), texto.ToString());
    }

    // ══════════════════════════ cancelar ══════════════════════════

    public async Task<Result<FaturaClienteDto>> CancelarAsync(string id, string motivo, UsuarioAtual quem, CancellationToken ct = default)
    {
        if (await faturas.GetByIdAsync(id) is not { } f) return Result.Failure<FaturaClienteDto>("Fatura não encontrada.");
        if (f.Situacao == SituacaoFaturaCliente.Cancelada) return Result.Failure<FaturaClienteDto>("Esta fatura já está cancelada.");
        if (string.IsNullOrWhiteSpace(motivo)) return Result.Failure<FaturaClienteDto>("Escreva o motivo do cancelamento.");
        var mov = f.MovimentoId.Length > 0 ? await movimentos.GetByIdAsync(f.MovimentoId) : null;
        if (mov is { PagoEm.Length: > 0 }) return Result.Failure<FaturaClienteDto>("A fatura já foi recebida: estorne a baixa do lançamento antes de cancelar.");

        // Boleto a receber: cancela no banco primeiro (se o banco recusar, nada muda aqui).
        if (f.CobrancaId.Length > 0 && await cobrancasGravadas.GetByIdAsync(f.CobrancaId) is { } c)
        {
            if (c.Situacao == CobrancaBancaria.Recebida) return Result.Failure<FaturaClienteDto>("O boleto desta fatura já foi pago: confira a baixa do lançamento.");
            if (c.Situacao is CobrancaBancaria.AReceber or CobrancaBancaria.Processando)
            {
                var r = await cobrancas.CancelarAsync(c.Id, $"Fatura {f.Numero} cancelada", ct);
                if (!r.IsSuccess) return Result.Failure<FaturaClienteDto>($"Não foi possível cancelar o boleto no banco: {r.Error}");
            }
            else if (c.Situacao is CobrancaBancaria.Incerta or CobrancaBancaria.Pendente)
                return Result.Failure<FaturaClienteDto>("O boleto está sem confirmação do banco: atualize o boleto antes de cancelar a fatura.");
        }
        if (mov is { Cancelado: false })
        {
            var r = await financeiro.CancelarAsync(new IdsDto([mov.Id]), quem);
            if (!r.IsSuccess) return Result.Failure<FaturaClienteDto>($"O boleto foi cancelado, mas o lançamento não: {r.Error}");
        }

        var docs = await documentos.ListarAsync(x => x.FaturaId == f.Id);
        foreach (var doc in docs)
        {
            doc.FaturaId = string.Empty;
            doc.Situacao = DocumentoFaturavel.Pendente;
            doc.Motivo = $"Voltou da fatura {f.Numero} (cancelada)";
        }
        f.Situacao = SituacaoFaturaCliente.Cancelada;
        f.MotivoCancelamento = motivo.Trim();
        f.Eventos.Add(new EventoFatura { Em = Agora, Quem = quem.Nome, Texto = $"Fatura cancelada: {motivo.Trim()}" });
        await uow.ExecutarAsync(async () =>
        {
            await faturas.UpdateAsync(f.Id, f);
            await documentos.SalvarLoteAsync(Array.Empty<DocumentoFaturavel>(), docs);
        });
        await auditoria.RegistrarAsync("cancelar", "FaturaCliente", f.Id, $"Fatura {f.Numero} cancelada por {quem.Nome}: {motivo.Trim()} ({docs.Count} documento(s) voltaram para pendente)");
        return await ObterAsync(f.Id);
    }

    // ══════════════════════════ internos ══════════════════════════

    private async Task<Result<Montagem>> MontarAsync(FaturarDto d, CancellationToken ct)
    {
        var ids = (d.DocumentoIds ?? []).Where(x => !string.IsNullOrWhiteSpace(x)).Distinct().ToList();
        if (ids.Count == 0) return Result.Failure<Montagem>("Escolha os documentos da fatura.");
        var docs = await documentos.ListarAsync(x => ids.Contains(x.Id));
        if (docs.Count != ids.Count) return Result.Failure<Montagem>("Algum documento escolhido não foi encontrado: consulte a SIIMP de novo.");
        if (docs.FirstOrDefault(x => x.Situacao != DocumentoFaturavel.Pendente || x.FaturaId.Length > 0) is { } fora)
            return Result.Failure<Montagem>($"{Nome(fora)} não está pendente ({fora.Motivo}).");
        if (docs.Any(x => x.EmpresaId.Length == 0)) return Result.Failure<Montagem>("Há documento de um CNPJ emitente que não está cadastrado como empresa.");
        if (docs.Select(x => x.EmpresaId).Distinct().Count() > 1) return Result.Failure<Montagem>("Os documentos são de empresas diferentes: cada empresa emite a sua fatura.");
        if (docs.Any(x => x.ClienteId.Length == 0)) return Result.Failure<Montagem>("Há documento de um tomador que não está cadastrado como cliente.");
        if (docs.Select(x => x.ClienteId).Distinct().Count() > 1) return Result.Failure<Montagem>("Os documentos são de clientes diferentes: escolha os de um cliente só.");
        if (docs.Select(x => x.Tipo).Distinct().Count() > 1) return Result.Failure<Montagem>("Fature CT-es e minutas separadamente (anexos e plano de contas são diferentes).");
        if (await empresas.GetByIdAsync(docs[0].EmpresaId) is not { } empresa) return Result.Failure<Montagem>("Empresa não encontrada.");
        if (await clientes.GetByIdAsync(docs[0].ClienteId) is not { } cliente) return Result.Failure<Montagem>("Cliente não encontrado.");

        // Detalhe que a consulta não leu (ou falhou): lê agora e guarda.
        var lidos = new List<DocumentoFaturavel>();
        foreach (var doc in docs.Where(x => x.Detalhe is null || x.Detalhe.Total != x.Valor))
        {
            var det = await siimp.DetalheTransporteAsync(doc.Tipo, doc.SiimpId, ct);
            if (det.Dados is null) return Result.Failure<Montagem>($"Não foi possível ler o detalhe de {Nome(doc)} na SIIMP: {det.Erro}");
            doc.Detalhe = PendentesFaturamentoService.DetalheDe(det.Dados, Agora);
            lidos.Add(doc);
        }
        if (lidos.Count > 0) await documentos.SalvarLoteAsync(Array.Empty<DocumentoFaturavel>(), lidos);

        var tipo = docs[0].Tipo;
        var regra = VencimentoFimDeSemana.Valido(cliente.VencimentoFimDeSemana) ? cliente.VencimentoFimDeSemana : VencimentoFimDeSemana.Manter;
        var vencimento = !string.IsNullOrWhiteSpace(d.Vencimento)
            ? d.Vencimento!.Trim()
            : VencimentoFimDeSemana.Ajustar(Hoje.AddDays(Math.Max(0, cliente.PrazoPagamentoDias)), regra).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        var padrao = empresa.Faturamento ?? new FaturamentoEmpresa();
        var centroId = d.CentroCustoId ?? cliente.CentroCustoId;
        var centro = centroId.Length > 0 ? await centros.GetByIdAsync(centroId) : null;

        var documentosFatura = docs.OrderBy(x => x.Emissao).ThenBy(x => long.TryParse(x.Numero, out var n) ? n : 0).Select(x => new DocumentoDaFatura
        {
            Id = x.Id, Tipo = x.Tipo, SiimpId = x.SiimpId, Serie = x.Serie, Numero = x.Numero, Chave = x.Chave,
            Data = x.Tipo == "cte" ? x.Emissao : x.CriadoEm, NfseNumero = x.NfseNumero, NfseId = x.Detalhe!.NfseId,
            Peso = x.Detalhe.Peso, ValorCarga = x.Detalhe.ValorCarga, Gris = x.Detalhe.Gris, Seguro = x.Detalhe.Seguro,
            Pedagio = x.Detalhe.Pedagio, Icms = x.Detalhe.Icms, Total = x.Valor, Nfs = x.Detalhe.Nfs,
        }).ToList();
        var valor = documentosFatura.Sum(x => x.Total);
        var adicional = Math.Round(Math.Max(0, d.Adicional), 2);
        var desconto = Math.Round(Math.Max(0, d.Desconto), 2);
        if (desconto > valor + adicional) return Result.Failure<Montagem>("O desconto passa do valor da fatura.");

        var (cidade, uf) = CidadeUf(cliente.Cidade);
        var end = cliente.Endereco;
        var fatura = new FaturaCliente
        {
            EmpresaId = empresa.Id,
            ClienteId = cliente.Id,
            Cliente = new ClienteDaFatura
            {
                Nome = cliente.Nome, Documento = cliente.CpfCnpj, InscricaoEstadual = cliente.InscricaoEstadual,
                Endereco = end is null ? string.Empty : string.Join(" - ", new[]
                {
                    string.Join(", ", new[] { end.Logradouro, end.Numero }.Where(s => !string.IsNullOrWhiteSpace(s))) + (string.IsNullOrWhiteSpace(end.Complemento) ? string.Empty : $" ({end.Complemento})"),
                    end.Bairro,
                }.Where(s => !string.IsNullOrWhiteSpace(s))),
                Logradouro = end?.Logradouro ?? string.Empty, NumeroEndereco = end?.Numero ?? string.Empty,
                Complemento = end?.Complemento ?? string.Empty, Bairro = end?.Bairro ?? string.Empty,
                Cidade = cidade, Uf = uf, Cep = end?.Cep ?? string.Empty, Email = cliente.Email, Telefone = cliente.Telefone,
            },
            Tipo = tipo,
            Emissao = Hoje.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            Vencimento = vencimento,
            CentroCustoId = centro?.Id ?? string.Empty,
            CentroCustoNome = centro?.Nome ?? string.Empty,
            PlanoContaId = d.PlanoContaId ?? (tipo == "cte" ? padrao.PlanoContaCte : padrao.PlanoContaMinuta),
            CarteiraId = d.CarteiraId ?? padrao.CarteiraId,
            Valor = valor,
            Adicional = adicional,
            Desconto = desconto,
            Total = valor + adicional - desconto,
            PesoTotal = documentosFatura.Sum(x => x.Peso),
            IcmsTotal = documentosFatura.Sum(x => x.Icms),
            ValorNfTotal = documentosFatura.Sum(x => x.ValorCarga),
            Documentos = documentosFatura,
            Observacao = (d.Observacao ?? string.Empty).Trim(),
        };
        return Result.Success(new Montagem(fatura, empresa, cliente, docs, regra));
    }

    /// <summary>O último número da SIIMP para o CNPJ da empresa (o emitente na SIIMP tem o CNPJ dela).</summary>
    private async Task<(long Numero, string? Erro, string? Aviso)> UltimaDaSiimpAsync(Empresa empresa, CancellationToken ct)
    {
        if (!siimp.Configurado) return (0, null, null);
        var cnpj = Digitos(empresa.Cnpj);
        var emitente = (await pessoasSiimp.ListarAsync(p => p.Documento == cnpj)).FirstOrDefault();
        if (emitente is null || !long.TryParse(emitente.Id, out var ownerId))
            return (0, null, "Não achei o cadastro desta empresa na SIIMP: a numeração segue só a do ELROND (Administrativo › Numerações).");
        var r = await siimp.UltimasFaturasAsync(InicioSiimp, ct);
        if (r.Dados is null) return (0, r.Erro, $"Não consegui ler a última fatura da SIIMP agora ({r.Erro}).");
        return (r.Dados.GetValueOrDefault(ownerId), null, null);
    }

    private static List<ContatoParceiro> Destinatarios(Cliente c) =>
        c.Contatos.Where(x => (x.RecebeFatura || x.RecebeBoleto || x.RecebeNotaFiscal) && EmailService.EmailValido(x.Email)).ToList();

    /// <summary>O boleto da fatura (pagador = o retrato do cliente; texto = número da fatura e os documentos).</summary>
    private static NovaCobranca Pedido(FaturaCliente f)
    {
        var c = f.Cliente;
        var refs = string.Join(", ", f.Documentos.Select(Nome));
        var mensagens = new List<string> { f.Numero > 0 ? $"Fatura {f.Numero} · parcela 1/1" : "Fatura · parcela 1/1" };
        if (refs.Length > 0) mensagens.Add($"Ref.: {refs}");
        return new NovaCobranca(f.Total, f.Vencimento, new PagadorCobranca(
            c.Documento, c.Nome, c.Logradouro, c.NumeroEndereco, c.Complemento, c.Bairro, c.Cidade, c.Uf, c.Cep, c.Email, c.Telefone), mensagens);
    }

    private async Task<List<FaturaClienteDto>> DtosAsync(List<FaturaCliente> lista)
    {
        var movIds = lista.Select(f => f.MovimentoId).Where(x => x.Length > 0).ToList();
        var cobIds = lista.Select(f => f.CobrancaId).Where(x => x.Length > 0).ToList();
        var movs = movIds.Count == 0 ? new() : (await movimentos.ListarAsync(m => movIds.Contains(m.Id))).ToDictionary(m => m.Id);
        var cobs = cobIds.Count == 0 ? new() : (await cobrancasGravadas.ListarAsync(c => cobIds.Contains(c.Id))).ToDictionary(c => c.Id);
        return lista.Select(f =>
        {
            var m = movs.GetValueOrDefault(f.MovimentoId);
            var c = cobs.GetValueOrDefault(f.CobrancaId);
            var ultimo = f.Envios.LastOrDefault();
            return new FaturaClienteDto(f, c?.Situacao ?? string.Empty, c?.LinhaDigitavel ?? string.Empty, c?.Mensagem ?? string.Empty,
                m?.PagoEm ?? string.Empty, m?.ValorPago ?? 0, ultimo?.Em ?? string.Empty, ultimo is not null && f.Envios.Where(e => e.Em == ultimo.Em).All(e => e.Erro.Length == 0));
        }).ToList();
    }

    /// <summary>O que a fatura impressa mostra. <paramref name="marca"/>: "Prévia" no lugar da situação.</summary>
    public static FaturaPdfDados DadosPdf(FaturaCliente f, Empresa empresa, string? marca, Movimento? mov)
    {
        var end = empresa.EnderecoCompleto;
        var (cidade, uf) = CidadeUf(empresa.Endereco);
        var contato = string.Join(" - ", new[] { empresa.Faturamento?.Telefone, empresa.Faturamento?.Email }.Where(s => !string.IsNullOrWhiteSpace(s)));
        var emitente = new FaturaPdfEmitente(
            empresa.RazaoSocial.Length > 0 ? empresa.RazaoSocial : empresa.Nome, empresa.Cnpj,
            end is null ? string.Empty : string.Join(", ", new[] { end.Logradouro, end.Numero }.Where(s => !string.IsNullOrWhiteSpace(s))),
            string.Join(" - ", new[] { cidade.Length > 0 ? (uf.Length > 0 ? $"{cidade} / {uf}" : cidade) : string.Empty, end?.Cep ?? string.Empty }.Where(s => s.Length > 0)),
            contato, empresa.Logo);
        var c = f.Cliente;
        var cliente = new FaturaPdfCliente(c.Nome, c.Documento, c.InscricaoEstadual, c.Endereco, c.Uf.Length > 0 ? $"{c.Cidade}/{c.Uf}" : c.Cidade, c.Cep, c.Email, c.Telefone);
        var pago = mov is { PagoEm.Length: > 0 };
        var situacao = marca ?? (f.Situacao == SituacaoFaturaCliente.Cancelada ? "Cancelada" : pago ? "Liquidada" : "Emitida");
        var parcela = new FaturaPdfParcela(1, 1, f.Total, f.Desconto, f.Vencimento, pago ? mov!.PagoEm : string.Empty,
            f.Situacao == SituacaoFaturaCliente.Cancelada ? "Cancelada" : pago ? "Paga" : "Em aberto");
        var docs = f.Documentos.Select(x => new FaturaPdfDocumento(
            x.Data, x.Tipo == "cte" ? "CT-E" : "MINUTA", $"{x.Serie}/{x.Numero}", x.Tipo == "minuta" && x.NfseNumero.Length > 0 ? $"NFS-e {x.NfseNumero}" : string.Empty,
            x.Nfs.Select(n => $"{n.Serie}/{n.Numero}").ToList(), x.Nfs.Count > 0 ? x.Nfs.Sum(n => n.Peso) : null,
            x.Gris, x.Seguro, x.Pedagio, x.Icms, x.Total, x.Nfs.Select(n => n.Emissao).FirstOrDefault(e => e.Length > 0) ?? string.Empty)).ToList();
        return new FaturaPdfDados(emitente, cliente, f.Numero, situacao, f.Emissao, f.Vencimento, f.CentroCustoNome,
            f.Valor, f.Adicional, f.Desconto, f.Total, f.PesoTotal, f.IcmsTotal, f.ValorNfTotal, [parcela], docs);
    }

    /// <summary>"Itu - SP" → ("Itu", "SP").</summary>
    public static (string Cidade, string Uf) CidadeUf(string texto)
    {
        var t = (texto ?? string.Empty).Trim();
        var i = t.LastIndexOf(" - ", StringComparison.Ordinal);
        return i > 0 && t.Length - i - 3 == 2 ? (t[..i].Trim(), t[(i + 3)..].Trim().ToUpperInvariant()) : (t, string.Empty);
    }

    private static string Nome(DocumentoFaturavel d) => d.Tipo == "cte" ? $"CT-e {d.Numero}" : $"Minuta {d.Numero}";
    private static string Nome(DocumentoDaFatura d) => d.Tipo == "cte" ? $"CT-e {d.Numero}" : $"Minuta {d.Numero}";
    private static string Referencia(FaturaCliente f)
    {
        var nomes = f.Documentos.Select(Nome).ToList();
        return nomes.Count <= 4 ? string.Join(", ", nomes) : $"{string.Join(", ", nomes.Take(3))} e mais {nomes.Count - 3}";
    }
    private static string Dinheiro(decimal v) => v.ToString("C", PtBr);
    private static string Digitos(string s) => new((s ?? string.Empty).Where(char.IsDigit).ToArray());
}

/// <summary>
/// Boleto de fatura pago (aviso do banco, rotina ou consulta na tela): baixa o lançamento a receber da
/// fatura na data do pagamento, pelo valor recebido (o que passar do valor entra como juros).
/// </summary>
public sealed class BaixaDaFaturaPeloBoleto(
    ICrudRepository<FaturaCliente> faturas,
    ICrudRepository<Movimento> movimentos,
    IFinanceiroService financeiro,
    IAuditoriaService auditoria,
    ILogger<BaixaDaFaturaPeloBoleto> log) : IAoReceberCobranca
{
    private static readonly UsuarioAtual Banco = new("sistema", "Banco (boleto pago)", "Sistema");

    public async Task AoReceberAsync(CobrancaBancaria c, CancellationToken ct = default)
    {
        if (c.OrigemTipo != FaturaClienteService.OrigemCobranca) return;
        if (await faturas.GetByIdAsync(c.OrigemId) is not { } f || f.MovimentoId.Length == 0) return;
        if (await movimentos.GetByIdAsync(f.MovimentoId) is not { } m || m.Cancelado || m.PagoEm.Length > 0) return;
        var data = c.RecebidaEm.Length >= 10 ? c.RecebidaEm[..10] : DateTime.UtcNow.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        var juros = c.ValorRecebido > m.Valor ? Math.Round(c.ValorRecebido - m.Valor, 2) : 0m;
        var r = await financeiro.LiquidarAsync(new BaixaDto([m.Id], data, f.CarteiraId, Juros: juros), Banco);
        if (!r.IsSuccess)
        {
            log.LogWarning("Boleto {SeuNumero} pago, mas a baixa da fatura {Numero} falhou: {Erro}", c.SeuNumero, f.Numero, r.Error);
            return;
        }
        f.Eventos.Add(new EventoFatura { Em = DateTime.UtcNow.ToString("o", CultureInfo.InvariantCulture), Quem = Banco.Nome, Texto = $"Recebida em {FaturaPdf.Data(data)} pelo boleto ({c.ValorRecebido.ToString("C", CultureInfo.GetCultureInfo("pt-BR"))})" });
        await faturas.UpdateAsync(f.Id, f);
        await auditoria.RegistrarAsync("liquidar", "FaturaCliente", f.Id, $"Fatura {f.Numero} recebida pelo boleto {c.SeuNumero} em {data}");
    }
}
