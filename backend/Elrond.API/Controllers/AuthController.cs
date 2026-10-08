using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;

namespace Elrond.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IValidator<LoginDto> _loginValidator;
    private readonly IUserRepository _users;

    public AuthController(IAuthService authService, IValidator<LoginDto> loginValidator, IUserRepository users)
    {
        _authService = authService;
        _loginValidator = loginValidator;
        _users = users;
    }

    /// <summary>Autentica um usuário e retorna um token JWT.</summary>
    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var validation = await _loginValidator.ValidateAsync(dto);
        if (!validation.IsValid)
        {
            foreach (var error in validation.Errors)
                ModelState.AddModelError(error.PropertyName, error.ErrorMessage);
            return ValidationProblem(ModelState);
        }

        var result = await _authService.LoginAsync(dto);
        if (!result.IsSuccess)
            return Problem(
                detail: result.Error,
                statusCode: StatusCodes.Status401Unauthorized,
                title: "Falha na autenticação.");

        return Ok(result.Value);
    }

    /// <summary>
    /// Dados do usuário autenticado — permissões calculadas AO VIVO do banco
    /// (Gestor sempre recebe todas as funcionalidades atuais, sem depender do token antigo).
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var email = User.FindFirstValue(ClaimTypes.Email) ?? string.Empty;
        var user = await _users.FindByEmailAsync(email);
        if (user is null) return Unauthorized();

        var permissoes = Funcionalidades.Efetivas(user.Perfil, user.Permissoes);
        return Ok(new CurrentUserDto(user.Email, user.Name, user.Perfil, permissoes));
    }
}
