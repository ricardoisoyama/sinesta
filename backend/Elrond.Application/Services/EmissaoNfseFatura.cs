using System.Globalization;
using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Elrond.Domain.Regras;

namespace Elrond.Application.Services;

/// <summary>Situação da NFS-e de uma fatura (a Central mostra ao lado da fatura).</summary>
public sealed record NfseDaFaturaDto(string FaturaId, NotaFiscalServicoDto? Nota, string Fatura);

/// <summary>
/// Emite a NFS-e de uma fatura da Central (contrato ou spot) e acompanha até a prefeitura responder.
/// Junta o que cada cadastro sabe, sem repetir informação:
/// - Serviço do contrato (dados fiscais da empresa emitente): item LC 116, código da prefeitura, NBS,
///   CNAE, CSTs, cIndOp, cClassTrib, Lei da Transparência e onde o ISS é devido;
/// - Serviço (impostos): a alíquota do ISS, quando o serviço tem a linha de ISS;
/// - Empresa (aba Retenções): as retenções (ISS, PIS, COFINS, CSLL, INSS, IR com "retido") e, sem ISS no serviço, a alíquota dele;
/// - Cliente: o tomador, com o endereço e o município (código do IBGE pela cidade do cadastro).
/// Nota emitida → a fatura registra a NF sozinha ("NFS-e 123") e segue para o boleto.
/// </summary>
public sealed class EmissaoNfseFatura(
    ICrudRepository<Fatura> faturas,
    ICrudRepository<Contrato> contratos,
    ICrudRepository<Servico> servicos,
    ICrudRepository<Cliente> clientes,
    ICrudRepository<Empresa> empresas,
    ICidadeRepository cidades,
    INfseService nfse,
    IFaturamentoService faturamento,
    TimeProvider relogio)
{
    public const string OrigemTipo = "fatura-contrato";
    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");

    public async Task<Result<NfseDaFaturaDto>> EmitirAsync(string faturaId, CancellationToken ct = default)
    {
        if (await faturas.GetByIdAsync(faturaId) is not { } f) return Result.Failure<NfseDaFaturaDto>("Fatura não encontrada.");
        if (f.Situacao != SituacaoFatura.Conferida) return Result.Failure<NfseDaFaturaDto>("Confira a fatura antes de emitir a NFS-e.");
        if (f.NfseId.Length > 0 && await nfse.ObterAsync(f.NfseId, ct) is { } anterior && anterior.Situacao is not (nameof(SituacaoNfse.Rejeitada) or nameof(SituacaoNfse.Cancelada)))
            return Result.Failure<NfseDaFaturaDto>($"Esta fatura já tem NFS-e ({anterior.Situacao.ToLowerInvariant()}). Atualize a situação em vez de emitir outra.");
        var pedido = await MontarAsync(f, ct);
        if (!pedido.IsSuccess) return Result.Failure<NfseDaFaturaDto>(pedido.Error!);

        var r = await nfse.EmitirAsync(pedido.Value!, ct);
        if (!r.IsSuccess) return Result.Failure<NfseDaFaturaDto>(r.Error!);
        f = (await faturas.GetByIdAsync(faturaId))!;
        f.NfseId = r.Value!.Id;
        f.Versoes.Add(new VersaoFatura { Em = relogio.GetUtcNow().ToString("o", CultureInfo.InvariantCulture), Quem = "NFS-e", Texto = $"NFS-e enviada à prefeitura ({r.Value.Situacao.ToLowerInvariant()})", Total = f.Total });
        await faturas.UpdateAsync(f.Id, f);
        return await AplicarAsync(f, r.Value, ct);
    }

    /// <summary>Pergunta a situação ao provedor e, emitida, registra a NF na fatura.</summary>
    public async Task<Result<NfseDaFaturaDto>> AtualizarAsync(string faturaId, CancellationToken ct = default)
    {
        if (await faturas.GetByIdAsync(faturaId) is not { } f) return Result.Failure<NfseDaFaturaDto>("Fatura não encontrada.");
        if (f.NfseId.Length == 0) return Result.Success(new NfseDaFaturaDto(f.Id, null, f.Situacao));
        var nota = await nfse.ObterAsync(f.NfseId, ct);
        if (nota is { EmAndamento: true })
        {
            var r = await nfse.AtualizarAsync(f.NfseId, ct);
            if (r.IsSuccess) nota = r.Value;
        }
        return nota is null ? Result.Success(new NfseDaFaturaDto(f.Id, null, f.Situacao)) : await AplicarAsync(f, nota, ct);
    }

    /// <summary>As NFS-e das faturas (a lista da Central): a emitida que ainda não virou NF na fatura é aplicada aqui.</summary>
    public async Task<List<NfseDaFaturaDto>> DasFaturasAsync(IReadOnlyList<string> faturaIds, CancellationToken ct = default)
    {
        var lista = new List<NfseDaFaturaDto>();
        foreach (var f in (await faturas.ListarAsync(x => faturaIds.Contains(x.Id))).Where(x => x.NfseId.Length > 0))
        {
            var nota = await nfse.ObterAsync(f.NfseId, ct);
            if (nota is null) continue;
            // Na prefeitura: pergunta agora (a Central só repete a cada 10 s enquanto houver nota assim).
            if (nota.EmAndamento && await nfse.AtualizarAsync(f.NfseId, ct) is { IsSuccess: true } atual) nota = atual.Value!;
            var r = await AplicarAsync(f, nota, ct);
            lista.Add(r.Value ?? new NfseDaFaturaDto(f.Id, nota, f.Situacao));
        }
        return lista;
    }

    private async Task<Result<NfseDaFaturaDto>> AplicarAsync(Fatura f, NotaFiscalServicoDto nota, CancellationToken ct)
    {
        // Emitida e a fatura ainda esperando a NF: registra o número (a etapa "nf" trava a fatura e os extras).
        if (nota.Situacao == nameof(SituacaoNfse.Emitida) && f.Situacao == SituacaoFatura.Conferida && nota.Numero.Length > 0)
        {
            var r = await faturamento.AvancarAsync(f.Id, "nf", new EtapaFaturaDto(Numero: $"NFS-e {nota.Numero}"));
            if (r.IsSuccess) f = r.Value!;
        }
        return Result.Success(new NfseDaFaturaDto(f.Id, nota, f.Situacao));
    }

    /// <summary>O pedido da nota, com o que falta dito em português (o que cadastrar e onde).</summary>
    public async Task<Result<PedidoNfseDto>> MontarAsync(Fatura f, CancellationToken ct = default)
    {
        if (await contratos.GetByIdAsync(f.ContratoId) is not { } contrato) return Result.Failure<PedidoNfseDto>("O contrato desta fatura não existe mais.");
        if (contrato.ServicoId.Length == 0 || await servicos.GetByIdAsync(contrato.ServicoId) is not { } servico)
            return Result.Failure<PedidoNfseDto>($"O contrato {contrato.Numero} não tem serviço: escolha o serviço que sai na nota (pasta do contrato).");
        if (await empresas.GetByIdAsync(f.EmpresaId) is not { } empresa) return Result.Failure<PedidoNfseDto>("Empresa emissora não encontrada.");
        var fiscal = (servico.Fiscais ?? []).FirstOrDefault(x => x.EmpresaId == empresa.Id && x.Ativo);
        if (fiscal is null)
            return Result.Failure<PedidoNfseDto>($"O serviço \"{servico.Nome}\" não tem dados fiscais para a {empresa.Nome}: cadastre em Cadastros › Serviços.");
        var faltaServico = new[] { ("código da prefeitura", fiscal.CodigoMunicipal), ("item da LC 116", fiscal.ItemLc116), ("NBS", fiscal.Nbs), ("descrição da atividade", fiscal.Descricao) }
            .Where(x => string.IsNullOrWhiteSpace(x.Item2)).Select(x => x.Item1).ToList();
        if (faltaServico.Count > 0) return Result.Failure<PedidoNfseDto>($"Faltam no serviço \"{servico.Nome}\" ({empresa.Nome}): {string.Join(", ", faltaServico)}.");
        if (RegrasNfse.ExigeIbsCbs(empresa.Regime) && (fiscal.IndicadorOperacao.Length != 6 || fiscal.ClassificacaoTributaria.Length != 6))
            return Result.Failure<PedidoNfseDto>($"Empresa do {empresa.Regime}: informe no serviço \"{servico.Nome}\" o indicador da operação e a classificação tributária (IBS/CBS).");

        if (await clientes.GetByIdAsync(contrato.ClienteId) is not { } cliente) return Result.Failure<PedidoNfseDto>("O cliente do contrato não foi encontrado.");
        var tomador = await TomadorAsync(cliente, ct);
        if (!tomador.IsSuccess) return Result.Failure<PedidoNfseDto>(tomador.Error!);

        var valor = f.Total;
        var pj = DocumentoFiscal.Digitos(cliente.CpfCnpj).Length == 14;
        // Retenções: os dados fiscais do serviço (desta empresa) dizem quais são retidas; só tomador pessoa jurídica retém.
        decimal Ret(decimal aliquota) => fiscal.DescontarImpostos && pj && aliquota > 0 ? Math.Round(valor * aliquota, 2, MidpointRounding.AwayFromZero) : 0m;
        var issRetido = pj && fiscal.IssRetido;
        // A alíquota do ISS é a do serviço (a tabela do regime da empresa em vigor hoje).
        var issAliquota = servico.ImpostosVigentes(empresa.Regime, DateOnly.FromDateTime(DateTime.UtcNow))
            .FirstOrDefault(i => i.Imposto == "iss" && i.Aliquota > 0)?.Aliquota ?? 0m;
        var retencoes = new RetencoesNfseDto(
            Inss: Ret(fiscal.RetencaoInss), Ir: Ret(fiscal.RetencaoIr), Pis: Ret(fiscal.RetencaoPis), Cofins: Ret(fiscal.RetencaoCofins), Csll: Ret(fiscal.RetencaoCsll),
            Iss: issRetido && fiscal.DescontarImpostos ? Math.Round(valor * issAliquota, 2, MidpointRounding.AwayFromZero) : 0m);

        var tributacao = Enum.TryParse<TributacaoIss>(fiscal.TributacaoIss, out var t) ? t : TributacaoIss.NoMunicipio;
        var texto = string.Join(" · ", new[] { fiscal.Descricao.Trim(), f.Referencia, contrato.TextoAdicionalNota.Trim() }.Where(s => s.Length > 0));
        var transparencia = fiscal.TransparenciaAliquota > 0
            ? $"Valor aproximado dos tributos: {(valor * fiscal.TransparenciaAliquota).ToString("C", PtBr)} ({fiscal.TransparenciaAliquota.ToString("P2", PtBr)}){(fiscal.TransparenciaFonte.Length > 0 ? $" · Fonte: {fiscal.TransparenciaFonte}" : string.Empty)}"
            : null;

        return Result.Success(new PedidoNfseDto(
            EmpresaId: empresa.Id,
            Tomador: tomador.Value!,
            Servico: new ServicoNfseDto(fiscal.CodigoMunicipal, fiscal.ItemLc116, fiscal.Nbs, texto.Length > 2000 ? texto[..2000] : texto,
                fiscal.Cnae.Length > 0 ? fiscal.Cnae : null, fiscal.CstPisCofins.Length > 0 ? fiscal.CstPisCofins : null),
            Valores: new ValoresNfseDto(valor),
            Iss: new IssNfseDto(tributacao, issAliquota > 0 ? issAliquota : null, issRetido),
            Retencoes: retencoes,
            IbsCbs: fiscal.IndicadorOperacao.Length == 6 && fiscal.ClassificacaoTributaria.Length == 6
                ? new IbsCbsNfseDto(fiscal.IndicadorOperacao, fiscal.ClassificacaoTributaria, pj ? null : true, fiscal.CstIbsCbs.Length == 3 ? fiscal.CstIbsCbs : null)
                : null,
            Competencia: Competencia(f.Competencia),
            NumeroPedido: contrato.Numero,
            InformacoesAdicionais: transparencia,
            Origem: new OrigemNfseDto(OrigemTipo, f.Id)));
    }

    /// <summary>Tomador com endereço completo e o código do IBGE pela cidade do cadastro ("Santos - SP").</summary>
    private async Task<Result<TomadorNfseDto>> TomadorAsync(Cliente c, CancellationToken ct)
    {
        var doc = DocumentoFiscal.Digitos(c.CpfCnpj);
        if (doc.Length is not (11 or 14)) return Result.Failure<TomadorNfseDto>($"O cliente {c.Nome} está sem CPF/CNPJ válido.");
        var (nomeCidade, uf) = FaturaClienteService.CidadeUf(c.Cidade);
        var e = c.Endereco;
        var falta = new List<string>();
        if (e is null || string.IsNullOrWhiteSpace(e.Logradouro)) falta.Add("rua");
        if (e is null || string.IsNullOrWhiteSpace(e.Numero)) falta.Add("número");
        if (e is null || string.IsNullOrWhiteSpace(e.Bairro)) falta.Add("bairro");
        if (e is null || !DocumentoFiscal.CepValido(e.Cep)) falta.Add("CEP");
        if (nomeCidade.Length == 0 || uf.Length != 2) falta.Add("cidade (\"Nome - UF\")");
        if (falta.Count > 0) return Result.Failure<TomadorNfseDto>($"Complete o endereço do cliente {c.Nome} para emitir a nota: {string.Join(", ", falta)}.");
        var cidade = (await cidades.BuscarAsync(nomeCidade, 5, uf, ct)).FirstOrDefault(x => string.Equals(x.Nome, nomeCidade, StringComparison.OrdinalIgnoreCase))
                     ?? (await cidades.BuscarAsync(nomeCidade, 1, uf, ct)).FirstOrDefault();
        if (cidade is null) return Result.Failure<TomadorNfseDto>($"Não achei o município \"{c.Cidade}\" do cliente {c.Nome} na tabela do IBGE: confira a cidade no cadastro.");
        return Result.Success(new TomadorNfseDto(
            doc.Length == 14 ? "juridica" : "fisica", c.Nome, doc,
            InscricaoMunicipal: c.InscricaoMunicipal.Length > 0 ? c.InscricaoMunicipal : null,
            InscricaoEstadual: c.InscricaoEstadual.Length > 0 ? c.InscricaoEstadual : null,
            Email: c.Email.Length > 0 ? c.Email : null,
            Telefone: c.Telefone.Length > 0 ? c.Telefone : null,
            Endereco: new EnderecoNfseDto(e!.Cep, e.Logradouro, e.Numero, e.Bairro, cidade.Id, uf, cidade.Nome, e.Complemento.Length > 0 ? e.Complemento : null)));
    }

    /// <summary>Competência da nota: o último dia do mês da fatura, sem passar de hoje.</summary>
    private DateOnly Competencia(string competencia)
    {
        var hoje = DateOnly.FromDateTime(relogio.GetLocalNow().DateTime);
        if (!DateOnly.TryParseExact($"{competencia}-01", "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var inicio)) return hoje;
        var fim = inicio.AddMonths(1).AddDays(-1);
        return fim > hoje ? hoje : fim;
    }
}
