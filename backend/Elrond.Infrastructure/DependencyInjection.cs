using Elrond.Application.Interfaces;
using Elrond.Application.Services;
using Elrond.Application.Validators;
using Elrond.Infrastructure.Bancos;
using Elrond.Infrastructure.Bancos.Inter;
using Elrond.Infrastructure.Bancos.Simulador;
using Elrond.Infrastructure.Integracoes.ConsultaPublica;
using Elrond.Infrastructure.Integracoes.Siimp;
using Elrond.Infrastructure.Integracoes.Google;
using Elrond.Infrastructure.Integracoes.NfeIo;
using Elrond.Infrastructure.Integracoes.Simulador;
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
        services.AddScoped<INumerador, Numerador>();

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
        // Motor de NFS-e: provedores trocáveis (NFE.io real e simulador), escolhidos pela configuração
        // fiscal de cada empresa. A chave da NFE.io vem do ambiente; sem ela, só o simulador funciona.
        services.AddSingleton(TimeProvider.System);
        var nfeio = new NfeIoOpcoes
        {
            ChaveApi = configuration["NfeIo:ChaveApi"] ?? string.Empty,
            UrlBase = configuration["NfeIo:UrlBase"] is { Length: > 0 } url ? url : "https://api.nfe.io",
            SegredoAviso = configuration["NfeIo:SegredoAviso"] ?? string.Empty,
        };
        services.AddSingleton(nfeio);
        services.AddSingleton<NfeIoAvisos>();
        // A NFE.io responde em até 60 s antes de dar tempo esgotado: o cliente espera um pouco mais.
        var httpNfeIo = new HttpClient(new SocketsHttpHandler { PooledConnectionLifetime = TimeSpan.FromMinutes(5) }) { Timeout = TimeSpan.FromSeconds(70) };
        httpNfeIo.DefaultRequestHeaders.UserAgent.ParseAdd("ELROND/1.0 (+https://elrond.sinesta.com.br)");
        services.AddSingleton<INfseProvedor>(sp => new NfeIoProvedor(httpNfeIo, nfeio, sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<NfeIoProvedor>>()));
        services.AddSingleton<INfseProvedor, SimuladorNfseProvedor>();
        services.AddSingleton<INfseProvedores, NfseProvedores>();
        services.AddScoped<INotasFiscaisServicoRepository, NotasFiscaisServicoRepository>();
        services.AddScoped<INfseService, NfseService>();

        // Motor de bancos: um módulo por banco (Inter, simulador...), escolhido pela integração da empresa.
        // Credenciais de cada integração ficam cifradas no banco com a mesma chave do certificado A1.
        services.AddSingleton<ICofreBancario, CofreBancario>();
        services.AddSingleton(new InterOpcoes
        {
            UrlProducao = configuration["Inter:UrlProducao"] is { Length: > 0 } up ? up : "https://cdpj.partners.bancointer.com.br",
            UrlSandbox = configuration["Inter:UrlSandbox"] is { Length: > 0 } us ? us : "https://cdpj-sandbox.partners.uatinter.co",
        });
        services.AddSingleton<InterConexao>();
        services.AddSingleton<InterCobranca>();
        services.AddSingleton<IBancoModulo, InterModulo>();
        services.AddSingleton<SimuladorCobranca>();
        services.AddSingleton<IBancoModulo, SimuladorModulo>();
        services.AddSingleton<IBancos, BancosRegistro>();
        services.AddScoped<ICobrancaService, CobrancaService>();
        services.AddScoped<IIntegracaoBancariaService, IntegracaoBancariaService>();

        // SIIMP (TMS do cliente): só leitura e temporário, para a página de testes de boleto.
        var httpSiimp = new HttpClient(new SocketsHttpHandler { PooledConnectionLifetime = TimeSpan.FromMinutes(5) }) { Timeout = TimeSpan.FromSeconds(30) };
        httpSiimp.DefaultRequestHeaders.Accept.ParseAdd("application/json");
        var siimp = new SiimpOpcoes { Url = configuration["Siimp:Url"] ?? string.Empty, Token = configuration["Siimp:Token"] ?? string.Empty };
        services.AddSingleton<ISiimp>(sp => new SiimpCliente(httpSiimp, siimp, sp.GetRequiredService<Microsoft.Extensions.Logging.ILogger<SiimpCliente>>()));

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
