using Elrond.Application.Interfaces;
using Elrond.Application.Services;
using Elrond.Application.Validators;
using Elrond.Infrastructure.Integracoes.ConsultaPublica;
using Elrond.Infrastructure.Integracoes.Google;
using Elrond.Infrastructure.Persistence;
using Elrond.Infrastructure.Repositories;
using Elrond.Infrastructure.Security;
using Elrond.Infrastructure.Services;
using Elrond.Infrastructure.Storage;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Elrond.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Banco (EF Core + PostgreSQL)
        var connectionString = configuration.GetConnectionString("Postgres")
            ?? throw new InvalidOperationException("ConnectionStrings:Postgres não configurada.");
        services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));

        // Segurança
        services.AddSingleton<IPasswordHasher, BcryptPasswordHasher>();
        services.AddSingleton<ITokenService, JwtTokenService>();

        // Repositórios (Scoped: dependem do DbContext)
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IUsuarioRepository, UsuarioRepository>();
        services.AddScoped(typeof(ICrudRepository<>), typeof(EfCrudRepository<>));
        services.AddScoped<ICidadeRepository, CidadeRepository>();
        services.AddScoped<IAnexoRepository, AnexoRepository>();
        services.AddScoped<IUnidadeTrabalho, UnidadeTrabalho>();

        // Arquivos anexados (disco, raiz em Arquivos:Raiz)
        services.AddSingleton<IArquivoStorage, DiscoArquivoStorage>();

        // Serviços de aplicação
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IPricingService, PricingService>();
        services.AddScoped<IFatorService, FatorService>();
        services.AddScoped<IFinanceiroService, FinanceiroService>();
        services.AddScoped<ICarteiraService, CarteiraService>();
        services.AddScoped<IAnexoService, AnexoService>();
        services.AddScoped<IPropostaService, PropostaService>();
        services.AddScoped<ICompraService, CompraService>();
        services.AddScoped<IOportunidadeService, OportunidadeService>();
        // Cadastros parametrizáveis: Dados da Operação e Ficha Técnica
        services.AddScoped<IParametrizacaoService, ParametrizacaoService>();

        // Google Agenda: configuração vem do ambiente do servidor; sem ela a integração fica desligada.
        var google = new GoogleOpcoes
        {
            ClientId = configuration["Google:ClientId"] ?? string.Empty,
            ClientSecret = configuration["Google:ClientSecret"] ?? string.Empty,
            ChaveCriptografia = configuration["Google:ChaveCriptografia"] ?? string.Empty,
            RetornoUrl = configuration["Google:RetornoUrl"] ?? string.Empty,
            UrlPublica = configuration["App:UrlPublica"] ?? string.Empty,
        };
        services.AddSingleton(google);
        services.AddSingleton<IGoogleApi>(_ => new GoogleApi(
            new HttpClient(new SocketsHttpHandler { PooledConnectionLifetime = TimeSpan.FromMinutes(5) }) { Timeout = TimeSpan.FromSeconds(20) },
            google));
        services.AddScoped<IGoogleAgendaService, GoogleAgendaService>();
        // Consulta de CNPJ e CEP em fontes públicas (CNPJá, BrasilAPI, ViaCEP), com cache em memória.
        services.AddMemoryCache();
        // Um HttpClient só para as fontes públicas (mesmo padrão do Google: conexões reaproveitadas).
        var httpConsultas = new HttpClient(new SocketsHttpHandler { PooledConnectionLifetime = TimeSpan.FromMinutes(5) }) { Timeout = TimeSpan.FromSeconds(8) };
        httpConsultas.DefaultRequestHeaders.UserAgent.ParseAdd("ELROND/1.0 (+https://elrond.sinesta.com.br)");
        httpConsultas.DefaultRequestHeaders.Accept.ParseAdd("application/json");
        services.AddScoped<IConsultaPublicaService>(sp => new ConsultaPublicaService(
            httpConsultas,
            sp.GetRequiredService<Microsoft.Extensions.Caching.Memory.IMemoryCache>(),
            sp.GetRequiredService<ICidadeRepository>(),
            sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<ConsultaPublicaService>>()));
        // Certificado A1 das empresas (NFS-e): cifrado no banco com a chave do ambiente do servidor.
        services.AddSingleton(new CertificadoOpcoes { ChaveBase64 = configuration["Certificados:Chave"] ?? string.Empty });
        services.AddScoped<ICertificadoService, CertificadoService>();
        // Erros devolvidos pelo servidor, guardados no banco para diagnóstico (90 dias).
        services.AddSingleton<IRegistroErros, RegistroErros>();
        // Trilha de auditoria e numeração da proposta (sequência do Postgres)
        services.AddScoped<IAuditoriaService, AuditoriaService>();
        services.AddScoped<IPropostaNumerador, PropostaNumerador>();

        // Validators (FluentValidation)
        services.AddValidatorsFromAssemblyContaining<LoginDtoValidator>();

        return services;
    }
}
