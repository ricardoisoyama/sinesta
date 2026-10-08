using System.Security.Claims;
using Elrond.Application.Interfaces;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Elrond.API;

/// <summary>
/// Tratamento global de exceções → resposta padronizada em ProblemDetails (RFC 7807).
/// O erro também vai para <c>registro_erros</c> (tipo e mensagem da exceção, rota, usuário).
/// </summary>
public sealed class GlobalExceptionHandler : IExceptionHandler
{
    private readonly IProblemDetailsService _problemDetails;
    private readonly ILogger<GlobalExceptionHandler> _logger;
    private readonly IRegistroErros _registro;

    public GlobalExceptionHandler(
        IProblemDetailsService problemDetails,
        ILogger<GlobalExceptionHandler> logger,
        IRegistroErros registro)
    {
        _problemDetails = problemDetails;
        _logger = logger;
        _registro = registro;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        _logger.LogError(exception, "Erro não tratado: {Message}", exception.Message);
        const string mensagem = "Erro interno do servidor. Tente de novo; se continuar, avise o suporte.";
        _registro.Registrar(
            "excecao", httpContext.Request.Method, httpContext.Request.Path, StatusCodes.Status500InternalServerError, mensagem,
            $"{exception.GetType().Name}: {exception.Message}",
            httpContext.User.FindFirstValue(ClaimTypes.Email) ?? string.Empty, httpContext.TraceIdentifier);

        httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;

        return await _problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails = new ProblemDetails
            {
                Title = mensagem,
                Status = StatusCodes.Status500InternalServerError,
            },
        });
    }
}
