using Elrond.Domain.Entities;
using Elrond.Domain.Regras;
using FluentValidation;

namespace Elrond.Application.Validators;

/// <summary>
/// Validação no SERVIDOR dos campos obrigatórios dos cadastros (antes só a tela conferia).
/// Resolvidos por tipo no CrudControllerBase; a mensagem volta como 400 para o formulário.
/// </summary>
public class ClienteValidator : AbstractValidator<Cliente>
{
    public ClienteValidator()
    {
        RuleFor(c => c.Nome).NotEmpty().WithMessage("Informe a razão social ou o nome do cliente.").MaximumLength(160);
        RuleFor(c => c.Tipo).Must(t => t is "juridica" or "fisica").WithMessage("Tipo deve ser pessoa jurídica ou física.");
        RuleFor(c => c.Email).EmailAddress().When(c => !string.IsNullOrWhiteSpace(c.Email)).WithMessage("E-mail inválido.");
        RuleFor(c => c.PrazoPagamentoDias).GreaterThanOrEqualTo(0).WithMessage("Prazo de pagamento inválido.");
        RuleForEach(c => c.Contatos).ChildRules(ct =>
            ct.RuleFor(x => x.Email).EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.Email)).WithMessage("E-mail de contato inválido."));
    }
}

public class FornecedorValidator : AbstractValidator<Fornecedor>
{
    public FornecedorValidator()
    {
        RuleFor(f => f.Nome).NotEmpty().WithMessage("Informe a razão social ou o nome do fornecedor.").MaximumLength(160);
        RuleFor(f => f.Pais).NotEmpty().When(f => f.Externo).WithMessage("Informe o país do fornecedor do exterior.");
        RuleFor(f => f.Email).EmailAddress().When(f => !string.IsNullOrWhiteSpace(f.Email)).WithMessage("E-mail inválido.");
        RuleFor(f => f.LimiteCompra).GreaterThanOrEqualTo(0);
    }
}

public class VendedorValidator : AbstractValidator<Vendedor>
{
    public VendedorValidator()
    {
        RuleFor(v => v.Nome).NotEmpty().WithMessage("Informe o nome do vendedor.").MaximumLength(160);
        RuleFor(v => v.ComissaoPercentual).GreaterThanOrEqualTo(0).WithMessage("Comissão inválida.");
        RuleForEach(v => v.RegioesBloqueadas).ChildRules(r =>
        {
            r.RuleFor(x => x.Tipo).Must(t => t is "pais" or "estado" or "cidade").WithMessage("Tipo de região inválido.");
            r.RuleFor(x => x.Valor).NotEmpty().WithMessage("Informe a região bloqueada.");
        });
    }
}

public class EmpresaValidator : AbstractValidator<Empresa>
{
    public EmpresaValidator()
    {
        RuleFor(e => e.Nome).NotEmpty().WithMessage("Informe o nome curto da empresa.");
        RuleFor(e => e.RazaoSocial).NotEmpty().WithMessage("Informe a razão social.");
        RuleFor(e => e.Dv.ReceitaEstimadaMensal).GreaterThanOrEqualTo(0);
        RuleFor(e => e.MarkupMinimo).InclusiveBetween(0m, 1m).WithMessage("Markup mínimo deve ficar entre 0% e 100%.");
        RuleFor(e => e.Dv.Lucro).InclusiveBetween(0m, 1m).WithMessage("Markup praticado deve ficar entre 0% e 100%.");
        // Rede de segurança do fator: vale para o item do Pricing sem serviço com impostos cadastrados.
        RuleFor(e => e)
            .Must(e => e.ImpostosDaDv() > 0)
            .WithMessage("Informe os impostos da empresa (aba Markup): valem para o item sem serviço com impostos.")
            .When(e => e.Status != "inativo");
        RuleFor(e => e.InscricaoMunicipal).MaximumLength(20).WithMessage("Inscrição Municipal: até 20 caracteres.");
        RuleFor(e => e.InscricaoEstadual).MaximumLength(20).WithMessage("Inscrição Estadual: até 20 caracteres.");
        RuleFor(e => e.EnderecoCompleto!.Cep)
            .Must(c => c.Count(char.IsDigit) is 0 or 8).WithMessage("CEP da empresa: são 8 números.")
            .When(e => e.EnderecoCompleto is not null);
    }
}

public class ServicoValidator : AbstractValidator<Servico>
{
    public ServicoValidator()
    {
        RuleFor(s => s.Nome).NotEmpty().WithMessage("Informe o nome do serviço.");
        RuleForEach(s => s.Impostos).ChildRules(i =>
        {
            i.RuleFor(x => x.Imposto).Must(t => ImpostoServico.Tipos.Contains(t)).WithMessage("Imposto inválido.");
            i.RuleFor(x => x.Nome).NotEmpty().When(x => x.Imposto == "outro").WithMessage("Dê um nome ao imposto.");
            i.RuleFor(x => x.Base).InclusiveBetween(0m, 1m).WithMessage(x => $"{Rotulo(x)}: a base de cálculo fica entre 0% e 100%.");
            i.RuleFor(x => x.Aliquota).InclusiveBetween(0m, 1m).WithMessage(x => $"{Rotulo(x)}: a alíquota fica entre 0% e 100%.");
            i.RuleFor(x => x.Limite).GreaterThanOrEqualTo(0m).WithMessage("O limite do adicional não pode ser negativo.");
            i.RuleFor(x => x.Regime).Must(r => r.Length == 0 || Regimes.Contains(r)).WithMessage("Regime inválido nos impostos.");
            i.RuleFor(x => x.VigenteDesde).Must(v => v.Length == 0 || DateOnly.TryParseExact(v, "yyyy-MM-dd", out _))
                .WithMessage("Início da vigência inválido nos impostos.");
        });
        RuleFor(s => s.Impostos)
            .Must(l => l.Where(i => i.Imposto != "outro").GroupBy(i => (i.Regime, i.VigenteDesde, i.Imposto)).All(g => g.Count() == 1))
            .WithMessage("Cada imposto aparece uma vez na mesma tabela (regime e vigência); use \"Outro\" para um a mais.");
    }

    private static readonly string[] Regimes = ["Simples Nacional", "Lucro Presumido", "Lucro Real"];

    private static string Rotulo(ImpostoServico i) => i.Nome.Length > 0 ? i.Nome : i.Imposto.ToUpperInvariant();
}

public class TipoCustoValidator : AbstractValidator<TipoCusto>
{
    public TipoCustoValidator()
    {
        RuleFor(t => t.Nome).NotEmpty().WithMessage("Informe o nome do tipo de custo.");
        RuleFor(t => t.Modo).Must(m => m is "valor" or "percentual").WithMessage("Cobrado como valor ou percentual.");
        RuleFor(t => t.Valor).GreaterThanOrEqualTo(0).WithMessage("Valor inválido.");
        RuleFor(t => t.BasePercentual).Must(b => b is "nf" or "servico").When(t => t.Modo == "percentual")
            .WithMessage("Percentual sobre a NF ou sobre o serviço.");
    }
}

public class PlanoContaValidator : AbstractValidator<PlanoConta>
{
    public PlanoContaValidator()
    {
        RuleFor(p => p.Codigo).NotEmpty().WithMessage("Informe o código da conta.");
        RuleFor(p => p.Nome).NotEmpty().WithMessage("Informe o nome da conta.");
        RuleFor(p => p.GrupoDre).Must(g => g is "Despesa" or "Receita").WithMessage("Grupo DRE deve ser Despesa ou Receita.");
    }
}

public class CustoFixoValidator : AbstractValidator<CustoFixo>
{
    public CustoFixoValidator()
    {
        RuleFor(c => c.Descricao).NotEmpty().WithMessage("Informe a descrição da despesa.");
        RuleFor(c => c.UnidadeId).NotEmpty().WithMessage("Informe a empresa da despesa.");
        RuleFor(c => c.ValorMensal).GreaterThanOrEqualTo(0).WithMessage("Valor inválido.");
        RuleFor(c => c.Tipo).Must(t => t is "recorrente" or "spot").WithMessage("Tipo deve ser recorrente ou spot.");
        RuleFor(c => c.DiaVencimento).InclusiveBetween(0, 31).WithMessage("Dia de vencimento deve ser de 1 a 31.");
        RuleFor(c => c).Must(c => c.ConferirRateio() is null).WithMessage(c => c.ConferirRateio()!);
    }
}

public class RegraAprovacaoValidator : AbstractValidator<RegraAprovacao>
{
    public RegraAprovacaoValidator()
    {
        RuleFor(r => r.Nome).NotEmpty().WithMessage("Informe o nome da regra.");
        RuleFor(r => r.Tipo).Must(t => string.IsNullOrEmpty(t) || t is "proposta" or "compras" or "comissao" or "movimento").WithMessage("Tipo de regra inválido.");
        When(r => r.Tipo == "movimento", () =>
        {
            RuleFor(r => r.Aprovadores).NotEmpty().WithMessage("Escolha ao menos um aprovador.");
            RuleFor(r => r.TipoMovimento).Must(t => string.IsNullOrEmpty(t) || t is "pagar" or "receber").WithMessage("Escolha a pagar, a receber ou os dois.");
            RuleFor(r => r.Ate).GreaterThanOrEqualTo(r => r.De).When(r => r.Ate > 0).WithMessage("O fim da faixa não pode ser menor que o início.");
        });
        When(r => r.EhProposta, () =>
        {
            RuleFor(r => r.Aprovadores).NotEmpty().WithMessage("Escolha ao menos um aprovador.");
            RuleFor(r => r.Ate).GreaterThanOrEqualTo(r => r.De).When(r => r.Ate > 0).WithMessage("O fim da faixa não pode ser menor que o início.");
        });
        When(r => r.Tipo == "compras", () =>
        {
            RuleFor(r => r.CompradorId).NotEmpty().WithMessage("Escolha o comprador.");
            RuleFor(r => r.Limite).GreaterThan(0).WithMessage("Informe o limite de compra.");
            RuleFor(r => r.Aprovadores).NotEmpty().WithMessage("Escolha quem aprova acima do limite.");
        });
        When(r => r.Tipo == "comissao", () =>
            RuleFor(r => r.VendedorId).NotEmpty().WithMessage("Escolha o vendedor."));
    }
}

public class VeiculoValidator : AbstractValidator<Veiculo>
{
    public VeiculoValidator()
    {
        // Regras separadas: o When de uma corrente vale para a corrente toda (e anularia o NotEmpty).
        RuleFor(v => v.PlacaTracao).NotEmpty().WithMessage("Informe a placa de tração.");
        RuleFor(v => v.PlacaTracao).Must(Veiculo.PlacaValida).When(v => !string.IsNullOrWhiteSpace(v.PlacaTracao))
            .WithMessage("Placa de tração inválida: use ABC-1234 ou ABC1D23 (Mercosul).");
        RuleFor(v => v.PlacaReboque).Must(Veiculo.PlacaValida).When(v => !string.IsNullOrWhiteSpace(v.PlacaReboque))
            .WithMessage("Placa do reboque inválida: use ABC-1234 ou ABC1D23 (Mercosul).");
        RuleFor(v => v.TipoVeiculo).NotEmpty().WithMessage("Escolha o tipo de veículo.");
        RuleFor(v => v.Renavam).Must(r => r.Length is 9 or 11).When(v => !string.IsNullOrWhiteSpace(v.Renavam))
            .WithMessage("O Renavam tem 11 dígitos (os antigos, 9).");
        RuleFor(v => v.CpfCnpj)
            .Must(d => DocumentoFiscal.Digitos(d).Length == 11 ? DocumentoFiscal.CpfValido(d) : DocumentoFiscal.CnpjValido(d))
            .When(v => !string.IsNullOrWhiteSpace(v.CpfCnpj))
            .WithMessage("CPF/CNPJ do proprietário inválido.");
    }
}

public class MetaValidator : AbstractValidator<Meta>
{
    public MetaValidator()
    {
        RuleFor(m => m.Nome).NotEmpty().WithMessage("Informe o nome da meta.");
        RuleFor(m => m.EmpresaId).NotEmpty().WithMessage("Escolha a empresa da meta: ela compõe o fator dessa empresa.");
        RuleFor(m => m.ValoresMensais)
            .Must(v => v is null || v.Count == 0 || v.Count == 12).WithMessage("Informe a meta dos 12 meses.")
            .Must(v => v is null || v.All(x => x >= 0)).WithMessage("A meta de um mês não pode ser negativa.");
        RuleFor(m => m.BasePreco).Must(b => b is Meta.BaseMedia or Meta.BaseMes)
            .WithMessage("Escolha a base do preço: média mensal do ano ou meta do mês.");
        RuleFor(m => m.OrigemAnual).Must(o => o is Meta.AnualValor or Meta.AnualAnoAnterior)
            .WithMessage("Escolha de onde vem o valor anual.");
        // O valor anual manda: os meses precisam somar exatamente ele (nem menos, nem mais).
        RuleFor(m => m).Must(m => m.ConferirValores() is null).WithMessage(m => m.ConferirValores()!);
    }
}

public class FunilValidator : AbstractValidator<Funil>
{
    public FunilValidator()
    {
        RuleFor(f => f.Nome).NotEmpty().WithMessage("Informe o nome do funil.");
        RuleFor(f => f.Etapas).NotEmpty().WithMessage("O funil precisa de ao menos uma etapa.");
        RuleForEach(f => f.Etapas).ChildRules(e => e.RuleFor(x => x.Nome).NotEmpty().WithMessage("Toda etapa precisa de um nome."));
        RuleFor(f => f.HorasAlerta).GreaterThanOrEqualTo(0);
    }
}

public class OportunidadeValidator : AbstractValidator<Oportunidade>
{
    public OportunidadeValidator()
    {
        RuleFor(o => o.Cliente).NotEmpty().WithMessage("Informe o nome do cliente.");
        RuleFor(o => o.FunilId).NotEmpty();
        RuleFor(o => o.EtapaId).NotEmpty();
        RuleFor(o => o.ValorEstimado).GreaterThanOrEqualTo(0);
    }
}

public class CategoriaCustoValidator : AbstractValidator<CategoriaCusto>
{
    public CategoriaCustoValidator() => RuleFor(c => c.Nome).NotEmpty().WithMessage("Informe o nome do centro de custo.");
}

public class TaxaValidator : AbstractValidator<Taxa>
{
    public TaxaValidator()
    {
        RuleFor(t => t.Nome).NotEmpty().WithMessage("Informe o nome da taxa.");
        RuleFor(t => t.Valor).GreaterThanOrEqualTo(0).WithMessage("Valor inválido.");
    }
}

public class ValidadePropostaValidator : AbstractValidator<ValidadeProposta>
{
    public ValidadePropostaValidator() => RuleFor(v => v.Descricao).NotEmpty().WithMessage("Informe a validade.");
}

/// <summary>Compromisso da Agenda: título, tipo e período coerentes (fim não antes do início).</summary>
public class CompromissoValidator : AbstractValidator<Compromisso>
{
    private static readonly string[] Tipos = { "reuniao", "ligacao", "visita", "tarefa", "outro" };
    private const string Formato = @"^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$";

    public CompromissoValidator()
    {
        RuleFor(c => c.Titulo).NotEmpty().WithMessage("Dê um título ao compromisso.")
            .MaximumLength(160).WithMessage("Título longo demais (máximo 160 caracteres).");
        RuleFor(c => c.Tipo).Must(t => Tipos.Contains(t)).WithMessage("Tipo de compromisso inválido.");
        RuleFor(c => c.Inicio).Matches(Formato).WithMessage("Informe a data e a hora de início.");
        RuleFor(c => c.Fim).Matches(Formato).WithMessage("Informe a data e a hora de fim.");
        RuleFor(c => c).Must(c => string.CompareOrdinal(c.Fim, c.Inicio) >= 0)
            .WithMessage("O fim não pode ser antes do início.");
        RuleFor(c => c.Descricao).MaximumLength(2000).WithMessage("Descrição longa demais.");
        RuleFor(c => c.Convidados).Must(l => l.Count <= 50).WithMessage("No máximo 50 convidados.");
        RuleForEach(c => c.Convidados).EmailAddress().WithMessage("E-mail de convidado inválido: {PropertyValue}.");
    }
}
