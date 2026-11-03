using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Elrond.Domain.Pricing;

namespace Elrond.Application.Services;

/// <summary>
/// Precificação no servidor (fonte da verdade). O fator vem do motor (<see cref="IFatorService"/>),
/// o mesmo da tela da empresa; aqui entram o custo da operação, desconto, seguro e ICMS.
/// </summary>
public class PricingService : IPricingService
{
    private readonly ICrudRepository<Empresa> _empresas;
    private readonly ICrudRepository<Taxa> _taxas;
    private readonly IFatorService _fator;

    public PricingService(ICrudRepository<Empresa> empresas, ICrudRepository<Taxa> taxas, IFatorService fator)
    {
        _empresas = empresas;
        _taxas = taxas;
        _fator = fator;
    }

    private static decimal Round2(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);

    /// <summary>Folga para arredondamento ao comparar a margem com o lucro.</summary>
    private const decimal Tolerancia = 0.00005m;

    public async Task<Result<CalcularPrecoResponse>> CalcularAsync(CalcularPrecoRequest req)
    {
        var empresa = await _empresas.GetByIdAsync(req.EmpresaId);
        if (empresa is null)
            return Result.Failure<CalcularPrecoResponse>("Empresa não encontrada.");

        var rf = await _fator.CalcularAsync(new CalcularFatorRequest(req.EmpresaId, null, req.VendedorId, req.Comissoes, req.LucroDesejado, req.ServicoId, Precificar: true, CenarioId: req.CenarioId));
        if (!rf.IsSuccess) return Result.Failure<CalcularPrecoResponse>(rf.Error!);
        var f = rf.Value!;
        // Sem meta (ou com despesas acima de 100%) não há fator: o Pricing bloqueia com o motivo.
        if (!f.Pronto) return Result.Failure<CalcularPrecoResponse>(f.Aviso ?? "Não foi possível calcular o fator da empresa.");

        var dfPct = f.DfPct;
        var dvSem = f.DvSemLucro;
        var lucro = f.Lucro;
        var piso = f.LucroPadrao;
        var fator = f.Fator;

        // Custos em % do preço do serviço entram na conta algébrica (não há circularidade no resultado).
        var p = Math.Max(0m, req.CustoPercentualServico);
        var pv = Round2(p > 0
            ? PricingEngine.PrecoVendaComCustoPercentual(req.Custo, p, fator)
            : PricingEngine.PrecoVenda(req.Custo, 0m, fator));
        var pvComDesconto = Round2(pv * (1m - req.Desconto));
        var descontoValor = pv - pvComDesconto;
        var custoPercentualReais = Round2(pvComDesconto * p);
        var custoTotal = req.Custo + custoPercentualReais;
        var margem = PricingEngine.Margem(pvComDesconto, custoTotal, dfPct, dvSem);
        // O mínimo é o fator com o lucro da empresa: margem líquida abaixo dele (lucro da linha menor,
        // desconto ou preço negociado) pede alerta (gestor) ou aprovação (vendedor).
        var abaixoDoMinimo = piso > 0 && margem.Ml < piso - Tolerancia;

        // Seguro ad valorem (taxa 'tx-seguro' ativa).
        var taxas = await _taxas.GetAllAsync();
        var aliqSeguro = taxas.FirstOrDefault(t => t.Id == "tx-seguro" && t.Status == "ativo")?.Valor ?? 0m;
        var seguro = PricingEngine.SeguroAdValorem(req.ValorNf, aliqSeguro);

        // ICMS só para empresa contribuinte (fora do Simples). O Pricing manda a alíquota do campo ICMS
        // (origem × destino); o simulador antigo ainda manda a UF de destino da tabela da empresa.
        bool aplicaIcms;
        decimal aliqIcms;
        if (req.AliquotaIcms is { } aliquota)
        {
            aliqIcms = empresa.IcmsAtivo ? Math.Clamp(aliquota, 0m, 0.5m) : 0m;
            aplicaIcms = aliqIcms > 0;
        }
        else
        {
            aplicaIcms = req.AplicaIcms && empresa.IcmsAtivo;
            aliqIcms = aplicaIcms && req.UfDestinoId is not null
                ? empresa.Icms.FirstOrDefault(i => i.Id == req.UfDestinoId)?.Aliquota ?? 0m
                : 0m;
        }

        // O serviço decide o ICMS: sem a linha de ICMS na tabela do regime, não incide (ex.: armazenagem, Simples);
        // com ela, vale a alíquota da Tabela de ICMS da rota (campo ICMS). "Não afeta o preço" = só destacado.
        var icmsDestacado = 0m;
        if (f.Icms is { } icmsServico)
        {
            var daRota = req.AliquotaIcms ?? 0m;
            var aliquotaServico = icmsServico.Incide ? Math.Clamp(daRota, 0m, 0.5m) : 0m;
            aplicaIcms = aliquotaServico > 0 && icmsServico.AfetaPreco;
            aliqIcms = aplicaIcms ? aliquotaServico : 0m;
            icmsDestacado = aplicaIcms ? 0m : aliquotaServico;
        }

        var fiscal = PricingEngine.CotacaoFiscal(pvComDesconto, seguro, aliqIcms, aplicaIcms);
        var precoFinal = Round2(fiscal.PrecoFinal);

        return Result.Success(new CalcularPrecoResponse(
            Fator: fator,
            Pv: pv,
            PvComDesconto: pvComDesconto,
            DescontoValor: descontoValor,
            Seguro: seguro,
            AliquotaIcms: aliqIcms,
            AplicaIcms: aplicaIcms,
            Fiscal: fiscal,
            PrecoFinal: precoFinal,
            Margem: margem,
            TotalDf: f.TotalDf,
            DfPct: dfPct,
            DvSem: dvSem,
            Lucro: lucro,
            CustoPercentualReais: custoPercentualReais,
            CustoTotal: custoTotal,
            MarkupMinimo: piso,
            AbaixoDoMinimo: abaixoDoMinimo,
            Comissoes: f.Comissoes,
            ComissoesPadrao: f.ComissoesPadrao,
            Composicao: f,
            IcmsDestacado: icmsDestacado));
    }
}
