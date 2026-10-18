using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Elrond.Domain.Regras;

namespace Elrond.Application.Services;

/// <summary>Resultado de uma consulta à SIIMP.</summary>
public sealed record ResumoPendentesDto(int Lidos, int Pendentes, int FaturadosSiimp, int FaturadosElrond, int Incompletos, int Cancelados, int SemEmpresa, int SemCliente, int FaturasLidas, int ClientesCriados = 0);

/// <summary>
/// Documentos pendentes de faturamento (piloto de convivência com a SIIMP): lê CT-es e minutas do
/// período, descobre quais já estão numa fatura da SIIMP (só as faturas que podem contê-los, com cópia
/// do que já foi lido) e liga cada documento à empresa (CNPJ do emitente) e ao cliente (CNPJ do tomador).
/// SÓ LEITURA na SIIMP. Tomador que ainda não é cliente do ELROND é cadastrado sozinho com os dados
/// da SIIMP (piloto: a integração com a SIIMP um dia sai, o cadastro fica).
/// </summary>
public sealed class PendentesFaturamentoService(
    ISiimp siimp,
    ICrudRepository<DocumentoFaturavel> documentos,
    ICrudRepository<FaturaSiimpLida> faturasLidas,
    ICrudRepository<PessoaSiimpLida> pessoasLidas,
    ICrudRepository<Empresa> empresas,
    ICrudRepository<Cliente> clientes,
    IAuditoriaService auditoria,
    TimeProvider relogio)
{
    /// <summary>Período máximo de uma consulta (dias): o piloto olha só o recente; o antigo fica com a SIIMP.</summary>
    public const int MaxDias = 31;

    public async Task<List<DocumentoFaturavel>> ListarAsync(string de, string ate) =>
        (await documentos.ListarAsync(d => string.Compare(d.CriadoEm, de) >= 0 && string.Compare(d.CriadoEm, ate) <= 0))
            .OrderBy(d => d.Emissao).ThenBy(d => d.Tipo).ThenBy(d => d.Numero).ToList();

    /// <summary>Confere o período antes de começar (a consulta em si roda em segundo plano).</summary>
    public string? Validar(string de, string ate)
    {
        if (!siimp.Configurado) return "A SIIMP não está configurada neste ambiente.";
        if (!DateOnly.TryParseExact(de, "yyyy-MM-dd", out var i) || !DateOnly.TryParseExact(ate, "yyyy-MM-dd", out var f)) return "Período inválido: use datas no formato aaaa-mm-dd.";
        if (f < i) return "O início do período vem depois do fim.";
        if (f.DayNumber - i.DayNumber + 1 > MaxDias) return $"Consulte no máximo {MaxDias} dias por vez.";
        return null;
    }

    /// <summary>Lê a SIIMP e atualiza os documentos do período. <paramref name="progresso"/>: (etapa, feito, total).</summary>
    public async Task<Result<ResumoPendentesDto>> ConsultarAsync(string de, string ate, UsuarioAtual quem, Action<string, int, int>? progresso = null, CancellationToken ct = default)
    {
        if (Validar(de, ate) is { } erro) return Result.Failure<ResumoPendentesDto>(erro);
        var agora = relogio.GetUtcNow().ToString("o");

        progresso?.Invoke("Lendo CT-es e minutas da SIIMP", 0, 0);
        var lidos = await siimp.DocumentosTransporteAsync(de, ate, ct);
        if (lidos.Dados is null) return Result.Failure<ResumoPendentesDto>(lidos.Erro);

        // ── Em que fatura da SIIMP cada documento está ──
        progresso?.Invoke("Lendo as faturas da SIIMP", 0, 0);
        var faturas = await siimp.FaturasParaConferirAsync(de, ct);
        if (faturas.Dados is null) return Result.Failure<ResumoPendentesDto>(faturas.Erro);
        var copias = (await faturasLidas.GetAllAsync()).ToDictionary(f => f.Id);
        var novasCopias = new List<FaturaSiimpLida>();
        var copiasAlteradas = new List<FaturaSiimpLida>();
        var feitas = 0;
        foreach (var f in faturas.Dados)
        {
            progresso?.Invoke("Conferindo os documentos das faturas", ++feitas, faturas.Dados.Count);
            copias.TryGetValue(f.Id.ToString(), out var copia);
            // Emitida/liquidada não ganha documento: a cópia basta. Cadastrada ainda pode mudar: relê.
            if (copia is not null && copia.Situacao == f.Situacao && f.Situacao != 0) continue;
            if (f.Situacao == 2)
            {
                if (copia is not null) { copia.Situacao = 2; copiasAlteradas.Add(copia); }
                continue;
            }
            var det = await siimp.FaturaAsync(f.Id, ct);
            if (det.Dados is null) return Result.Failure<ResumoPendentesDto>(det.Erro);
            var ids = det.Dados.Documentos
                .Select(d => d.CteId > 0 ? $"cte-{d.CteId}" : d.MinutaId > 0 ? $"minuta-{d.MinutaId}" : string.Empty)
                .Where(x => x.Length > 0).Distinct().ToList();
            var nova = new FaturaSiimpLida { Id = f.Id.ToString(), Numero = f.Numero, Situacao = f.Situacao, Documentos = ids, LidaEm = agora };
            if (copia is null) novasCopias.Add(nova); else copiasAlteradas.Add(nova);
            copias[nova.Id] = nova;
        }
        await faturasLidas.SalvarLoteAsync(novasCopias, copiasAlteradas);
        var faturaDoDocumento = new Dictionary<string, string>();
        foreach (var c in copias.Values.Where(c => c.Situacao != 2))
            foreach (var d in c.Documentos) faturaDoDocumento.TryAdd(d, c.Numero.ToString());

        // ── Quem emitiu e quem paga (CNPJ/CPF): pela chave do CT-e ou pelo cadastro de pessoas da SIIMP ──
        var pessoas = (await pessoasLidas.GetAllAsync()).ToDictionary(p => p.Id);
        var precisa = lidos.Dados.SelectMany(d => d.Tipo == "minuta" || FaturamentoPendente.CnpjDaChave(d.Chave).Length == 0 ? new[] { d.EmitenteId, d.TomadorId } : new[] { d.TomadorId })
            .Where(id => id > 0 && !pessoas.ContainsKey(id.ToString())).Distinct().ToList();
        var novasPessoas = new List<PessoaSiimpLida>();
        feitas = 0;
        foreach (var id in precisa)
        {
            progresso?.Invoke("Lendo emitentes e tomadores", ++feitas, precisa.Count);
            var p = await siimp.PessoaAsync(id, ct);
            if (p.Dados is null) continue; // pessoa sumida: o documento fica sem empresa/cliente, não trava a consulta
            var lida = new PessoaSiimpLida { Id = id.ToString(), Nome = p.Dados.Nome, Documento = FaturamentoPendente.Digitos(p.Dados.Documento), LidaEm = agora };
            pessoas[lida.Id] = lida;
            novasPessoas.Add(lida);
        }
        await pessoasLidas.SalvarLoteAsync(novasPessoas, Array.Empty<PessoaSiimpLida>());

        var empresaPorCnpj = (await empresas.GetAllAsync()).Where(e => e.Cnpj.Length > 0)
            .GroupBy(e => FaturamentoPendente.Digitos(e.Cnpj)).ToDictionary(g => g.Key, g => g.OrderBy(e => e.Status == "ativo" ? 0 : 1).First().Id);
        var clientePorDoc = (await clientes.GetAllAsync()).Where(c => c.CpfCnpj.Length > 0)
            .GroupBy(c => FaturamentoPendente.Digitos(c.CpfCnpj)).ToDictionary(g => g.Key, g => g.OrderBy(c => c.Status == "ativo" ? 0 : 1).First().Id);

        // ── Tomador que ainda não é cliente: cadastra com os dados da SIIMP ──
        var semCliente = lidos.Dados
            .Where(l => !FaturamentoPendente.Cancelado(l.Tipo, l.Situacao) && l.TomadorId > 0)
            .Select(l => pessoas.GetValueOrDefault(l.TomadorId.ToString()))
            .Where(p => p is not null && p.Documento.Length is 11 or 14 && !clientePorDoc.ContainsKey(p.Documento))
            .DistinctBy(p => p!.Documento).ToList();
        var clientesNovos = new List<Cliente>();
        feitas = 0;
        foreach (var lida in semCliente)
        {
            progresso?.Invoke("Cadastrando os clientes novos", ++feitas, semCliente.Count);
            var p = await siimp.PessoaAsync(long.Parse(lida!.Id), ct);
            if (p.Dados is null) continue;
            var c = ClienteDaSiimp(p.Dados, lida.Documento, relogio.GetLocalNow());
            clientesNovos.Add(c);
            clientePorDoc[lida.Documento] = c.Id;
        }
        if (clientesNovos.Count > 0)
        {
            await clientes.SalvarLoteAsync(clientesNovos, Array.Empty<Cliente>());
            foreach (var c in clientesNovos)
                await auditoria.RegistrarAsync("criar", "Cliente", c.Id, $"Cliente \"{c.Nome}\" ({c.CpfCnpj}) cadastrado automaticamente com os dados da SIIMP");
        }

        // ── Grava a situação de cada documento ──
        progresso?.Invoke("Gravando", 0, 0);
        var existentes = (await documentos.ListarAsync(d => string.Compare(d.CriadoEm, de) >= 0 && string.Compare(d.CriadoEm, ate) <= 0)).ToDictionary(d => d.Id);
        var novos = new List<DocumentoFaturavel>();
        var alterados = new List<DocumentoFaturavel>();
        foreach (var l in lidos.Dados)
        {
            var id = $"{l.Tipo}-{l.Id}";
            existentes.TryGetValue(id, out var antes);
            var emitente = l.Tipo == "cte" && FaturamentoPendente.CnpjDaChave(l.Chave) is { Length: > 0 } c ? c : pessoas.GetValueOrDefault(l.EmitenteId.ToString())?.Documento ?? string.Empty;
            var tomador = pessoas.GetValueOrDefault(l.TomadorId.ToString());
            var d = new DocumentoFaturavel
            {
                Id = id, Tipo = l.Tipo, SiimpId = l.Id, Numero = l.Numero, Serie = l.Serie, Chave = l.Chave, SituacaoSiimp = l.Situacao,
                EmitenteCnpj = emitente,
                EmitenteNome = l.EmitenteNome.Length > 0 ? l.EmitenteNome : pessoas.GetValueOrDefault(l.EmitenteId.ToString())?.Nome ?? string.Empty,
                EmpresaId = empresaPorCnpj.GetValueOrDefault(emitente) ?? string.Empty,
                TomadorSiimpId = l.TomadorId, TomadorNome = l.TomadorNome.Length > 0 ? l.TomadorNome : tomador?.Nome ?? string.Empty,
                TomadorDocumento = tomador?.Documento ?? string.Empty,
                ClienteId = tomador is null ? string.Empty : clientePorDoc.GetValueOrDefault(tomador.Documento) ?? string.Empty,
                CriadoEm = l.CriadoEm, Emissao = l.Emissao, Valor = l.Total, Descricao = l.Descricao.Length > 400 ? l.Descricao[..400] : l.Descricao,
                NfseNumero = l.NfseNumero, FaturaId = antes?.FaturaId ?? string.Empty, LidoEm = agora,
            };
            var fatura = faturaDoDocumento.GetValueOrDefault(id) ?? string.Empty;
            (d.Situacao, d.Motivo) = FaturamentoPendente.Situar(d, fatura);
            d.FaturaSiimp = fatura;
            if (antes is null) novos.Add(d); else alterados.Add(d);
        }
        await documentos.SalvarLoteAsync(novos, alterados);

        var todos = novos.Concat(alterados).ToList();
        int Conta(string s) => todos.Count(x => x.Situacao == s);
        var resumo = new ResumoPendentesDto(todos.Count, Conta(DocumentoFaturavel.Pendente), Conta(DocumentoFaturavel.FaturadoSiimp), Conta(DocumentoFaturavel.FaturadoElrond),
            Conta(DocumentoFaturavel.Incompleto), Conta(DocumentoFaturavel.Cancelado), todos.Count(x => x.EmpresaId.Length == 0), todos.Count(x => x.Situacao == DocumentoFaturavel.Pendente && x.ClienteId.Length == 0),
            novasCopias.Count + copiasAlteradas.Count, clientesNovos.Count);
        await auditoria.RegistrarAsync("consultar", "DocumentoFaturavel", $"{de}..{ate}",
            $"{quem.Nome} consultou a SIIMP ({de} a {ate}): {resumo.Lidos} documento(s), {resumo.Pendentes} pendente(s) de faturamento");
        return Result.Success(resumo);
    }

    /// <summary>Cliente novo com o que a SIIMP sabe dele (nome, documento, endereço, e-mail e telefone).</summary>
    public static Cliente ClienteDaSiimp(PessoaSiimp p, string documento, DateTimeOffset agora)
    {
        var juridica = documento.Length == 14;
        var email = p.Email.Split(';', ',', ' ').Select(e => e.Trim()).FirstOrDefault(e => e.Contains('@') && e.Contains('.')) ?? string.Empty;
        var contatos = email.Length > 0 || p.Telefone.Length > 0
            ? new List<ContatoParceiro> { new() { Id = Guid.NewGuid().ToString(), Nome = "Financeiro", Email = email, Telefone = p.Telefone, RecebeFatura = email.Length > 0, RecebeBoleto = email.Length > 0, RecebeNotaFiscal = email.Length > 0 } }
            : new List<ContatoParceiro>();
        return new Cliente
        {
            Id = Guid.NewGuid().ToString(),
            Tipo = juridica ? "juridica" : "fisica",
            Nome = p.Nome.Trim().Length > 0 ? p.Nome.Trim() : documento,
            CpfCnpj = juridica
                ? $"{documento[..2]}.{documento[2..5]}.{documento[5..8]}/{documento[8..12]}-{documento[12..]}"
                : $"{documento[..3]}.{documento[3..6]}.{documento[6..9]}-{documento[9..]}",
            Cidade = p.Cidade.Length > 0 ? (p.Uf.Length > 0 ? $"{p.Cidade} - {p.Uf.ToUpperInvariant()}" : p.Cidade) : string.Empty,
            Endereco = new Endereco { Cep = p.Cep, Logradouro = p.Rua, Numero = p.Numero, Complemento = p.Complemento, Bairro = p.Bairro },
            Contato = contatos.FirstOrDefault()?.Nome ?? string.Empty,
            Email = email,
            Telefone = p.Telefone,
            Contatos = contatos,
            Observacao = $"Cadastrado automaticamente com os dados da SIIMP em {agora:dd/MM/yyyy} (piloto de faturamento). Confira inscrição estadual e contatos.",
            Status = "ativo",
        };
    }
}
