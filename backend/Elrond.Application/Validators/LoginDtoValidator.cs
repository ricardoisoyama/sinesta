using Elrond.Application.DTOs;
using FluentValidation;

namespace Elrond.Application.Validators;

public sealed class LoginDtoValidator : AbstractValidator<LoginDto>
{
    public LoginDtoValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Informe o e-mail.")
            .EmailAddress().WithMessage("E-mail inválido.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Informe a senha.")
            .MinimumLength(6).WithMessage("A senha deve ter ao menos 6 caracteres.");
    }
}
