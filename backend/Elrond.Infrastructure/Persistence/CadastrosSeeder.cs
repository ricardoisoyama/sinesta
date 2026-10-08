using System.Text.Json;
using Elrond.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Elrond.Infrastructure.Persistence;

/// <summary>
/// Semeia os cadastros a partir de `seed.json` (gerado dos mocks do front) se a base estiver vazia.
/// Mantém os números idênticos aos da planilha/demo.
/// </summary>
public static class CadastrosSeeder
{
    private sealed class SeedData
    {
        public List<Taxa> Taxas { get; set; } = new();
        public List<PlanoConta> PlanoContas { get; set; } = new();
        public List<CustoFixo> CustosFixos { get; set; } = new();
        public List<Empresa> Empresas { get; set; } = new();
        public List<Proposta> Propostas { get; set; } = new();
        public List<Meta> Metas { get; set; } = new();
    }

    /// <param name="demo">false = modo cliente (não semeia cadastro nenhum).</param>
    public static async Task SeedAsync(AppDbContext db, bool demo)
    {
        // O funil padrão do CRM existe em qualquer modo (o cliente parametriza a partir dele).
        if (!await db.Funis.AnyAsync())
        {
            db.Funis.Add(FunilPadrao());
            await db.SaveChangesAsync();
        }

        if (!demo) return;

        var path = Path.Combine(AppContext.BaseDirectory, "seed.json");
        if (!File.Exists(path)) return;

        var json = await File.ReadAllTextAsync(path);
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var seed = JsonSerializer.Deserialize<SeedData>(json, options);
        if (seed is null) return;

        // Guarda por tabela: semeia só as vazias (permite adicionar novas tabelas depois).
        var changed = false;
        if (!await db.Taxas.AnyAsync()) { db.Taxas.AddRange(seed.Taxas); changed = true; }
        if (!await db.PlanoContas.AnyAsync()) { db.PlanoContas.AddRange(seed.PlanoContas); changed = true; }
        if (!await db.CustosFixos.AnyAsync()) { db.CustosFixos.AddRange(seed.CustosFixos); changed = true; }
        if (!await db.Empresas.AnyAsync()) { db.Empresas.AddRange(seed.Empresas); changed = true; }
        if (!await db.Propostas.AnyAsync()) { db.Propostas.AddRange(seed.Propostas); changed = true; }
        if (!await db.Metas.AnyAsync()) { db.Metas.AddRange(seed.Metas); changed = true; }
        if (!await db.ModelosProposta.AnyAsync()) { db.ModelosProposta.AddRange(ModelosPadrao()); changed = true; }
        if (!await db.Servicos.AnyAsync()) { db.Servicos.AddRange(ServicosPadrao()); changed = true; }
        if (!await db.TiposCusto.AnyAsync()) { db.TiposCusto.AddRange(TiposCustoPadrao()); changed = true; }
        if (!await db.ValidadesProposta.AnyAsync()) { db.ValidadesProposta.AddRange(ValidadesPadrao()); changed = true; }
        if (!await db.Clientes.AnyAsync()) { db.Clientes.AddRange(ClientesPadrao()); changed = true; }
        if (!await db.Fornecedores.AnyAsync()) { db.Fornecedores.AddRange(FornecedoresPadrao()); changed = true; }
        if (!await db.Vendedores.AnyAsync()) { db.Vendedores.AddRange(VendedoresPadrao()); changed = true; }

        if (changed) await db.SaveChangesAsync();

        // As categorias vêm da migration (valem também para base em branco). No modo
        // demo, liga cada uma à conta correspondente do plano de contas semeado.
        var semConta = await db.CategoriasCusto.Where(c => c.PlanoContaId == "").ToListAsync();
        var ligou = false;
        foreach (var cat in semConta)
        {
            var contaId = "pc-" + cat.Id.Replace("cat-", string.Empty);
            if (await db.PlanoContas.AnyAsync(p => p.Id == contaId))
            {
                cat.PlanoContaId = contaId;
                ligou = true;
            }
        }
        if (ligou) await db.SaveChangesAsync();
    }

    /// <summary>Funil "Comercial" com as etapas que o cliente aprovou no layout.</summary>
    private static Funil FunilPadrao() => new()
    {
        Id = "funil-padrao",
        Nome = "Comercial",
        HorasAlerta = 48,
        Etapas = new List<EtapaFunil>
        {
            new() { Id = "novo", Nome = "Novo lead", Cor = "#8a97a0", Tipo = "normal" },
            new() { Id = "contato", Nome = "Contato feito", Cor = "#3a7d9a", Tipo = "normal" },
            new() { Id = "cotacao", Nome = "Cotação enviada", Cor = "#e8702f", Tipo = "normal" },
            new() { Id = "negociacao", Nome = "Negociação", Cor = "#b5651d", Tipo = "normal" },
            new() { Id = "ganho", Nome = "Ganho", Cor = "#2e7d44", Tipo = "ganho" },
            new() { Id = "perdido", Nome = "Perdido", Cor = "#c0392b", Tipo = "perdido" },
        },
    };

    // Exemplos genéricos de serviços (o ELROND precifica serviços; transporte é o EREBOR).
    private static IEnumerable<Servico> ServicosPadrao() => new[]
    {
        new Servico { Id = "srv-consultoria", Nome = "Consultoria mensal" },
        new Servico { Id = "srv-suporte", Nome = "Suporte técnico" },
        new Servico { Id = "srv-treinamento", Nome = "Treinamento de equipe" },
    };

    private static IEnumerable<TipoCusto> TiposCustoPadrao() => new[]
    {
        new TipoCusto { Id = "tc-mao-de-obra", Nome = "Mão de obra" },
        new TipoCusto { Id = "tc-deslocamento", Nome = "Deslocamento" },
        new TipoCusto { Id = "tc-material", Nome = "Material" },
        new TipoCusto { Id = "tc-terceiros", Nome = "Serviços de terceiros" },
    };

    private static IEnumerable<ValidadeProposta> ValidadesPadrao() => new[]
    {
        new ValidadeProposta { Id = "val-10", Descricao = "10 dias" },
        new ValidadeProposta { Id = "val-15", Descricao = "15 dias" },
        new ValidadeProposta { Id = "val-30", Descricao = "30 dias" },
    };

    private static IEnumerable<Cliente> ClientesPadrao() => new[]
    {
        new Cliente
        {
            Id = "cli-alfa", Nome = "Alfa Serviços Ltda", NomeFantasia = "Alfa Serviços",
            CpfCnpj = "12345678000190", Contato = "Marcos Lima", Telefone = "(11) 3000-1000",
            Email = "contato@alfaservicos.com.br", Cidade = "São Paulo - SP",
        },
        new Cliente
        {
            Id = "cli-beta", Nome = "Beta Tecnologia S.A.", NomeFantasia = "Beta Tech",
            CpfCnpj = "98765432000110", Contato = "Renata Souza", Telefone = "(11) 3000-2000",
            Email = "compras@betatech.com.br", Cidade = "Campinas - SP",
        },
    };

    private static IEnumerable<Fornecedor> FornecedoresPadrao() => new[]
    {
        new Fornecedor
        {
            Id = "for-contabil", Nome = "Contabilidade Ativa Ltda", NomeFantasia = "Contabilidade Ativa",
            CpfCnpj = "11222333000181", Telefone = "(11) 4000-1000",
            Email = "atendimento@contabilidadeativa.com.br", Cidade = "São Paulo - SP",
        },
        new Fornecedor
        {
            Id = "for-softline", Nome = "Softline Sistemas Ltda", NomeFantasia = "Softline",
            CpfCnpj = "22333444000172", Telefone = "(11) 4000-2000",
            Email = "suporte@softline.com.br", Cidade = "São Paulo - SP",
        },
    };

    private static IEnumerable<Vendedor> VendedoresPadrao() => new[]
    {
        new Vendedor
        {
            Id = "vnd-ana", Tipo = "fisica", Nome = "Ana Paula Ferreira",
            Telefone = "(11) 90000-1000", Email = "ana.ferreira@sinesta.com.br",
            Cidade = "São Paulo - SP", ComissaoPercentual = 0.015m, ComissaoBase = "preco",
        },
    };

    /// <summary>Um modelo de proposta padrão por empresa, com as páginas do PPT.</summary>
    private static IEnumerable<ModeloProposta> ModelosPadrao()
    {
        foreach (var empresaId in new[] { "matriz", "filial-02" })
        {
            yield return new ModeloProposta
            {
                Id = $"modelo-padrao-{empresaId}",
                EmpresaId = empresaId,
                Nome = "Padrão",
                Cor = "#e8702f",
                RodapeEmpresa = "Sinesta | Logística e Armazenagem",
                Responsavel = "Ricardo",
                Email = "financeiro@sinesta.com.br",
                Telefone = "(11) 0000-0000",
                Site = "www.sinesta.com.br",
                Paginas = new List<Pagina>
                {
                    new() { Id = "p1", Tipo = "capa", Titulo = "Proposta Comercial", Subtitulo = "Logística e Armazenagem" },
                    new()
                    {
                        Id = "p2", Tipo = "conteudo", Titulo = "Objetivo",
                        Conteudo = "<p>Apresentar a solução, a composição comercial, as premissas e os próximos passos para validação da operação, com previsibilidade e controle.</p>",
                    },
                    new() { Id = "p3", Tipo = "composicao", Titulo = "Composição comercial" },
                    new()
                    {
                        Id = "p4", Tipo = "conteudo", Titulo = "Condições comerciais",
                        Conteudo = "<p><strong>Validade:</strong> 10 dias a partir do envio.</p><p><strong>Tributação:</strong> sujeita às alíquotas vigentes.</p><p><strong>Observação:</strong> valores podem variar conforme as informações finais da operação. Alterações de rota, volume, prazo ou documentação podem exigir revisão da composição comercial.</p>",
                    },
                    new()
                    {
                        Id = "p5", Tipo = "conteudo", Titulo = "Próximos passos",
                        Conteudo = "<ol><li>Validação da proposta pelo cliente.</li><li>Alinhamento operacional e documentação.</li><li>Início da operação.</li></ol>",
                    },
                },
            };
        }
    }
}
