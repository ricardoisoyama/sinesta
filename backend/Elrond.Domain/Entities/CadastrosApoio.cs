using Elrond.Domain.Common;

namespace Elrond.Domain.Entities;

/// <summary>Serviço oferecido (Consultoria mensal, Suporte técnico, ...). Sai na proposta e na NFS-e.</summary>
public class Servico : Rastreavel, IEntity, IInativavel
{
    public string Id { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    public string Status { get; set; } = "ativo";
    /// <summary>
    /// Dados fiscais para a NFS-e, um por empresa emitente: cada CNPJ tem o código da sua prefeitura.
    /// O que já está na empresa (ISS, retenções, inscrição municipal, regime) é lido de lá na emissão.
    /// </summary>
    public List<ServicoFiscal> Fiscais { get; set; } = new();
    /// <summary>
    /// Impostos do serviço (base × alíquota), que o Pricing usa no lugar dos da empresa. Vazio = os da empresa.
    /// Cada um diz se entra no preço (markup) ou se é só destacado. Uma tabela por regime e por vigência:
    /// as linhas com o mesmo regime e a mesma data de início formam uma tabela.
    /// </summary>
    public List<ImpostoServico> Impostos { get; set; } = new();

    /// <summary>A tabela do regime: o MEI usa a do Simples.</summary>
    public static string RegimeDaTabela(string regime) => regime == "MEI" ? "Simples Nacional" : regime;

    /// <summary>
    /// Os impostos que valem para uma empresa do <paramref name="regime"/> na <paramref name="data"/>: a tabela
    /// do regime (ou a sem regime, de antes) com a vigência mais recente que já começou. Vazia = os da empresa.
    /// </summary>
    public List<ImpostoServico> ImpostosVigentes(string regime, DateOnly data)
    {
        var r = RegimeDaTabela(regime);
        var doRegime = Impostos.Where(i => i.Regime == r).ToList();
        if (doRegime.Count == 0) doRegime = Impostos.Where(i => i.Regime.Length == 0).ToList();
        var dia = data.ToString("yyyy-MM-dd");
        var inicio = doRegime.Select(i => i.VigenteDesde).Where(v => string.CompareOrdinal(v, dia) <= 0)
            .OrderByDescending(v => v, StringComparer.Ordinal).FirstOrDefault();
        return inicio is null ? new() : doRegime.Where(i => i.VigenteDesde == inicio).ToList();
    }
}

/// <summary>
/// Um imposto do serviço, como no quadro da contabilidade: base de cálculo (presunção) × alíquota.
/// O ICMS não tem alíquota aqui: vem da Tabela de ICMS (origem × destino); a linha diz que incide e se afeta o preço.
/// </summary>
public class ImpostoServico
{
    public const string AdicionalIrpj = "irpj-adicional";
    public const string Icms = "icms";
    /// <summary>Tipos aceitos (o "outro" leva o nome livre).</summary>
    public static readonly string[] Tipos = ["irpj", AdicionalIrpj, "csll", "pis", "cofins", "cbs", "ibs", "iss", Icms, "inss", "das", "outro"];

    public string Id { get; set; } = string.Empty;
    public string Imposto { get; set; } = "outro";
    public string Nome { get; set; } = string.Empty;
    /// <summary>Base de cálculo sobre a receita (fração): 1 = 100%; 0,08 = presunção de 8%.</summary>
    public decimal Base { get; set; } = 1m;
    public decimal Aliquota { get; set; }
    /// <summary>Não usado (o usuário informa a alíquota efetiva do adicional); fica por compatibilidade.</summary>
    public decimal Limite { get; set; }
    /// <summary>true = entra no markup (no preço); false = só destacado na nota.</summary>
    public bool AfetaPreco { get; set; } = true;
    /// <summary>Regime da empresa em que vale: Simples Nacional, Lucro Presumido ou Lucro Real. Vazio = qualquer (cadastro de antes).</summary>
    public string Regime { get; set; } = string.Empty;
    /// <summary>Início da vigência (aaaa-mm-dd), definido pelo usuário. Vazio = desde sempre.</summary>
    public string VigenteDesde { get; set; } = string.Empty;

    /// <summary>Alíquota efetiva sobre a receita: base × alíquota (o adicional do IRPJ também, com a alíquota que a contabilidade passa).</summary>
    public decimal Efetiva => Base * Aliquota;
}

/// <summary>Como o serviço sai na NFS-e de uma empresa (tabelas oficiais: LC 116, NBS, cIndOp, cClassTrib).</summary>
public class ServicoFiscal
{
    public string EmpresaId { get; set; } = string.Empty;
    public bool Ativo { get; set; } = true;
    /// <summary>Item da LC 116 ("11.04").</summary>
    public string ItemLc116 { get; set; } = string.Empty;
    /// <summary>Código de tributação nacional (6 dígitos da lista nacional: "110401").</summary>
    public string CodigoNacional { get; set; } = string.Empty;
    /// <summary>Código de tributação na prefeitura do prestador ("370407").</summary>
    public string CodigoMunicipal { get; set; } = string.Empty;
    /// <summary>Descrição da atividade (texto que sai na nota antes do complemento da fatura).</summary>
    public string Descricao { get; set; } = string.Empty;
    public string Cnae { get; set; } = string.Empty;
    /// <summary>NBS ("1.0601.10.00").</summary>
    public string Nbs { get; set; } = string.Empty;
    // A alíquota do ISS vem dos impostos do serviço (tabela do regime da empresa em vigor).
    /// <summary>NoMunicipio | ForaDoMunicipio | Exportacao | Isenta | Imune.</summary>
    public string TributacaoIss { get; set; } = "NoMunicipio";
    /// <summary>CST do PIS/COFINS (2 dígitos; vazio = o padrão do provedor).</summary>
    public string CstPisCofins { get; set; } = string.Empty;
    /// <summary>Lei da Transparência: carga aproximada (fração) e a fonte ("IBPT").</summary>
    public decimal TransparenciaAliquota { get; set; }
    public string TransparenciaFonte { get; set; } = string.Empty;
    /// <summary>Reforma tributária: indicador da operação (cIndOp, 6 dígitos).</summary>
    public string IndicadorOperacao { get; set; } = string.Empty;
    /// <summary>CST do IBS/CBS (3 dígitos) e a classificação tributária (cClassTrib, 6 dígitos).</summary>
    public string CstIbsCbs { get; set; } = string.Empty;
    public string ClassificacaoTributaria { get; set; } = string.Empty;
    /// <summary>As retenções abaixo saem descontadas do total da nota.</summary>
    public bool DescontarImpostos { get; set; } = true;
    /// <summary>Retenções na fonte pelo tomador pessoa jurídica (fração; 0 = não retém).</summary>
    public decimal RetencaoIr { get; set; }
    public decimal RetencaoPis { get; set; }
    public decimal RetencaoCofins { get; set; }
    public decimal RetencaoCsll { get; set; }
    public decimal RetencaoInss { get; set; }
    /// <summary>O tomador retém o ISS (pela alíquota do ISS do serviço).</summary>
    public bool IssRetido { get; set; }
    /// <summary>O ISS (não retido) também é descontado do valor líquido.</summary>
    public bool IssNoLiquido { get; set; }
}

/// <summary>Tipo de custo pré-cadastrado para usar na precificação (Mão de obra, Deslocamento, ...).</summary>
public class TipoCusto : Rastreavel, IEntity, IInativavel
{
    public string Id { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    /// <summary>"valor" (R$) ou "percentual".</summary>
    public string Modo { get; set; } = "valor";
    /// <summary>Valor pré-cadastrado: R$ quando Modo = valor; fração (0,02 = 2%) quando percentual.</summary>
    public decimal Valor { get; set; }
    /// <summary>Base do percentual: "nf" (valor da NF informado) ou "servico" (preço do serviço).</summary>
    public string BasePercentual { get; set; } = "nf";
    public string Status { get; set; } = "ativo";
}

/// <summary>Categoria de despesa (classifica os custos fixos e aponta a conta padrão).</summary>
public class CategoriaCusto : Rastreavel, IEntity, IInativavel
{
    public string Id { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    /// <summary>Conta do plano de contas sugerida para despesas desta categoria.</summary>
    public string PlanoContaId { get; set; } = string.Empty;
    public string Status { get; set; } = "ativo";
}

/// <summary>Validade de proposta pré-cadastrada (ex.: "15 dias").</summary>
public class ValidadeProposta : Rastreavel, IEntity, IInativavel
{
    public string Id { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public string Status { get; set; } = "ativo";
}
