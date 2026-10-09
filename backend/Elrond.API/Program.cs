using System.Text;
using System.Threading.RateLimiting;
using Elrond.API;
using Elrond.API.Security;
using Elrond.Application.Interfaces;
using Elrond.Application.Options;
using Microsoft.AspNetCore.Authorization;
using Elrond.Infrastructure;
using Elrond.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

// ── Options (JWT) ────────────────────────────────────────────────────────
// Chave curta ou a chave de exemplo do repositório não sobem em produção.
const string ChaveDeExemplo = "elrond-super-secret-key-change-in-production-2026!@#";
builder.Services
    .AddOptions<JwtOptions>()
    .Bind(builder.Configuration.GetSection(JwtOptions.SectionName))
    .Validate(o => !string.IsNullOrWhiteSpace(o.SecretKey), "Jwt:SecretKey não configurado.")
    .Validate(o => Encoding.UTF8.GetByteCount(o.SecretKey) >= 32, "Jwt:SecretKey precisa ter ao menos 32 bytes.")
    .Validate(o => builder.Environment.IsDevelopment() || o.SecretKey != ChaveDeExemplo,
        "Jwt:SecretKey é a chave de exemplo; defina JWT_SECRET_KEY no .env.")
    .ValidateOnStart();

var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
    ?? throw new InvalidOperationException("Seção 'Jwt' não configurada.");

// ── Controllers + ProblemDetails + tratamento global de erros ────────────
// Escritas dos cadastros exigem a permissão da tela (conferida ao vivo no banco).
builder.Services.AddControllers(o => o.Filters.Add<PermissaoPorRotaFilter>())
    .ConfigureApiBehaviorOptions(o => o.InvalidModelStateResponseFactory = ctx =>
    {
        // Corpo que não converte (ex.: número vazio, campo obrigatório nulo): a resposta padrão dizia só
        // "One or more validation errors occurred.". Agora diz em português qual campo, e o log guarda
        // o campo e o motivo (nunca o valor enviado).
        var erros = ctx.ModelState
            .Where(e => e.Value is { Errors.Count: > 0 })
            .Select(e => (Campo: e.Key.TrimStart('$', '.'), Motivo: e.Value!.Errors[0].ErrorMessage))
            .ToList();
        var log = ctx.HttpContext.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("Validacao");
        log.LogWarning("Requisição recusada em {Metodo} {Rota}: {Erros}", ctx.HttpContext.Request.Method, ctx.HttpContext.Request.Path,
            string.Join(" | ", erros.Select(e => $"{e.Campo}: {e.Motivo}")));
        var campos = erros.Select(e => e.Campo).Where(c => c.Length > 0 && c != "entity").Distinct().ToList();
        var problema = new ValidationProblemDetails(ctx.ModelState)
        {
            Title = "Dados inválidos",
            Status = StatusCodes.Status400BadRequest,
            Detail = campos.Count > 0
                ? $"Alguns dados não puderam ser lidos: {string.Join(", ", campos)}. Confira esses campos e salve de novo."
                : "Alguns dados não puderam ser lidos. Confira os campos e salve de novo.",
        };
        var http = ctx.HttpContext;
        http.RequestServices.GetRequiredService<IRegistroErros>().Registrar(
            "validacao", http.Request.Method, http.Request.Path, StatusCodes.Status400BadRequest, problema.Detail,
            string.Join(" | ", erros.Select(e => $"{e.Campo}: {e.Motivo}")),
            http.User.FindFirstValue(ClaimTypes.Email) ?? string.Empty, http.TraceIdentifier);
        return new BadRequestObjectResult(problema);
    });
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddHttpContextAccessor();
// Usuário da requisição lido do banco (perfil/permissões/ativo valem na hora).
builder.Services.AddScoped<UsuarioContexto>();
builder.Services.AddScoped<IUsuarioAtualProvider>(sp => sp.GetRequiredService<UsuarioContexto>());

// ── OpenAPI (nativo do .NET 10) ──────────────────────────────────────────
builder.Services.AddOpenApi();

// ── IP real atrás do nginx/Apache (X-Forwarded-For) ──────────────────────
// O backend não publica porta: só o nginx do front fala com ele, então a cadeia é confiável.
builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    o.ForwardLimit = null;
    o.KnownIPNetworks.Clear();
    o.KnownProxies.Clear();
});

// ── Limite de tentativas de login (força bruta) ──────────────────────────
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.OnRejected = async (ctx, ct) =>
    {
        ctx.HttpContext.Response.ContentType = "text/plain; charset=utf-8";
        await ctx.HttpContext.Response.WriteAsync("Muitas tentativas de login. Aguarde um minuto e tente de novo.", ct);
    };
    o.AddPolicy("login", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "desconhecido",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 10,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
        }));
});

// ── JWT Authentication ───────────────────────────────────────────────────
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SecretKey)),
            ClockSkew = TimeSpan.Zero,
        };
        options.Events = new JwtBearerEvents
        {
            // Token válido de usuário desativado (ou apagado) não entra: vale na hora, sem esperar expirar.
            OnTokenValidated = async ctx =>
            {
                var email = ctx.Principal?.FindFirstValue(ClaimTypes.Email);
                var users = ctx.HttpContext.RequestServices.GetRequiredService<IUserRepository>();
                var user = string.IsNullOrEmpty(email) ? null : await users.FindByEmailAsync(email);
                if (user is null || !user.Ativo)
                    ctx.Fail("Usuário inativo.");
            },
        };
    });

builder.Services.AddAuthorization();
// Permissão por funcionalidade nos endpoints: [Authorize(Policy = "func:/rota")].
builder.Services.AddSingleton<IAuthorizationPolicyProvider, FuncionalidadePolicyProvider>();
builder.Services.AddScoped<IAuthorizationHandler, FuncionalidadeHandler>();

// ── CORS (front Vite) ────────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy
            .WithOrigins("http://localhost:5173", "http://localhost:3000")
            .AllowAnyHeader()
            .AllowAnyMethod());
});

// ── Application / Infrastructure ─────────────────────────────────────────
builder.Services.AddInfrastructure(builder.Configuration);
// Volta do Google Agenda (lê alterações a cada 5 minutos; desligado sem configuração).
builder.Services.AddHostedService<Elrond.API.Background.GoogleAgendaWorker>();
builder.Services.AddHostedService<Elrond.API.Background.NfseAcompanhamentoWorker>();

// ── Build ────────────────────────────────────────────────────────────────
var app = builder.Build();

// Migrations + seed no startup
await DatabaseInitializer.InitializeAsync(app.Services);

app.UseForwardedHeaders();
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();                 // documento em /openapi/v1.json
    app.MapScalarApiReference();      // UI moderna em /scalar/v1
}
// Em produção o TLS termina na borda (Apache do cPanel → nginx do front); sem HTTPS redirect no container.

app.UseCors("Frontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
