using Elrond.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Elrond.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Taxa> Taxas => Set<Taxa>();
    public DbSet<PlanoConta> PlanoContas => Set<PlanoConta>();
    public DbSet<CustoFixo> CustosFixos => Set<CustoFixo>();
    public DbSet<Empresa> Empresas => Set<Empresa>();
    public DbSet<Proposta> Propostas => Set<Proposta>();
    public DbSet<Meta> Metas => Set<Meta>();
    public DbSet<ModeloProposta> ModelosProposta => Set<ModeloProposta>();
    public DbSet<Cidade> Cidades => Set<Cidade>();
    public DbSet<Servico> Servicos => Set<Servico>();
    public DbSet<TipoCusto> TiposCusto => Set<TipoCusto>();
    public DbSet<Veiculo> Veiculos => Set<Veiculo>();
    public DbSet<IntegracaoBancaria> IntegracoesBancarias => Set<IntegracaoBancaria>();
    public DbSet<CobrancaBancaria> CobrancasBancarias => Set<CobrancaBancaria>();
    public DbSet<ValidadeProposta> ValidadesProposta => Set<ValidadeProposta>();
    public DbSet<CertificadoEmpresa> CertificadosEmpresa => Set<CertificadoEmpresa>();
    public DbSet<RegistroErro> RegistrosErro => Set<RegistroErro>();
    public DbSet<NotaFiscalServico> NotasFiscaisServico => Set<NotaFiscalServico>();
    public DbSet<ConfiguracaoFiscalEmpresa> ConfiguracoesFiscais => Set<ConfiguracaoFiscalEmpresa>();
    public DbSet<AvisoNfseRecebido> AvisosNfse => Set<AvisoNfseRecebido>();
    public DbSet<Compromisso> Compromissos => Set<Compromisso>();
    public DbSet<ConexaoGoogle> ConexoesGoogle => Set<ConexaoGoogle>();
    public DbSet<VinculoGoogle> VinculosGoogle => Set<VinculoGoogle>();
    public DbSet<CategoriaCusto> CategoriasCusto => Set<CategoriaCusto>();
    public DbSet<RegraAprovacao> RegrasAprovacao => Set<RegraAprovacao>();
    public DbSet<Cliente> Clientes => Set<Cliente>();
    public DbSet<Fornecedor> Fornecedores => Set<Fornecedor>();
    public DbSet<Vendedor> Vendedores => Set<Vendedor>();
    public DbSet<Anexo> Anexos => Set<Anexo>();
    public DbSet<Funil> Funis => Set<Funil>();
    public DbSet<Oportunidade> Oportunidades => Set<Oportunidade>();
    public DbSet<RegistroAuditoria> Auditoria => Set<RegistroAuditoria>();
    public DbSet<CampoOperacao> CamposOperacao => Set<CampoOperacao>();
    public DbSet<TipoOperacao> TiposOperacao => Set<TipoOperacao>();
    public DbSet<FichaGrupo> FichaGrupos => Set<FichaGrupo>();
    public DbSet<FichaColuna> FichaColunas => Set<FichaColuna>();
    public DbSet<FichaTecnica> FichasTecnicas => Set<FichaTecnica>();
    public DbSet<FichaValor> FichaValores => Set<FichaValor>();
    public DbSet<Carteira> Carteiras => Set<Carteira>();
    public DbSet<Movimento> Movimentos => Set<Movimento>();
    public DbSet<ExtratoLinha> ExtratoLinhas => Set<ExtratoLinha>();
    public DbSet<RegraConciliacao> RegrasConciliacao => Set<RegraConciliacao>();
    public DbSet<ModeloContrato> ModelosContrato => Set<ModeloContrato>();
    public DbSet<Contrato> Contratos => Set<Contrato>();
    public DbSet<Fatura> Faturas => Set<Fatura>();
    public DbSet<CenarioProjecao> CenariosProjecao => Set<CenarioProjecao>();
    public DbSet<Feriado> Feriados => Set<Feriado>();

    protected override void ConfigureConventions(ModelConfigurationBuilder builder)
    {
        // Dinheiro/frações com precisão exata (numeric) no Postgres.
        builder.Properties<decimal>().HavePrecision(18, 6);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(e =>
        {
            e.ToTable("usuarios");
            e.HasKey(u => u.Id);
            e.Property(u => u.Email).IsRequired().HasMaxLength(160);
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Name).IsRequired().HasMaxLength(160);
            e.Property(u => u.PasswordHash).IsRequired();
            e.Property(u => u.Perfil).IsRequired().HasMaxLength(20);
            // List<string> → text[] nativo do Postgres (Npgsql)
            e.Property(u => u.Permissoes).HasColumnType("text[]");
            e.Property(u => u.Ativo).HasDefaultValue(true);
            e.Property(u => u.CreatedAt);
            e.Property(u => u.Cargo).HasMaxLength(120);
            e.Property(u => u.Departamento).HasMaxLength(120);
            e.Property(u => u.Cpf).HasMaxLength(20);
            e.Property(u => u.Rg).HasMaxLength(20);
            e.Property(u => u.Telefone).HasMaxLength(30);
            e.Property(u => u.DataAdmissao).HasMaxLength(10);
            e.Property(u => u.Cidade).HasMaxLength(120).HasDefaultValue(string.Empty);
            e.OwnsOne(u => u.Endereco, b => b.ToJson());
            e.OwnsOne(u => u.Banco, b => b.ToJson());
            e.Property(u => u.ConviteTokenHash).HasMaxLength(64).HasDefaultValue(string.Empty);
            e.Property(u => u.ConviteEmail).HasMaxLength(300).HasDefaultValue(string.Empty);
            e.HasIndex(u => u.ConviteTokenHash);
        });

        modelBuilder.Entity<PagamentoBancario>(e =>
        {
            e.ToTable("pagamentos_bancarios");
            e.HasKey(p => p.Id);
            e.Property(p => p.Situacao).IsRequired().HasMaxLength(30);
            e.Property(p => p.Chave).HasMaxLength(80);
            // Boleto (aditivo): os Pix que já existem ficam "pix" e sem código.
            e.Property(p => p.Forma).IsRequired().HasMaxLength(10).HasDefaultValue(PagamentoBancario.FormaPix);
            e.Property(p => p.CodigoBarras).IsRequired().HasMaxLength(48).HasDefaultValue(string.Empty);
            e.Property(p => p.VencimentoBoleto).IsRequired().HasMaxLength(10).HasDefaultValue(string.Empty);
            e.Property(p => p.Beneficiario).IsRequired().HasMaxLength(200).HasDefaultValue(string.Empty);
            e.Property(p => p.Descricao).HasMaxLength(140);
            e.Property(p => p.Mensagem).HasMaxLength(500);
            e.Ignore(p => p.Vigente);
            e.Ignore(p => p.EmAberto);
            e.HasIndex(p => p.MovimentoId);
            e.HasIndex(p => new { p.IntegracaoId, p.IdBanco });
        });

        modelBuilder.Entity<ConfiguracaoSmtp>(e =>
        {
            e.ToTable("configuracao_smtp");
            e.HasKey(c => c.Id);
            e.Property(c => c.Host).HasMaxLength(200);
            e.Property(c => c.Seguranca).HasMaxLength(10);
            e.Property(c => c.RemetenteEmail).HasMaxLength(200);
        });

        modelBuilder.Entity<EmailEnviado>(e =>
        {
            e.ToTable("emails_enviados");
            e.HasKey(x => x.Id);
            e.Property(x => x.Assunto).HasMaxLength(300);
            e.Property(x => x.Erro).HasMaxLength(500);
            e.HasIndex(x => x.Em);
            e.HasIndex(x => new { x.Origem, x.OrigemId });
        });

        modelBuilder.Entity<DocumentoFaturavel>(e =>
        {
            e.ToTable("documentos_faturaveis");
            e.HasKey(d => d.Id);
            e.Property(d => d.Id).HasMaxLength(40);
            e.Property(d => d.Tipo).IsRequired().HasMaxLength(10);
            e.Property(d => d.Situacao).IsRequired().HasMaxLength(20);
            e.Property(d => d.Chave).HasMaxLength(44);
            e.Property(d => d.Motivo).HasMaxLength(300);
            e.Property(d => d.Descricao).HasMaxLength(400);
            e.OwnsOne(d => d.Detalhe, b =>
            {
                b.ToJson();
                b.OwnsMany(x => x.Nfs);
            });
            e.HasIndex(d => d.CriadoEm);
            e.HasIndex(d => d.FaturaId);
        });

        modelBuilder.Entity<FaturaCliente>(e =>
        {
            e.ToTable("faturas_clientes");
            e.HasKey(f => f.Id);
            e.Property(f => f.EmpresaId).IsRequired().HasMaxLength(80);
            e.Property(f => f.ClienteId).HasMaxLength(80);
            e.Property(f => f.Tipo).IsRequired().HasMaxLength(10);
            e.Property(f => f.Situacao).IsRequired().HasMaxLength(20);
            e.Property(f => f.Observacao).HasMaxLength(500);
            e.Property(f => f.MotivoCancelamento).HasMaxLength(300);
            e.OwnsOne(f => f.Cliente, b => b.ToJson());
            e.OwnsMany(f => f.Documentos, b =>
            {
                b.ToJson();
                b.OwnsMany(x => x.Nfs);
            });
            e.OwnsMany(f => f.Envios, b => b.ToJson());
            e.OwnsMany(f => f.Eventos, b => b.ToJson());
            // Um número por empresa (a sequência continua a da SIIMP).
            e.HasIndex(f => new { f.EmpresaId, f.Numero }).IsUnique();
            e.HasIndex(f => f.ClienteId);
            e.HasIndex(f => f.Emissao);
        });

        modelBuilder.Entity<NumeracaoDocumento>(e =>
        {
            e.ToTable("numeracoes_documentos");
            e.HasKey(n => n.Id);
            e.Property(n => n.Id).HasMaxLength(120);
            e.Property(n => n.EmpresaId).IsRequired().HasMaxLength(80);
            e.Property(n => n.Tipo).IsRequired().HasMaxLength(10);
            e.Property(n => n.Serie).HasMaxLength(10);
            e.HasIndex(n => n.EmpresaId);
        });

        modelBuilder.Entity<FaturaSiimpLida>(e =>
        {
            e.ToTable("faturas_siimp_lidas");
            e.HasKey(f => f.Id);
            e.Property(f => f.Documentos).HasColumnType("text[]");
        });

        modelBuilder.Entity<PessoaSiimpLida>(e =>
        {
            e.ToTable("pessoas_siimp_lidas");
            e.HasKey(p => p.Id);
        });

        modelBuilder.Entity<Apolice>(e =>
        {
            e.ToTable("apolices");
            e.HasKey(a => a.Id);
            e.Property(a => a.SeguradoraId).IsRequired().HasMaxLength(80);
            e.Property(a => a.Tipo).IsRequired().HasMaxLength(20);
            e.Property(a => a.Numero).HasMaxLength(60);
            e.Property(a => a.VigenciaInicio).HasMaxLength(10);
            e.Property(a => a.VigenciaFim).HasMaxLength(10);
            e.Property(a => a.Observacao).HasMaxLength(400);
            e.Property(a => a.EmpresaIds).HasColumnType("text[]");
            e.Property(a => a.Documentos).HasColumnType("text[]");
            e.OwnsMany(a => a.Taxas, b => b.ToJson());
            e.HasIndex(a => a.SeguradoraId);
        });

        modelBuilder.Entity<Feriado>(e =>
        {
            e.ToTable("feriados");
            e.HasKey(f => f.Id);
            e.Property(f => f.Data).IsRequired().HasMaxLength(10);
            e.Property(f => f.Nome).IsRequired().HasMaxLength(120);
        });

        modelBuilder.Entity<AliquotaIcms>(e =>
        {
            e.ToTable("aliquotas_icms");
            e.HasKey(a => a.Id);
            e.Property(a => a.Id).HasMaxLength(5);
            e.Property(a => a.UfOrigem).IsRequired().HasMaxLength(2);
            e.Property(a => a.UfDestino).IsRequired().HasMaxLength(2);
            e.Property(a => a.Fundamentacao).HasMaxLength(400);
        });

        modelBuilder.Entity<Taxa>(e =>
        {
            e.ToTable("taxas");
            e.HasKey(t => t.Id);
        });

        modelBuilder.Entity<PlanoConta>(e =>
        {
            e.ToTable("plano_contas");
            e.HasKey(p => p.Id);
        });

        modelBuilder.Entity<CustoFixo>(e =>
        {
            e.ToTable("custos_fixos");
            e.HasKey(c => c.Id);
            e.Property(c => c.VencimentoDiaUtil).IsRequired().HasMaxLength(10).HasDefaultValue(string.Empty);
            // Número da despesa: o banco gera (sequência); o repositório preserva na alteração.
            e.Property(c => c.Numero).HasDefaultValueSql("nextval('custos_fixos_numero_seq')");
            e.HasIndex(c => c.Numero).IsUnique();
            // Rateio entre empresas: lista {empresa, fração} em JSON; vazia = a despesa é toda de quem paga.
            e.OwnsMany(c => c.Rateio, b => b.ToJson());
            e.Ignore(c => c.Rateada);
        });

        modelBuilder.Entity<Empresa>(e =>
        {
            e.ToTable("empresas");
            e.HasKey(x => x.Id);
            e.Property(x => x.PropostaPrefixo).HasMaxLength(15).HasDefaultValue(string.Empty);
            e.Property(x => x.ContratoPrefixo).HasMaxLength(15).HasDefaultValue(string.Empty);
            e.Property(x => x.ContratoDigitos).HasDefaultValue(4);
            e.Property(x => x.PropostaDigitos).HasDefaultValue(4);
            e.Property(x => x.InscricaoMunicipal).HasMaxLength(20).HasDefaultValue(string.Empty);
            e.Property(x => x.InscricaoEstadual).HasMaxLength(20).HasDefaultValue(string.Empty);
            e.OwnsOne(x => x.EnderecoCompleto, b => b.ToJson());
            e.OwnsOne(x => x.Faturamento, b => b.ToJson());
            e.OwnsMany(x => x.ValidadesProposta, b => b.ToJson());
            e.Property(x => x.SimplesAnexo).HasMaxLength(5).HasDefaultValue(string.Empty);
            // Estruturas aninhadas → colunas JSON (jsonb) espelhando o shape do front.
            e.OwnsOne(x => x.Dv, b =>
            {
                b.ToJson();
                // "+ Outras despesas" aninhadas no mesmo JSON da DV.
                b.OwnsMany(d => d.Outras);
                b.Ignore(d => d.OutrasTotal);
            });
            e.OwnsOne(x => x.Ir, b => b.ToJson());
            e.OwnsOne(x => x.Csll, b => b.ToJson());
            e.OwnsOne(x => x.Inss, b => b.ToJson());
            e.OwnsOne(x => x.Pis, b => b.ToJson());
            e.OwnsOne(x => x.Cofins, b => b.ToJson());
            e.OwnsOne(x => x.Iss, b => b.ToJson());
            e.OwnsMany(x => x.Icms, b => b.ToJson());
            e.OwnsOne(x => x.Banco, b => b.ToJson());
        });

        // ── NFS-e (motor de emissão) ──
        modelBuilder.Entity<NotaFiscalServico>(e =>
        {
            e.ToTable("notas_fiscais_servico");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(40);
            e.Property(x => x.Situacao).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.Pedido).HasColumnType("jsonb");
            e.Property(x => x.Provedor).HasMaxLength(20);
            e.Property(x => x.IdEmpresaProvedor).HasMaxLength(100);
            e.Property(x => x.IdProvedor).HasMaxLength(100);
            e.Property(x => x.Ambiente).HasMaxLength(30);
            e.Property(x => x.EtapaProvedor).HasMaxLength(60);
            e.Property(x => x.Mensagem).HasMaxLength(2000);
            e.Property(x => x.Numero).HasMaxLength(60);
            e.Property(x => x.CodigoVerificacao).HasMaxLength(100);
            e.Property(x => x.SerieRps).HasMaxLength(10);
            e.Property(x => x.NumeroRps).HasMaxLength(20);
            e.Property(x => x.TomadorNome).HasMaxLength(200);
            e.Property(x => x.TomadorDocumento).HasMaxLength(20);
            e.Property(x => x.Descricao).HasMaxLength(300);
            e.Property(x => x.OrigemTipo).HasMaxLength(40);
            e.Property(x => x.OrigemId).HasMaxLength(60);
            e.Property(x => x.CriadaPor).HasMaxLength(200);
            e.Property(x => x.CanceladaPor).HasMaxLength(200);
            e.Property(x => x.MotivoCancelamento).HasMaxLength(500);
            e.Ignore(x => x.EmAndamento);
            e.Ignore(x => x.TemArquivos);
            e.HasIndex(x => new { x.EmpresaId, x.CriadaEm });
            e.HasIndex(x => new { x.Provedor, x.IdProvedor });
            e.HasIndex(x => new { x.Situacao, x.ProximaConsultaEm });
            e.HasIndex(x => new { x.OrigemTipo, x.OrigemId });
        });

        modelBuilder.Entity<ConfiguracaoFiscalEmpresa>(e =>
        {
            e.ToTable("configuracoes_fiscais");
            e.HasKey(x => x.Id);
            e.Property(x => x.Provedor).HasMaxLength(20);
            e.Property(x => x.IdEmpresaProvedor).HasMaxLength(100);
        });

        modelBuilder.Entity<AvisoNfseRecebido>(e =>
        {
            e.ToTable("avisos_nfse");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(120);
            e.Property(x => x.Provedor).HasMaxLength(20);
            e.HasIndex(x => x.RecebidoEm);
        });

        modelBuilder.Entity<RegistroErro>(e =>
        {
            e.ToTable("registro_erros");
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Em);
            e.Property(x => x.Tipo).HasMaxLength(20);
            e.Property(x => x.Metodo).HasMaxLength(10);
            e.Property(x => x.Rota).HasMaxLength(300);
            e.Property(x => x.Mensagem).HasMaxLength(1000);
            e.Property(x => x.Detalhe).HasMaxLength(4000);
            e.Property(x => x.Usuario).HasMaxLength(200);
            e.Property(x => x.Rastreio).HasMaxLength(100);
        });

        modelBuilder.Entity<CertificadoEmpresa>(e =>
        {
            e.ToTable("certificados_empresa");
            e.HasKey(x => x.EmpresaId);
            e.HasOne<Empresa>().WithOne().HasForeignKey<CertificadoEmpresa>(x => x.EmpresaId).OnDelete(DeleteBehavior.Cascade);
            e.Property(x => x.NomeArquivo).HasMaxLength(200);
            e.Property(x => x.Titular).HasMaxLength(300);
            e.Property(x => x.Cnpj).HasMaxLength(14);
            e.Property(x => x.Emissor).HasMaxLength(300);
            e.Property(x => x.Impressao).HasMaxLength(64);
            e.Property(x => x.EnviadoPor).HasMaxLength(200);
        });

        modelBuilder.Entity<Proposta>(e =>
        {
            e.ToTable("propostas");
            e.HasKey(p => p.Id);
            e.OwnsMany(p => p.Itens, b =>
            {
                b.ToJson();
                // Custos do item aninhados no mesmo JSON.
                b.OwnsMany(i => i.Custos);
                // Retratos do Pricing parametrizável (dados da operação e fichas técnicas).
                b.OwnsMany(i => i.DadosOperacao);
                b.OwnsMany(i => i.Fichas, f => f.OwnsMany(x => x.Composicao));
            });
            e.OwnsMany(p => p.Aprovacoes, b => b.ToJson());
            // O número nunca repete (prefixos diferentes por empresa + contador atômico; o índice é a garantia final).
            e.Property(p => p.Numero).HasMaxLength(40);
            e.HasIndex(p => p.Numero).IsUnique();
        });

        modelBuilder.Entity<NumeracaoProposta>(e =>
        {
            e.ToTable("proposta_numeracao");
            e.HasKey(n => n.EmpresaId);
            e.Property(n => n.EmpresaId).HasMaxLength(80);
        });

        modelBuilder.Entity<Meta>(e =>
        {
            e.ToTable("metas");
            e.HasKey(m => m.Id);
            e.Property(m => m.EmpresaId).HasMaxLength(80).HasDefaultValue(string.Empty);
            // 12 valores (jan–dez) → numeric[] nativo do Postgres.
            e.Property(m => m.ValoresMensais).HasColumnType("numeric(18,6)[]");
            e.Property(m => m.Principal).HasDefaultValue(false);
            e.Ignore(m => m.TotalDoAno);
            e.Ignore(m => m.UsaMedia);
            // Base do preço: média mensal do ano (decisão de 13/10: inclusive as metas que já existiam).
            e.Property(m => m.BasePreco).HasMaxLength(20).HasDefaultValue(Meta.BaseMedia);
            e.Property(m => m.EntradaMeses).HasMaxLength(20).HasDefaultValue("valor");
            e.Property(m => m.OrigemAnual).HasMaxLength(20).HasDefaultValue(Meta.AnualValor);
            e.HasIndex(m => new { m.EmpresaId, m.Ano });
        });

        modelBuilder.Entity<ModeloProposta>(e =>
        {
            e.ToTable("modelos_proposta");
            e.HasKey(m => m.Id);
            e.OwnsMany(m => m.Paginas, b =>
            {
                b.ToJson();
                b.OwnsMany(p => p.Itens);
            });
        });

        modelBuilder.Entity<Cidade>(e =>
        {
            e.ToTable("cidades");
            e.HasKey(c => c.Id);
            e.Property(c => c.Nome).IsRequired().HasMaxLength(120);
            e.Property(c => c.Uf).IsRequired().HasMaxLength(2);
            e.Property(c => c.Busca).IsRequired().HasMaxLength(120);
            e.HasIndex(c => c.Busca);
        });

        modelBuilder.Entity<Servico>(e =>
        {
            e.ToTable("servicos");
            e.HasKey(s => s.Id);
            e.OwnsMany(s => s.Fiscais, b => b.ToJson());
            e.OwnsMany(s => s.Impostos, b => b.ToJson());
        });

        modelBuilder.Entity<TipoCusto>(e =>
        {
            e.ToTable("tipos_custo");
            e.HasKey(t => t.Id);
        });

        // ── Motor de bancos ──
        modelBuilder.Entity<IntegracaoBancaria>(e =>
        {
            e.ToTable("integracoes_bancarias");
            e.HasKey(i => i.Id);
            e.Property(i => i.EmpresaId).IsRequired().HasMaxLength(80);
            e.Property(i => i.Banco).IsRequired().HasMaxLength(30);
            e.Property(i => i.Ambiente).HasMaxLength(20);
            e.Property(i => i.Recursos).HasColumnType("text[]");
            e.Property(i => i.CarteiraId).HasMaxLength(80).HasDefaultValue(string.Empty);
            e.OwnsOne(i => i.Boleto, b => b.ToJson());
            e.Ignore(i => i.RegrasDoBoleto);
            e.HasIndex(i => new { i.EmpresaId, i.Banco }).IsUnique();
        });

        // ── Contratos, faturas e projeção (estruturas da pasta em JSON) ──
        modelBuilder.Entity<ModeloContrato>(e =>
        {
            e.ToTable("modelos_contrato");
            e.HasKey(m => m.Id);
            e.OwnsMany(m => m.Campos, b => b.ToJson());
            e.OwnsMany(m => m.Componentes, b => b.ToJson());
        });

        modelBuilder.HasSequence<long>("contratos_numero_seq");
        modelBuilder.Entity<Contrato>(e =>
        {
            e.ToTable("contratos");
            e.HasKey(c => c.Id);
            e.Property(c => c.Numero).HasMaxLength(40);
            e.HasIndex(c => c.Numero).IsUnique();
            e.HasIndex(c => c.ClienteId);
            e.OwnsMany(c => c.Escopo, b =>
            {
                b.ToJson();
                b.OwnsMany(v => v.Itens);
            });
            e.OwnsOne(c => c.Condicoes, b => b.ToJson());
            e.OwnsMany(c => c.Caracteristicas, b => b.ToJson());
            e.OwnsMany(c => c.Componentes, b => b.ToJson());
            e.OwnsMany(c => c.Extras, b =>
            {
                b.ToJson();
                b.Ignore(x => x.Valor);
            });
            e.OwnsMany(c => c.Documentos, b => b.ToJson());
            e.OwnsMany(c => c.Eventos, b => b.ToJson());
            e.Ignore(c => c.Spot);
            e.Ignore(c => c.PorDocumento);
        });

        modelBuilder.Entity<NumeracaoContrato>(e =>
        {
            e.ToTable("contrato_numeracao");
            e.HasKey(n => n.EmpresaId);
            e.Property(n => n.EmpresaId).HasMaxLength(80);
        });

        modelBuilder.Entity<Fatura>(e =>
        {
            e.ToTable("faturas");
            e.HasKey(f => f.Id);
            // A mesma fatura (mês, período, documento) nunca aparece duas vezes no contrato.
            e.HasIndex(f => new { f.ContratoId, f.Chave }).IsUnique();
            e.HasIndex(f => f.Competencia);
            e.Property(f => f.ExtrasFora).HasColumnType("text[]");
            e.OwnsMany(f => f.Composicao, b => b.ToJson());
            e.OwnsMany(f => f.Documentos, b => b.ToJson());
            e.OwnsMany(f => f.Extras, b =>
            {
                b.ToJson();
                b.Ignore(x => x.Valor);
            });
            e.OwnsMany(f => f.Versoes, b => b.ToJson());
            e.Ignore(f => f.Travada);
        });

        modelBuilder.Entity<CenarioProjecao>(e =>
        {
            e.ToTable("cenarios_projecao");
            e.HasKey(c => c.Id);
            e.OwnsMany(c => c.Hipoteses, b => b.ToJson());
            e.Property(c => c.Sensibilidade).HasDefaultValue(0m);
        });

        modelBuilder.Entity<CobrancaBancaria>(e =>
        {
            e.ToTable("cobrancas_bancarias");
            e.HasKey(c => c.Id);
            e.Property(c => c.EmpresaId).IsRequired().HasMaxLength(80);
            e.Property(c => c.SeuNumero).IsRequired().HasMaxLength(15);
            e.Property(c => c.Situacao).HasMaxLength(20);
            // O seu número nunca repete na empresa (o banco usa como referência nossa).
            e.HasIndex(c => new { c.EmpresaId, c.SeuNumero }).IsUnique();
            e.HasIndex(c => new { c.OrigemTipo, c.OrigemId });
            e.HasIndex(c => c.IdBanco);
        });

        modelBuilder.Entity<Motorista>(e =>
        {
            e.ToTable("motoristas");
            e.HasKey(m => m.Id);
            e.Property(m => m.Nome).IsRequired().HasMaxLength(160);
            e.Property(m => m.Cpf).HasMaxLength(14);
            e.HasIndex(m => m.Cpf);
            e.OwnsOne(m => m.Endereco, b => b.ToJson());
            e.OwnsMany(m => m.Referencias, b => b.ToJson());
        });

        modelBuilder.Entity<ConfiguracaoSistema>(e =>
        {
            e.ToTable("configuracao_sistema");
            e.HasKey(c => c.Id);
            e.Property(c => c.MenusDesligados).HasColumnType("text[]");
        });

        modelBuilder.Entity<Veiculo>(e =>
        {
            e.ToTable("veiculos");
            e.HasKey(v => v.Id);
            e.Property(v => v.PlacaTracao).IsRequired().HasMaxLength(10);
            e.Property(v => v.PlacaReboque).HasMaxLength(10);
            e.Ignore(v => v.Nome);
            e.HasIndex(v => v.PlacaTracao);
        });

        modelBuilder.Entity<ConexaoGoogle>(e =>
        {
            e.ToTable("conexoes_google");
            e.HasKey(c => c.Id);
            e.Property(c => c.UsuarioId).IsRequired().HasMaxLength(80);
            // Uma conexão por usuário (desconectar inativa; conectar de novo reaproveita).
            e.HasIndex(c => c.UsuarioId).IsUnique();
        });

        modelBuilder.Entity<VinculoGoogle>(e =>
        {
            e.ToTable("vinculos_google");
            e.HasKey(v => v.Id);
            e.Property(v => v.Origem).IsRequired().HasMaxLength(20);
            e.Property(v => v.OrigemId).IsRequired().HasMaxLength(80);
            e.HasIndex(v => new { v.Origem, v.OrigemId }).IsUnique();
            e.HasIndex(v => v.GoogleEventId);
        });

        modelBuilder.Entity<Compromisso>(e =>
        {
            e.ToTable("compromissos");
            e.HasKey(c => c.Id);
            e.Property(c => c.Titulo).IsRequired().HasMaxLength(160);
            e.Property(c => c.Tipo).IsRequired().HasMaxLength(20);
            e.Property(c => c.Inicio).IsRequired().HasMaxLength(16);
            e.Property(c => c.Fim).IsRequired().HasMaxLength(16);
            e.Property(c => c.Descricao).HasMaxLength(2000);
            e.Property(c => c.Convidados).HasColumnType("text[]");
            e.Property(c => c.LinkReuniao).HasMaxLength(300);
            // A Agenda busca por período e por dono.
            e.HasIndex(c => c.Inicio);
            e.HasIndex(c => c.ResponsavelId);
        });

        modelBuilder.Entity<ValidadeProposta>(e =>
        {
            e.ToTable("validades_proposta");
            e.HasKey(v => v.Id);
        });

        modelBuilder.Entity<CategoriaCusto>(e =>
        {
            e.ToTable("categorias_custo");
            e.HasKey(c => c.Id);
            e.Property(c => c.Nome).IsRequired().HasMaxLength(120);
        });

        modelBuilder.Entity<RegraAprovacao>(e =>
        {
            e.ToTable("regras_aprovacao");
            e.HasKey(r => r.Id);
            e.Property(r => r.Nome).IsRequired().HasMaxLength(120);
            // Listas de ids → text[] nativo do Postgres.
            e.Property(r => r.Aprovadores).HasColumnType("text[]");
            e.Property(r => r.Excecoes).HasColumnType("text[]");
        });

        modelBuilder.Entity<Cliente>(e =>
        {
            e.ToTable("clientes");
            e.HasKey(c => c.Id);
            e.Property(c => c.Nome).IsRequired().HasMaxLength(160);
            // Contatos e dados bancários em JSON (jsonb), espelhando o shape do front.
            e.OwnsMany(c => c.Contatos, b => b.ToJson());
            e.OwnsOne(c => c.Banco, b => b.ToJson());
            e.OwnsOne(c => c.Endereco, b => b.ToJson());
            e.Property(c => c.VencimentoFimDeSemana).IsRequired().HasMaxLength(10).HasDefaultValue(VencimentoFimDeSemana.Manter);
        });

        modelBuilder.Entity<Fornecedor>(e =>
        {
            e.ToTable("fornecedores");
            e.HasKey(f => f.Id);
            e.Property(f => f.VencimentoFimDeSemana).IsRequired().HasMaxLength(10).HasDefaultValue(VencimentoFimDeSemana.Manter);
            e.Property(f => f.Nome).IsRequired().HasMaxLength(160);
            e.OwnsMany(f => f.Contatos, b => b.ToJson());
            e.OwnsOne(f => f.Banco, b => b.ToJson());
            e.OwnsOne(f => f.Endereco, b => b.ToJson());
            e.OwnsMany(f => f.Apolices, b =>
            {
                b.ToJson();
                b.OwnsMany(a => a.Taxas);
            });
            // Lista de ids → text[] nativo do Postgres.
            e.Property(f => f.Aprovadores).HasColumnType("text[]");
        });

        modelBuilder.Entity<Funil>(e =>
        {
            e.ToTable("funis");
            e.HasKey(f => f.Id);
            e.Property(f => f.Nome).IsRequired().HasMaxLength(120);
            e.OwnsMany(f => f.Etapas, b => b.ToJson());
            e.OwnsMany(f => f.CamposCustomizados, b => b.ToJson());
        });

        modelBuilder.Entity<Oportunidade>(e =>
        {
            e.ToTable("oportunidades");
            e.HasKey(o => o.Id);
            e.Property(o => o.Cliente).IsRequired().HasMaxLength(200);
            e.HasIndex(o => o.FunilId);
            e.OwnsMany(o => o.Anotacoes, b => b.ToJson());
            e.OwnsMany(o => o.CamposValores, b => b.ToJson());
        });

        modelBuilder.Entity<Anexo>(e =>
        {
            e.ToTable("anexos");
            e.HasKey(a => a.Id);
            e.Property(a => a.Entidade).IsRequired().HasMaxLength(40);
            e.Property(a => a.EntidadeId).IsRequired().HasMaxLength(80);
            e.Property(a => a.Nome).IsRequired().HasMaxLength(255);
            e.Property(a => a.Tipo).HasMaxLength(120);
            e.Property(a => a.Caminho).IsRequired().HasMaxLength(400);
            e.Property(a => a.EnviadoPor).HasMaxLength(160);
            e.Property(a => a.Em).HasMaxLength(40);
            e.HasIndex(a => new { a.Entidade, a.EntidadeId });
        });

        modelBuilder.Entity<RegistroAuditoria>(e =>
        {
            e.ToTable("auditoria");
            e.HasKey(a => a.Id);
            e.Property(a => a.Em).IsRequired().HasMaxLength(40);
            e.Property(a => a.UsuarioId).HasMaxLength(80);
            e.Property(a => a.UsuarioNome).HasMaxLength(160);
            e.Property(a => a.Acao).IsRequired().HasMaxLength(40);
            e.Property(a => a.Entidade).IsRequired().HasMaxLength(60);
            e.Property(a => a.EntidadeId).HasMaxLength(80);
            e.Property(a => a.Descricao).HasMaxLength(600);
            e.Property(a => a.Alteracoes).HasColumnType("jsonb");
            e.Property(a => a.Ip).HasMaxLength(60);
            e.HasIndex(a => a.Em);
            e.HasIndex(a => new { a.Entidade, a.EntidadeId });
            e.HasIndex(a => a.UsuarioId);
        });

        // ── Cadastros parametrizáveis: tudo em LINHAS (campo novo = linha nova, nunca coluna nova) ──
        modelBuilder.Entity<CampoOperacao>(e =>
        {
            e.ToTable("campos_operacao");
            e.HasKey(c => c.Id);
            e.Property(c => c.EmpresaId).IsRequired().HasMaxLength(80);
            e.Property(c => c.Nome).IsRequired().HasMaxLength(120);
            e.Property(c => c.Chave).IsRequired().HasMaxLength(80);
            e.Property(c => c.Tipo).IsRequired().HasMaxLength(20);
            e.Property(c => c.Efeito).IsRequired().HasMaxLength(20);
            e.Property(c => c.Cadastro).HasMaxLength(20);
            e.Property(c => c.Ajuda).HasMaxLength(400);
            e.Property(c => c.Opcoes).HasColumnType("text[]");
            e.Property(c => c.TipoOperacaoId).HasMaxLength(80).HasDefaultValue(string.Empty);
            e.Property(c => c.Seguro).HasMaxLength(20).HasDefaultValue(string.Empty);
            e.Property(c => c.PercentualFixo).HasPrecision(9, 6).HasDefaultValue(0m);
            e.Property(c => c.CampoBase).HasMaxLength(80).HasDefaultValue(string.Empty);
            e.Property(c => c.CampoOrigem).HasMaxLength(80).HasDefaultValue(string.Empty);
            e.Property(c => c.CampoDestino).HasMaxLength(80).HasDefaultValue(string.Empty);
            e.HasIndex(c => new { c.EmpresaId, c.Ordem });
        });

        modelBuilder.Entity<TipoOperacao>(e =>
        {
            e.ToTable("tipos_operacao");
            e.HasKey(t => t.Id);
            e.Property(t => t.EmpresaId).IsRequired().HasMaxLength(80);
            e.Property(t => t.Nome).IsRequired().HasMaxLength(80);
            e.HasIndex(t => new { t.EmpresaId, t.Ordem });
        });

        modelBuilder.Entity<FichaGrupo>(e =>
        {
            e.ToTable("ficha_grupos");
            e.HasKey(g => g.Id);
            e.Property(g => g.EmpresaId).IsRequired().HasMaxLength(80);
            e.Property(g => g.Nome).IsRequired().HasMaxLength(120);
            e.HasIndex(g => new { g.EmpresaId, g.Ordem });
        });

        modelBuilder.Entity<FichaColuna>(e =>
        {
            e.ToTable("ficha_colunas");
            e.HasKey(c => c.Id);
            e.Property(c => c.EmpresaId).IsRequired().HasMaxLength(80);
            e.Property(c => c.GrupoId).IsRequired().HasMaxLength(80).HasDefaultValue(string.Empty);
            e.Property(c => c.Nome).IsRequired().HasMaxLength(120);
            e.Property(c => c.Chave).IsRequired().HasMaxLength(80);
            e.Property(c => c.Tipo).IsRequired().HasMaxLength(20);
            e.Property(c => c.Base).HasMaxLength(80);
            e.Property(c => c.Formula).HasMaxLength(500);
            e.Property(c => c.Opcoes).HasColumnType("text[]");
            e.HasIndex(c => new { c.EmpresaId, c.Ordem });
        });

        modelBuilder.Entity<FichaTecnica>(e =>
        {
            e.ToTable("fichas_tecnicas");
            e.HasKey(f => f.Id);
            e.Property(f => f.EmpresaId).IsRequired().HasMaxLength(80);
            e.Property(f => f.GrupoId).IsRequired().HasMaxLength(80).HasDefaultValue(string.Empty);
            e.Property(f => f.Nome).IsRequired().HasMaxLength(160);
            e.HasIndex(f => new { f.EmpresaId, f.Ordem });
        });

        modelBuilder.Entity<FichaValor>(e =>
        {
            e.ToTable("ficha_valores");
            e.HasKey(v => v.Id);
            e.Property(v => v.FichaId).IsRequired().HasMaxLength(80);
            e.Property(v => v.ColunaId).IsRequired().HasMaxLength(80);
            e.Property(v => v.Texto).HasMaxLength(400);
            // Uma célula por ficha × coluna.
            e.HasIndex(v => new { v.FichaId, v.ColunaId }).IsUnique();
            e.HasIndex(v => v.ColunaId);
        });

        // ── Financeiro ──
        modelBuilder.Entity<Carteira>(e =>
        {
            e.ToTable("carteiras");
            e.HasKey(c => c.Id);
            e.Property(c => c.Nome).IsRequired().HasMaxLength(120);
        });

        modelBuilder.Entity<Movimento>(e =>
        {
            e.ToTable("movimentos");
            e.HasKey(m => m.Id);
            e.Ignore(m => m.PixSituacao);
            e.Ignore(m => m.PixData);
            e.Ignore(m => m.PixForma);
            // Número do lançamento (cada parcela tem o seu): o banco gera (sequência); o repositório
            // preserva na alteração.
            e.Property(m => m.Numero).HasDefaultValueSql("nextval('movimentos_numero_seq')");
            e.HasIndex(m => m.Numero).IsUnique();
            e.Property(m => m.Tipo).IsRequired().HasMaxLength(10);
            e.Property(m => m.Descricao).IsRequired().HasMaxLength(300);
            e.Property(m => m.ParceiroNome).HasMaxLength(200);
            e.Property(m => m.Aprovacao).IsRequired().HasMaxLength(12);
            e.Property(m => m.MotivoReprovacao).HasMaxLength(500);
            e.OwnsMany(m => m.Aprovacoes, b => b.ToJson());
            e.OwnsMany(m => m.ItensVariaveis, b => b.ToJson());
            e.Property(m => m.ValorVariavel).HasPrecision(18, 2).HasDefaultValue(0m);
            e.Ignore(m => m.Liquido);
            e.Ignore(m => m.ValorFixo);
            e.HasIndex(m => m.Vencimento);
            e.HasIndex(m => m.GrupoId);
            e.HasIndex(m => m.Aprovacao);
        });

        modelBuilder.Entity<ExtratoLinha>(e =>
        {
            e.ToTable("extrato_linhas");
            e.HasKey(l => l.Id);
            e.Property(l => l.MovimentoIds).HasColumnType("text[]").HasDefaultValueSql("'{}'::text[]");
            e.Property(l => l.CarteiraId).IsRequired().HasMaxLength(80);
            e.Property(l => l.Fitid).IsRequired().HasMaxLength(120);
            e.Property(l => l.Memo).HasMaxLength(400);
            // A mesma transação do banco nunca entra duas vezes na mesma carteira.
            e.HasIndex(l => new { l.CarteiraId, l.Fitid }).IsUnique();
            e.HasIndex(l => l.MovimentoId);
        });

        modelBuilder.Entity<RegraConciliacao>(e =>
        {
            e.ToTable("regras_conciliacao");
            e.HasKey(r => r.Id);
            e.Property(r => r.Padrao).IsRequired().HasMaxLength(120);
        });

        modelBuilder.Entity<Vendedor>(e =>
        {
            e.ToTable("vendedores");
            e.HasKey(v => v.Id);
            e.Property(v => v.Nome).IsRequired().HasMaxLength(160);
            e.OwnsOne(v => v.Banco, b => b.ToJson());
            e.OwnsMany(v => v.RegioesBloqueadas, b => b.ToJson());
        });
    }
}
