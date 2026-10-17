using Elrond.Domain.Common;

namespace Elrond.Domain.Entities;

// ── Modelos de Contrato (Parametrizações) ───────────────────────────────────────────────────
// O sistema não sabe o que é terceirização ou frete: cada cliente monta os modelos do negócio
// dele (campos com apelido + componentes de cobrança com regra), como a Ficha Técnica.

/// <summary>Regras de um componente de cobrança.</summary>
public static class RegraComponente
{
    /// <summary>Entra todo período: quantidade × valor (o posto, a licença).</summary>
    public const string Fixo = "fixo";
    /// <summary>Entra quando alguém lança na pasta (hora extra, diária).</summary>
    public const string Lancamento = "lancamento";
    /// <summary>Soma os documentos vinculados do período (os CT-es dos fretes).</summary>
    public const string Documento = "documento";
    /// <summary>Calculado de outros apelidos (posto * 20%).</summary>
    public const string Formula = "formula";
    /// <summary>Cobrado uma vez, na primeira fatura (implantação).</summary>
    public const string Unico = "unico";

    public static readonly IReadOnlyList<string> Todas = [Fixo, Lancamento, Documento, Formula, Unico];
}

/// <summary>Campo do contrato (característica), com o apelido que as fórmulas usam.</summary>
public class CampoModelo
{
    public string Id { get; set; } = string.Empty;
    public string Apelido { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    /// <summary>texto | numero | valor | percentual | lista | data | cadastro.</summary>
    public string Tipo { get; set; } = "texto";
    /// <summary>Lista: as opções. Cadastro: qual cadastro.</summary>
    public List<string> Opcoes { get; set; } = new();
    public bool Obrigatorio { get; set; }
    public string Ajuda { get; set; } = string.Empty;
}

/// <summary>Componente de cobrança do modelo (o contrato copia e pode ajustar valor e fórmula).</summary>
public class ComponenteModelo
{
    public string Id { get; set; } = string.Empty;
    public string Apelido { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    public string Regra { get; set; } = RegraComponente.Fixo;
    public string Unidade { get; set; } = string.Empty;
    public decimal ValorPadrao { get; set; }
    public string Formula { get; set; } = string.Empty;
    /// <summary>Documento vinculado: CT-e, NF-e, OS...</summary>
    public string Documento { get; set; } = string.Empty;
    /// <summary>Cada contrato liga ou desliga (a terceirizada que cobra o adicional X e a que não cobra).</summary>
    public bool Opcional { get; set; }
}

public class ModeloContrato : Rastreavel, IEntity, IInativavel
{
    public string Id { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    public string TipoOperacao { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    /// <summary>Serviço (cadastro de serviços) que sai na nota por padrão.</summary>
    public string ServicoId { get; set; } = string.Empty;
    public List<CampoModelo> Campos { get; set; } = new();
    public List<ComponenteModelo> Componentes { get; set; } = new();
    /// <summary>Padrão para documentos vinculados: periodo | por-documento.</summary>
    public string Agrupamento { get; set; } = "periodo";
    /// <summary>mensal | quinzenal | semanal.</summary>
    public string Fechamento { get; set; } = "mensal";
    public string Status { get; set; } = "ativo";
}

// ── Contrato (a "pastinha") ─────────────────────────────────────────────────────────────────

public static class Modalidade
{
    /// <summary>Contrato fixo: fatura todo período enquanto vigente.</summary>
    public const string Recorrente = "recorrente";
    /// <summary>Serviço avulso: uma fatura só (3 fretes na semana = 3 spots).</summary>
    public const string Spot = "spot";
}

/// <summary>Linha do escopo (o que foi precificado). Linha de tabela não entra na mensalidade.</summary>
public class ItemEscopo
{
    public string Id { get; set; } = string.Empty;
    /// <summary>Apelido do componente fixo (as fórmulas somam por apelido).</summary>
    public string Apelido { get; set; } = string.Empty;
    /// <summary>Linha de tabela de preços (frete por rota): só referencia o preço.</summary>
    public bool Tabela { get; set; }
    public string Servico { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public decimal Quantidade { get; set; }
    public string Unidade { get; set; } = string.Empty;
    public decimal ValorUnitario { get; set; }
    public decimal CustoUnitario { get; set; }
}

/// <summary>Cada aditivo cria uma versão nova do escopo, valendo a partir de uma data.</summary>
public class VersaoEscopo
{
    public int Versao { get; set; }
    /// <summary>yyyy-MM-dd.</summary>
    public string VigenteDesde { get; set; } = string.Empty;
    public string Motivo { get; set; } = string.Empty;
    public List<ItemEscopo> Itens { get; set; } = new();
}

public class CondicoesContrato
{
    /// <summary>yyyy-MM da primeira fatura emitida pelo ELROND (as anteriores já foram cobradas fora).</summary>
    public string FaturarDesde { get; set; } = string.Empty;
    public int DiaFaturamento { get; set; } = 1;
    /// <summary>mes-anterior | mes-atual: o mês do serviço cobrado na fatura.</summary>
    public string Referencia { get; set; } = "mes-anterior";
    public int DiaVencimento { get; set; } = 10;
    public bool AnteciparFimDeSemana { get; set; } = true;
    public bool RenovacaoAutomatica { get; set; } = true;
    public int AvisoPrevioDias { get; set; } = 60;
    /// <summary>IPCA | IGP-M | INPC | Negociado. Por enquanto só aviso.</summary>
    public string ReajusteIndice { get; set; } = "IPCA";
    public int ReajusteMesBase { get; set; } = 1;
    public string MultaRescisoria { get; set; } = string.Empty;
    /// <summary>Conta do Caixa que recebe.</summary>
    public string CarteiraId { get; set; } = string.Empty;
    public string FormaCobranca { get; set; } = "Boleto com Pix";
    /// <summary>Spot e documentos: vence N dias depois do serviço ou do fechamento.</summary>
    public int PrazoPagamentoDias { get; set; } = 15;
    /// <summary>Documentos vinculados: periodo (uma fatura com os do período) | por-documento.</summary>
    public string Agrupamento { get; set; } = "periodo";
    /// <summary>mensal | quinzenal | semanal.</summary>
    public string Fechamento { get; set; } = "mensal";
}

/// <summary>Valor de uma característica do modelo, por apelido (número guardado com ponto).</summary>
public class CaracteristicaContrato
{
    public string Apelido { get; set; } = string.Empty;
    public string Valor { get; set; } = string.Empty;
}

/// <summary>Componente de cobrança do contrato (cópia do modelo, com o valor deste contrato).</summary>
public class ComponenteContrato
{
    public string Id { get; set; } = string.Empty;
    public string Apelido { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    public string Regra { get; set; } = RegraComponente.Lancamento;
    public string Unidade { get; set; } = string.Empty;
    public decimal ValorUnitario { get; set; }
    public decimal Quantidade { get; set; }
    public string Formula { get; set; } = string.Empty;
    public string Documento { get; set; } = string.Empty;
    public bool Ativo { get; set; } = true;
}

public static class CobrancaExtra
{
    public const string ProximaFatura = "proxima-fatura";
    public const string Separado = "separado";
    public const string NaoCobrar = "nao-cobrar";
}

/// <summary>Lançamento do contrato: hora extra, custo extra ou ocorrência.</summary>
public class ExtraContrato
{
    public string Id { get; set; } = string.Empty;
    public string Data { get; set; } = string.Empty;
    /// <summary>hora-extra | custo-extra | ocorrencia.</summary>
    public string Tipo { get; set; } = "custo-extra";
    public string Descricao { get; set; } = string.Empty;
    public decimal Quantidade { get; set; }
    public decimal ValorUnitario { get; set; }
    public string Cobranca { get; set; } = CobrancaExtra.ProximaFatura;
    /// <summary>Competência da fatura emitida em que entrou (vazio = ainda a faturar).</summary>
    public string FaturadoEm { get; set; } = string.Empty;
    public string LancadoPor { get; set; } = string.Empty;

    public decimal Valor => Math.Round(Quantidade * ValorUnitario, 2, MidpointRounding.AwayFromZero);
}

/// <summary>Documento da operação vinculado ao contrato (frete com CT-e e MDF-e).</summary>
public class DocumentoVinculado
{
    public string Id { get; set; } = string.Empty;
    public string Tipo { get; set; } = "CT-e";
    public string Numero { get; set; } = string.Empty;
    public string Data { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public decimal Valor { get; set; }
    public string Mdfe { get; set; } = string.Empty;
    public bool Canhoto { get; set; }
    /// <summary>em-transito | entregue | cancelado.</summary>
    public string Situacao { get; set; } = "entregue";
}

/// <summary>Acontecimento na pasta (o histórico que a pessoa lê).</summary>
public class EventoContrato
{
    /// <summary>Data e hora (ISO 8601).</summary>
    public string Em { get; set; } = string.Empty;
    /// <summary>assinatura | fatura | aditivo | reajuste | extra | ocorrencia | renovacao | documento | encerramento.</summary>
    public string Tipo { get; set; } = string.Empty;
    public string Texto { get; set; } = string.Empty;
    public string Quem { get; set; } = string.Empty;
}

public class Contrato : Rastreavel, IEntity
{
    public string Id { get; set; } = string.Empty;
    public string Numero { get; set; } = string.Empty;
    public string EmpresaId { get; set; } = string.Empty;
    public string ClienteId { get; set; } = string.Empty;
    /// <summary>Retrato do cliente no cadastro do contrato (a lista e a fatura mostram sem buscar).</summary>
    public string ClienteNome { get; set; } = string.Empty;
    public string ClienteDocumento { get; set; } = string.Empty;
    public string Contato { get; set; } = string.Empty;
    public string ModeloId { get; set; } = string.Empty;
    public string TipoOperacao { get; set; } = string.Empty;
    public string Modalidade { get; set; } = Entities.Modalidade.Recorrente;
    /// <summary>Recorrente: vigente | suspenso | encerrado. Spot: a situação vem da fatura.</summary>
    public string Situacao { get; set; } = "vigente";
    /// <summary>yyyy-MM-dd. No spot, início = fim = data do serviço.</summary>
    public string Inicio { get; set; } = string.Empty;
    public string Fim { get; set; } = string.Empty;
    public string LocalServico { get; set; } = string.Empty;
    public string PropostaId { get; set; } = string.Empty;
    public string PropostaNumero { get; set; } = string.Empty;
    /// <summary>Serviço que sai na nota (os parâmetros fiscais vêm do cadastro de serviços).</summary>
    public string ServicoId { get; set; } = string.Empty;
    public string TextoAdicionalNota { get; set; } = string.Empty;
    public List<VersaoEscopo> Escopo { get; set; } = new();
    public CondicoesContrato Condicoes { get; set; } = new();
    public List<CaracteristicaContrato> Caracteristicas { get; set; } = new();
    public List<ComponenteContrato> Componentes { get; set; } = new();
    public List<ExtraContrato> Extras { get; set; } = new();
    public List<DocumentoVinculado> Documentos { get; set; } = new();
    public List<EventoContrato> Eventos { get; set; } = new();

    public bool Spot => Modalidade == Entities.Modalidade.Spot;
    /// <summary>Fatura pelos documentos vinculados (tem componente "documento" ligado).</summary>
    public bool PorDocumento => Componentes.Any(c => c.Regra == RegraComponente.Documento && c.Ativo);

    /// <summary>Versão do escopo que vale na data (a mais nova já em vigor).</summary>
    public VersaoEscopo? EscopoEm(string data) =>
        Escopo.Where(v => string.CompareOrdinal(v.VigenteDesde, data) <= 0).OrderByDescending(v => v.Versao).FirstOrDefault()
        ?? Escopo.OrderBy(v => v.Versao).FirstOrDefault();
}

/// <summary>Contador de contratos da empresa que tem prefixo próprio (último número emitido).</summary>
public class NumeracaoContrato
{
    public string EmpresaId { get; set; } = string.Empty;
    public long Ultimo { get; set; }
}

// ── Fatura ──────────────────────────────────────────────────────────────────────────────────

public static class SituacaoFatura
{
    public const string Prevista = "prevista";
    public const string AConferir = "a-conferir";
    public const string Conferida = "conferida";
    public const string Devolvida = "devolvida";
    public const string NfEmitida = "nf-emitida";
    public const string BoletoEmitido = "boleto-emitido";
    public const string Atrasada = "atrasada";
    public const string Recebida = "recebida";
    /// <summary>Deixou de existir no contrato antes de ser emitida (fica para o histórico).</summary>
    public const string Cancelada = "cancelada";

    /// <summary>Emitida: a fatura trava (vale o que saiu na NF).</summary>
    public static readonly IReadOnlyList<string> Emitidas = [NfEmitida, BoletoEmitido, Atrasada, Recebida];
    public static bool Travada(string s) => Emitidas.Contains(s);
}

/// <summary>Linha da composição (fixos, fórmulas, cobrança única).</summary>
public class LinhaComposicao
{
    public string Apelido { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    public string Regra { get; set; } = string.Empty;
    /// <summary>Nulo = variável (lançamento, documento) ou fórmula com erro.</summary>
    public decimal? Valor { get; set; }
    public string Detalhe { get; set; } = string.Empty;
    public string Erro { get; set; } = string.Empty;
}

/// <summary>Uma mudança na fatura (quem, o quê e o total naquele momento).</summary>
public class VersaoFatura
{
    public string Em { get; set; } = string.Empty;
    public string Quem { get; set; } = string.Empty;
    public string Texto { get; set; } = string.Empty;
    public decimal Total { get; set; }
}

/// <summary>
/// Fatura de um contrato: uma FOTOGRAFIA CALCULADA dele. Enquanto não emitida, se recalcula do
/// contrato (extra lançado, componente ligado, escopo novo); com a NF registrada, trava.
/// </summary>
public class Fatura : Rastreavel, IEntity
{
    public string Id { get; set; } = string.Empty;
    /// <summary>Identidade dentro do contrato (mês, período, documento ou extra): ressincroniza sem duplicar.</summary>
    public string Chave { get; set; } = string.Empty;
    public string ContratoId { get; set; } = string.Empty;
    public string EmpresaId { get; set; } = string.Empty;
    /// <summary>Fatura de um extra cobrado separado do contrato.</summary>
    public bool Avulsa { get; set; }
    public string Descricao { get; set; } = string.Empty;
    /// <summary>yyyy-MM.</summary>
    public string Competencia { get; set; } = string.Empty;
    /// <summary>"set/2026", "1ª quinzena out/2026", "CT-e 1234".</summary>
    public string Referencia { get; set; } = string.Empty;
    public string Vencimento { get; set; } = string.Empty;
    /// <summary>Contrato (mensalidade, fórmulas, única) ou soma dos documentos.</summary>
    public decimal Previsto { get; set; }
    public decimal Descontos { get; set; }
    public decimal Total { get; set; }
    public List<LinhaComposicao> Composicao { get; set; } = new();
    public List<DocumentoVinculado> Documentos { get; set; } = new();
    public List<ExtraContrato> Extras { get; set; } = new();
    /// <summary>Extras tirados na conferência: vão para a fatura seguinte.</summary>
    public List<string> ExtrasFora { get; set; } = new();
    public string Situacao { get; set; } = SituacaoFatura.Prevista;
    public string Nf { get; set; } = string.Empty;
    public string Boleto { get; set; } = string.Empty;
    public string RecebidaEm { get; set; } = string.Empty;
    /// <summary>Motivo da devolução na conferência.</summary>
    public string Motivo { get; set; } = string.Empty;
    public List<VersaoFatura> Versoes { get; set; } = new();

    public bool Travada => SituacaoFatura.Travada(Situacao);
}
