using Elrond.Application.DTOs;
using Elrond.Domain.Regras;
using FluentValidation;

namespace Elrond.Application.Validators;

/// <summary>
/// Confere o pedido de NFS-e antes de qualquer envio: formato dos documentos, códigos do serviço,
/// valores e os endereços que a operação exige. As regras que dependem da empresa (regime) ficam
/// no motor, que conhece o cadastro.
/// </summary>
public sealed class PedidoNfseValidator : AbstractValidator<PedidoNfseDto>
{
    public PedidoNfseValidator()
    {
        RuleFor(p => p.EmpresaId).NotEmpty().WithMessage("Informe a empresa emissora.");

        RuleFor(p => p.Tomador).NotNull().WithMessage("Informe o tomador (cliente).")
            .SetValidator(new TomadorValidator()!);
        RuleFor(p => p.Servico).NotNull().WithMessage("Informe o serviço.")
            .SetValidator(new ServicoValidator()!);
        RuleFor(p => p.Valores).NotNull().WithMessage("Informe os valores.")
            .SetValidator(new ValoresValidator()!);

        When(p => p.Iss is not null, () =>
        {
            RuleFor(p => p.Iss!.Aliquota)
                .InclusiveBetween(0m, RegrasNfse.AliquotaIssMaxima).When(p => p.Iss!.Aliquota is not null)
                .WithMessage("Alíquota do ISS: entre 0 e 5% (informe como fração, ex.: 0,02 = 2%).");
            RuleFor(p => p.LocalPrestacao).NotNull()
                .When(p => p.Iss!.Tributacao == TributacaoIss.ForaDoMunicipio)
                .WithMessage("ISS devido fora do município: informe o local da prestação.");
        });

        When(p => p.Retencoes is not null, () =>
        {
            RuleFor(p => p.Retencoes!).Must(r => r.Inss >= 0 && r.Ir >= 0 && r.Pis >= 0 && r.Cofins >= 0 && r.Csll >= 0 && r.Iss >= 0 && r.Outras >= 0)
                .WithMessage("Retenções não podem ser negativas.");
            RuleFor(p => p).Must(p => p.Retencoes!.Total <= p.Valores.ValorServicos)
                .When(p => p.Valores is not null)
                .WithMessage("A soma das retenções passa do valor do serviço.");
        });

        When(p => p.IbsCbs is not null, () =>
        {
            RuleFor(p => p.IbsCbs!.IndicadorOperacao).Must(SeisDigitos)
                .WithMessage("Indicador da operação do IBS/CBS (cIndOp): 6 dígitos (ex.: 100301).");
            RuleFor(p => p.IbsCbs!.ClassificacaoTributaria).Must(SeisDigitos)
                .WithMessage("Classificação tributária do IBS/CBS (cClassTrib): 6 dígitos (ex.: 000001).");
            RuleFor(p => p.EnderecoImovel).NotNull()
                .When(p => RegrasNfse.ExigeEnderecoImovel(p.IbsCbs!.IndicadorOperacao))
                .WithMessage(p => $"A operação {p.IbsCbs!.IndicadorOperacao} envolve imóvel: informe o endereço do imóvel onde o serviço é feito.");
            RuleFor(p => p.LocalPrestacao).NotNull()
                .When(p => RegrasNfse.ExigeLocalPrestacao(p.IbsCbs!.IndicadorOperacao))
                .WithMessage(p => $"A operação {p.IbsCbs!.IndicadorOperacao} usa o local da prestação: informe esse endereço.");
        });

        RuleFor(p => p.LocalPrestacao!).SetValidator(new EnderecoValidator("Local da prestação")).When(p => p.LocalPrestacao is not null);
        RuleFor(p => p.EnderecoImovel!).SetValidator(new EnderecoValidator("Endereço do imóvel")).When(p => p.EnderecoImovel is not null);

        RuleFor(p => p.InformacoesAdicionais).MaximumLength(RegrasNfse.TamanhoMaximoInformacoes)
            .WithMessage($"Informações adicionais: até {RegrasNfse.TamanhoMaximoInformacoes} caracteres.");
        RuleFor(p => p.NumeroPedido).MaximumLength(60).WithMessage("Número do pedido/contrato: até 60 caracteres.");
        RuleFor(p => p.Origem!).Must(o => !string.IsNullOrWhiteSpace(o.Tipo) && !string.IsNullOrWhiteSpace(o.Id))
            .When(p => p.Origem is not null).WithMessage("Origem: informe o tipo e o id.");
    }

    private static bool SeisDigitos(string? s) => s is { Length: 6 } && s.All(char.IsDigit);

    private sealed class TomadorValidator : AbstractValidator<TomadorNfseDto>
    {
        public TomadorValidator()
        {
            RuleFor(t => t.Tipo).Must(t => t is "juridica" or "fisica")
                .WithMessage("Tomador: tipo \"juridica\" ou \"fisica\".");
            RuleFor(t => t.Nome).NotEmpty().WithMessage("Tomador: informe o nome ou a razão social.")
                .MaximumLength(115).WithMessage("Tomador: nome com até 115 caracteres.");
            RuleFor(t => t.Documento)
                .Must(DocumentoFiscal.CnpjValido).When(t => t.Tipo == "juridica").WithMessage("Tomador: CNPJ inválido.");
            RuleFor(t => t.Documento)
                .Must(DocumentoFiscal.CpfValido).When(t => t.Tipo == "fisica").WithMessage("Tomador: CPF inválido.");
            RuleFor(t => t.Email).EmailAddress().When(t => !string.IsNullOrWhiteSpace(t.Email))
                .WithMessage("Tomador: e-mail inválido.");
            RuleFor(t => t.Telefone).Must(f => DocumentoFiscal.Digitos(f).Length is >= 7 and <= 20)
                .When(t => !string.IsNullOrWhiteSpace(t.Telefone)).WithMessage("Tomador: telefone com 7 a 20 dígitos.");
            RuleFor(t => t.InscricaoMunicipal).MaximumLength(12).WithMessage("Tomador: Inscrição Municipal com até 12 caracteres.");
            RuleFor(t => t.Endereco!).SetValidator(new EnderecoValidator("Endereço do tomador")).When(t => t.Endereco is not null);
        }
    }

    private sealed class ServicoValidator : AbstractValidator<ServicoNfseDto>
    {
        public ServicoValidator()
        {
            RuleFor(s => s.CodigoMunicipal).NotEmpty().WithMessage("Serviço: informe o código do serviço na prefeitura.");
            RuleFor(s => s.ItemLc116).Must(RegrasNfse.ItemLc116Valido)
                .WithMessage("Serviço: item da LC 116 no formato 00.00 (ex.: 17.05).");
            RuleFor(s => s.Nbs).Must(n => DocumentoFiscal.Digitos(n).Length == 9)
                .WithMessage("Serviço: NBS com 9 dígitos (ex.: 1.1801.21.00).");
            RuleFor(s => s.Cnae).Must(c => DocumentoFiscal.Digitos(c).Length == 7)
                .When(s => !string.IsNullOrWhiteSpace(s.Cnae)).WithMessage("Serviço: CNAE com 7 dígitos.");
            RuleFor(s => s.Descricao).NotEmpty().WithMessage("Serviço: informe a descrição da nota.")
                .MaximumLength(RegrasNfse.TamanhoMaximoDescricao)
                .WithMessage($"Serviço: descrição com até {RegrasNfse.TamanhoMaximoDescricao} caracteres.");
        }
    }

    private sealed class ValoresValidator : AbstractValidator<ValoresNfseDto>
    {
        public ValoresValidator()
        {
            RuleFor(v => v.ValorServicos).GreaterThan(0).WithMessage("Valor do serviço precisa ser maior que zero.");
            RuleFor(v => v).Must(v => v.DescontoIncondicionado >= 0 && v.DescontoCondicionado >= 0 && v.Deducoes >= 0)
                .WithMessage("Descontos e deduções não podem ser negativos.");
            RuleFor(v => v).Must(v => v.DescontoIncondicionado + v.Deducoes <= v.ValorServicos)
                .WithMessage("Descontos e deduções passam do valor do serviço.");
        }
    }

    private sealed class EnderecoValidator : AbstractValidator<EnderecoNfseDto>
    {
        public EnderecoValidator(string onde)
        {
            RuleFor(e => e.Cep).Must(DocumentoFiscal.CepValido).WithMessage($"{onde}: CEP com 8 dígitos.");
            RuleFor(e => e.Logradouro).NotEmpty().WithMessage($"{onde}: informe a rua.");
            RuleFor(e => e.Numero).NotEmpty().WithMessage($"{onde}: informe o número (ou S/N).");
            RuleFor(e => e.Bairro).NotEmpty().WithMessage($"{onde}: informe o bairro.");
            RuleFor(e => e).Must(e => DocumentoFiscal.IbgeDaUf(e.CodigoIbge, e.Uf))
                .WithMessage($"{onde}: código IBGE do município (7 dígitos) e UF precisam combinar.");
        }
    }
}
