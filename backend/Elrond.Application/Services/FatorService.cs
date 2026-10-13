using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Elrond.Domain.Pricing;

namespace Elrond.Application.Services;

/// <summary>
/// Motor do fator (markup) de uma empresa, a mesma conta da planilha "Matriz de Preço":
///   DF%    = custos fixos recorrentes ÷ meta de faturamento do mês corrente
///   Markup = DF% + impostos + comissão + despesa financeira + outras despesas + lucro
///   Fator  = 1 ÷ (1 − Markup)
/// O preço muda mês a mês, como na planilha (que aponta para a linha do mês, G58:G69).
/// Usado pela tela da empresa (ao vivo, com o rascunho do formulário) e pelo Pricing.
/// </summary>
public class FatorService : IFatorService
{
    private readonly ICrudRepository<Empresa> _empresas;
    private readonly ICrudRepository<CustoFixo> _custos;
    private readonly ICrudRepository<Meta> _metas;
    private readonly ICrudRepository<RegraAprovacao> _regras;

    public FatorService(ICrudRepository<Empresa> empresas, ICrudRepository<CustoFixo> custos,
        ICrudRepository<Meta> metas, ICrudRepository<RegraAprovacao> regras)
    {
        _empresas = empresas;
        _custos = custos;
        _metas = metas;
        _regras = regras;
    }

    public async Task<Result<FatorResultado>> CalcularAsync(CalcularFatorRequest req)
    {
        var empresa = req.Empresa;
        if (empresa is null)
        {
            if (string.IsNullOrWhiteSpace(req.EmpresaId)) return Result.Failure<FatorResultado>("Informe a empresa.");
            empresa = await _empresas.GetByIdAsync(req.EmpresaId);
            if (empresa is null) return Result.Failure<FatorResultado>("Empresa não encontrada.");
        }
        // O rascunho da tela pode não ter id ainda (empresa nova): DF e meta vêm do id informado.
        var id = string.IsNullOrWhiteSpace(empresa.Id) ? req.EmpresaId ?? string.Empty : empresa.Id;
        // Todas as ativas: uma despesa paga por outra empresa pode ter parte rateada para esta.
        var custos = id.Length == 0 ? new List<CustoFixo>() : await _custos.ListarAsync(c => c.Status == "ativo");
        var metas = id.Length == 0 ? new List<Meta>() : await _metas.ListarAsync(m => m.EmpresaId == id);

        // Comissão: a informada na precificação; senão a do vendedor (regra de comissão); senão a da empresa.
        var padrao = empresa.Dv.Comissoes;
        if (!string.IsNullOrWhiteSpace(req.VendedorId))
        {
            var regra = (await _regras.ListarAsync(r => r.Tipo == "comissao" && r.VendedorId == req.VendedorId && r.Status == "ativo"))
                .FirstOrDefault();
            if (regra is not null) padrao = regra.ComissaoPercentual;
        }

        var hoje = DateOnly.FromDateTime(DateTime.UtcNow);
        return Result.Success(Calcular(empresa, id, custos, metas, hoje, padrao, req.Comissoes, req.Lucro));
    }

    /// <summary>
    /// A conta em si, sem banco (testável). <paramref name="comissoes"/> e <paramref name="lucro"/>
    /// são os da operação (linha do Pricing); nulos = os padrões (vendedor/empresa).
    /// </summary>
    public static FatorResultado Calcular(Empresa empresa, string empresaId, IEnumerable<CustoFixo> custos, IEnumerable<Meta> metas,
        DateOnly hoje, decimal comissaoPadrao, decimal? comissoes = null, decimal? lucro = null)
    {
        // DF da empresa = a parte dela em cada despesa (inteira se for só dela; o percentual se rateada).
        var naDf = custos.Where(c => c.EntraNaDf(hoje) && c.PercentualDa(empresaId) > 0).ToList();
        var totalDf = naDf.Sum(c => c.ValorPara(empresaId));

        var (meta, avisoMeta) = MetaDoAno(metas, empresaId, hoje.Year);
        var metaAnual = meta?.TotalDoAno ?? 0m;
        // Igual à planilha (aba "Matriz Preço - Matriz"): DF% do mês = fixos ÷ meta do mês (G58:G69).
        // Vale o mês corrente; meta sem os 12 meses preenchidos divide o ano por igual.
        var meses = meta is null
            ? new List<decimal>()
            : meta.ValoresMensais is { Count: 12 } ? meta.ValoresMensais : Enumerable.Repeat(metaAnual / 12m, 12).ToList();
        var faturamentoMensal = meses.Count == 12 ? meses[hoje.Month - 1] : 0m;
        var semMeta = faturamentoMensal <= 0;
        var dfPct = semMeta ? 0m : PricingEngine.DfPercent(totalDf, faturamentoMensal);

        var impostos = empresa.ImpostosDaDv();
        var comissao = Math.Max(0m, comissoes ?? comissaoPadrao);
        var despFin = empresa.Dv.DespFinanceira;
        var outras = empresa.Dv.OutrasTotal;
        var lucroPadrao = empresa.Dv.Lucro;
        // Lucro da linha: pode subir ou descer; abaixo do da empresa a proposta vai para aprovação.
        var lucroUsado = Math.Max(0m, lucro ?? lucroPadrao);
        var dvSemLucro = impostos + comissao + despFin + outras;
        var markup = PricingEngine.Markup(dfPct, dvSemLucro + lucroUsado);
        var viavel = markup < 1m;
        var fator = semMeta || !viavel ? 0m : PricingEngine.Fator(markup);

        var aviso = semMeta
            ? avisoMeta ?? (meta is null
                ? $"Cadastre a meta de faturamento de {hoje.Year} desta empresa em Comercial › Metas: ela compõe o fator."
                : $"A meta \"{meta.Nome}\" está sem valor em {NomeDoMes(hoje.Month)} de {hoje.Year}. Preencha o mês em Comercial › Metas: ele compõe o fator.")
            : !viavel ? "Despesas, impostos e lucro somam 100% ou mais da receita: não há preço que cubra. Revise os percentuais." : null;

        return new FatorResultado(
            EmpresaId: empresaId,
            Ano: hoje.Year,
            TotalDf: totalDf,
            CustosNaDf: naDf.Count,
            MetaId: meta?.Id ?? string.Empty,
            MetaNome: meta?.Nome ?? string.Empty,
            MetaAnual: metaAnual,
            FaturamentoMensal: faturamentoMensal,
            DfPct: dfPct,
            Impostos: impostos,
            ImpostosDoCadastro: empresa.ImpostosSobreReceita() > 0,
            Comissoes: comissao,
            ComissoesPadrao: comissaoPadrao,
            DespFinanceira: despFin,
            Outras: outras,
            DvSemLucro: dvSemLucro,
            Lucro: lucroUsado,
            LucroPadrao: lucroPadrao,
            Mes: hoje.Month,
            Markup: markup,
            Fator: fator,
            Pronto: !semMeta && viavel,
            Aviso: aviso);
    }

    private static readonly string[] Meses =
        { "janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro" };

    private static string NomeDoMes(int mes) => Meses[mes - 1];

    /// <summary>
    /// Meta que compõe o markup: a única ativa da empresa no ano, ou a marcada como principal.
    /// Devolve o motivo quando não dá para escolher.
    /// </summary>
    public static (Meta? Meta, string? Aviso) MetaDoAno(IEnumerable<Meta> metas, string empresaId, int ano)
    {
        var doAno = metas.Where(m => m.EmpresaId == empresaId && m.Status != "inativo" && (m.Ano == ano || m.Ano == 0)).ToList();
        if (doAno.Count == 1) return (doAno[0], null);
        if (doAno.Count == 0) return (null, null);
        var principais = doAno.Where(m => m.Principal).ToList();
        return principais.Count == 1
            ? (principais[0], null)
            : (null, $"Há {doAno.Count} metas ativas de {ano} para esta empresa. Em Comercial › Metas, marque qual compõe o fator.");
    }
}
