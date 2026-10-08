using Elrond.Domain.Common;

namespace Elrond.Domain.Entities;

/// <summary>Despesa variável extra que a empresa adiciona à DV (nome + fração sobre a receita).</summary>
public class OutraDespesaDv
{
    public string Id { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    /// <summary>Fração (0,015 = 1,5%).</summary>
    public decimal Percentual { get; set; }
}

/// <summary>Parâmetros de Despesa Variável (DV) da empresa + receita estimada.</summary>
public class DvEmpresa
{
    public decimal Impostos { get; set; }
    public decimal Custos { get; set; }
    public decimal Comissoes { get; set; }
    public decimal Lucro { get; set; }
    public decimal DespFinanceira { get; set; }
    public decimal ReceitaEstimadaMensal { get; set; }
    /// <summary>"+ Outras despesas": linhas livres somadas na DV (entram no markup).</summary>
    public List<OutraDespesaDv> Outras { get; set; } = new();

    /// <summary>Soma das outras despesas (fração).</summary>
    public decimal OutrasTotal => Outras?.Sum(o => o.Percentual) ?? 0m;
}

/// <summary>Configuração de um imposto: alíquota, se é retido e redução da base.</summary>
public class ImpostoConfig
{
    public decimal Aliquota { get; set; }
    public bool Retido { get; set; }
    public decimal ReducaoBase { get; set; }
}

/// <summary>Alíquota de ICMS por UF dentro da empresa.</summary>
public class EmpresaIcms
{
    public string Id { get; set; } = string.Empty;
    public string Uf { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    public string Regiao { get; set; } = string.Empty;
    public decimal Aliquota { get; set; }
}

/// <summary>Validade que a empresa oferece nas propostas (ex.: "15 dias"). A proposta guarda o texto.</summary>
public class ValidadeEmpresa
{
    public string Id { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    /// <summary>Já vem escolhida no Pricing (só uma por empresa).</summary>
    public bool Padrao { get; set; }
}

/// <summary>Empresa/estabelecimento (Matriz, Filial 02, ...) com DV e tributação.</summary>
public class Empresa : Rastreavel, IEntity, IInativavel
{
    public string Id { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    public string RazaoSocial { get; set; } = string.Empty;
    public string NomeFantasia { get; set; } = string.Empty;
    public string Cnpj { get; set; } = string.Empty;
    public string Tipo { get; set; } = "Matriz";
    /// <summary>Cidade da empresa ("Santos - SP"). O nome ficou do tempo em que era o único dado de endereço.</summary>
    public string Endereco { get; set; } = string.Empty;
    /// <summary>CEP, rua, número, complemento e bairro (a cidade fica em <see cref="Endereco"/>). Proposta e NFS-e.</summary>
    public Endereco? EnderecoCompleto { get; set; }
    /// <summary>Inscrição Municipal (prestador da NFS-e).</summary>
    public string InscricaoMunicipal { get; set; } = string.Empty;
    /// <summary>Inscrição Estadual ("ISENTO" quando não tem).</summary>
    public string InscricaoEstadual { get; set; } = string.Empty;
    public string Logo { get; set; } = string.Empty;
    public string Status { get; set; } = "ativo";
    /// <summary>Empresa que as telas abrem selecionada (só uma marcada; nenhuma = a primeira ativa).</summary>
    public bool Padrao { get; set; }

    /// <summary>
    /// Prefixo do número das propostas desta empresa (ex.: "SIN" → SIN-0001). Vazio = padrão do
    /// sistema (PROP-0001, sequência única). Trava depois da primeira proposta emitida no padrão.
    /// </summary>
    public string PropostaPrefixo { get; set; } = string.Empty;
    /// <summary>Quantidade de dígitos do número (3 a 8): 4 → SIN-0001.</summary>
    public int PropostaDigitos { get; set; } = 4;
    /// <summary>Validades oferecidas no Pricing para as propostas desta empresa.</summary>
    public List<ValidadeEmpresa> ValidadesProposta { get; set; } = new();

    public DvEmpresa Dv { get; set; } = new();

    public string Regime { get; set; } = "Lucro Presumido";
    public decimal Das { get; set; }
    /// <summary>Anexo do Simples Nacional (I a V); vazio fora do Simples.</summary>
    public string SimplesAnexo { get; set; } = string.Empty;

    public ImpostoConfig Ir { get; set; } = new();
    public ImpostoConfig Csll { get; set; } = new();
    public ImpostoConfig Inss { get; set; } = new();
    public ImpostoConfig Pis { get; set; } = new();
    public ImpostoConfig Cofins { get; set; } = new();
    public ImpostoConfig Iss { get; set; } = new();

    public decimal IbsMunicipal { get; set; }
    public decimal IbsEstadual { get; set; }
    public decimal Cbs { get; set; }

    public bool IcmsAtivo { get; set; }
    public List<EmpresaIcms> Icms { get; set; } = new();

    /// <summary>Dados bancários da empresa (saem na proposta/fatura).</summary>
    public DadosBancarios? Banco { get; set; }

    /// <summary>
    /// Markup mínimo (fração) acima da cobertura de custos e impostos: piso que o desconto
    /// não pode furar sem alerta (gestor) ou aprovação (vendedor). O praticado é Dv.Lucro.
    /// </summary>
    public decimal MarkupMinimo { get; set; }

    /// <summary>Alíquota efetiva de um imposto (já com a redução da base de cálculo).</summary>
    private static decimal Efetiva(ImpostoConfig i) => i.Aliquota * (1m - i.ReducaoBase);

    /// <summary>
    /// Percentual de impostos sobre a receita, montado a partir do cadastro tributário:
    /// Simples/MEI usam o DAS; os demais regimes somam os federais, o ISS e os da reforma.
    /// O ICMS fica de fora porque entra depois, na camada fiscal (gross-up).
    /// Devolve 0 quando nada foi cadastrado (aí vale o percentual informado na DV).
    /// </summary>
    public decimal ImpostosSobreReceita()
    {
        if (Regime is "Simples Nacional" or "MEI") return Das;

        return Efetiva(Pis) + Efetiva(Cofins) + Efetiva(Ir) + Efetiva(Csll)
             + Efetiva(Iss) + Efetiva(Inss)
             + IbsMunicipal + IbsEstadual + Cbs;
    }

    /// <summary>Percentual de impostos que vale para a DV (cadastro, com queda para o manual).</summary>
    public decimal ImpostosDaDv()
    {
        var doCadastro = ImpostosSobreReceita();
        return doCadastro > 0 ? doCadastro : Dv.Impostos;
    }
}
