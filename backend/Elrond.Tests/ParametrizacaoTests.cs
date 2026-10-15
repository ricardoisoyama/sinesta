using System.Linq.Expressions;
using System.Text.Json;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Application.Services;
using Elrond.Domain.Common;
using Elrond.Domain.Entities;
using Elrond.Domain.Regras;

namespace Elrond.Tests;

public class ParametrizacaoTests
{
    // ── Fórmula (espelho do front) ──

    [Fact]
    public void Formula_faz_contas_com_precedencia_percentual_e_virgula()
    {
        Assert.Equal(14m, Formula.Avaliar("2 + 3 * 4", new Dictionary<string, decimal>()).Valor);
        Assert.Equal(20m, Formula.Avaliar("(2 + 3) * 4", new Dictionary<string, decimal>()).Valor);
        Assert.Equal(1501m, Formula.Avaliar("1.500,50 + 0,5", new Dictionary<string, decimal>()).Valor);
        Assert.Equal(400m, Formula.Avaliar("2000 * 20%", new Dictionary<string, decimal>()).Valor);
        Assert.Equal(2516m, Formula.Avaliar("(salario_base + cargo_de_confianca) * 68%",
            new Dictionary<string, decimal> { ["salario_base"] = 2200m, ["cargo_de_confianca"] = 1500m }).Valor);
    }

    [Fact]
    public void Formula_explica_o_erro()
    {
        Assert.Contains("desconhecido", Formula.Avaliar("x * 2", new Dictionary<string, decimal>()).Erro);
        Assert.Contains("parêntese", Formula.Avaliar("(2 + 3", new Dictionary<string, decimal>()).Erro);
        Assert.Contains("zero", Formula.Avaliar("10 / 0", new Dictionary<string, decimal>()).Erro);
        Assert.Equal("cargo_de_confianca", Formula.ChaveDe("Cargo de confiança"));
        Assert.Equal("_1_turno", Formula.ChaveDe("1º turno"));
    }

    [Fact]
    public void Total_da_ficha_resolve_percentual_e_formula_em_qualquer_ordem()
    {
        var cols = new List<FichaColuna>
        {
            Col("enc", "Encargos", "calculo", formula: "(salario_base + adicional_noturno) * 50%"),
            Col("sal", "Salário base", "valor"),
            Col("adn", "Adicional noturno", "percentual", baseK: "salario_base"),
            Col("hrs", "Horas", "numero", compoe: false),
            Col("per", "Período", "lista"),
        };
        var valores = new Dictionary<string, FichaValor>
        {
            ["sal"] = new() { ColunaId = "sal", Numero = 2000m },
            ["adn"] = new() { ColunaId = "adn", Numero = 0.2m },
            ["hrs"] = new() { ColunaId = "hrs", Numero = 220m },
            ["per"] = new() { ColunaId = "per", Texto = "Noturno" },
        };
        // 2000 + 400 + (2400 × 50% = 1200); horas não compõe; período é texto.
        Assert.Equal(3600m, FichaCalculo.Total(cols, valores));
    }

    [Fact]
    public void Total_da_ficha_por_formula_ignora_a_soma_e_aceita_os_sinais_dos_botoes()
    {
        // Ficha de tecnologia: valor hora × horas (nenhuma coluna precisa estar marcada no total).
        var cols = new List<FichaColuna> { Col("vh", "Valor hora", "valor"), Col("hrs", "Horas", "numero", compoe: false) };
        var valores = new Dictionary<string, FichaValor>
        {
            ["vh"] = new() { ColunaId = "vh", Numero = 85.5m },
            ["hrs"] = new() { ColunaId = "hrs", Numero = 160m },
        };
        Assert.Equal(85.5m, FichaCalculo.Total(cols, valores));                      // soma das marcadas (só o valor hora)
        Assert.Equal(13680m, FichaCalculo.Total(cols, valores, "valor_hora * horas"));
        Assert.Equal(13680m, FichaCalculo.Total(cols, valores, "valor_hora × horas"));
        Assert.Equal(42.75m, FichaCalculo.Total(cols, valores, "valor_hora ÷ 2"));
        Assert.Equal(0m, FichaCalculo.Total(cols, valores, "valor_hora × coluna_que_nao_existe"));
    }

    [Fact]
    public void Total_da_ficha_zera_referencia_circular_sem_quebrar()
    {
        var cols = new List<FichaColuna> { Col("a", "A", "calculo", formula: "b + 1"), Col("b", "B", "calculo", formula: "a + 1"), Col("c", "C", "valor") };
        Assert.Equal(10m, FichaCalculo.Total(cols, new Dictionary<string, FichaValor> { ["c"] = new() { ColunaId = "c", Numero = 10m } }));
    }

    // ── Serviço (sincronização por empresa) ──

    [Fact]
    public async Task Campos_normaliza_tipo_efeito_chave_e_nao_apaga_o_que_nao_veio()
    {
        var (svc, campos, _, _, _, auditoria, _) = Montar();
        var r = await svc.SalvarCamposAsync("emp", new List<CampoOperacao>
        {
            new() { Id = "c1", Nome = "Qtd. de postos", Tipo = "numero", Efeito = "multiplica" },
            new() { Id = "c2", Nome = "Cidade", Tipo = "texto", Efeito = "soma-custo" }, // texto não soma: vira informativo
            new() { Id = "c3", Nome = "Cidade", Tipo = "lista", Opcoes = new() { " A ", "", "A", "B" } }, // chave repetida
            new() { Id = "c4", Nome = "   ", Tipo = "texto" }, // em digitação: não grava
        });
        Assert.True(r.IsSuccess);
        var lista = r.Value!;
        Assert.Equal(3, lista.Count);
        Assert.Equal("multiplica", lista[0].Efeito);
        Assert.Equal("qtd_de_postos", lista[0].Chave);
        Assert.Equal("informativo", lista[1].Efeito);
        Assert.Equal("cidade_2", lista[2].Chave);
        Assert.Equal(new List<string> { "A", "B" }, lista[2].Opcoes);

        // Segundo envio só com c1 inativado: c2 e c3 continuam lá (nada é apagado).
        await svc.SalvarCamposAsync("emp", new List<CampoOperacao> { new() { Id = "c1", Nome = "Qtd. de postos", Tipo = "numero", Efeito = "multiplica", Status = "inativo" } });
        Assert.Equal(3, campos.Itens.Count);
        Assert.Equal("inativo", campos.Itens.Single(c => c.Id == "c1").Status);
        Assert.Contains("inativar", auditoria.Acoes);
    }

    [Fact]
    public async Task Campos_de_uf_e_cidade_sao_aceitos_e_so_informam()
    {
        var (svc, _, _, _, _, _, _) = Montar();
        var r = await svc.SalvarCamposAsync("emp", new List<CampoOperacao>
        {
            new() { Id = "u", Nome = "UF de origem", Tipo = "uf", Efeito = "multiplica", Opcoes = new() { "x" } },
            new() { Id = "c", Nome = "Cidade de origem", Tipo = "cidade" },
        });
        Assert.True(r.IsSuccess);
        Assert.Equal(new[] { "uf", "cidade" }, r.Value!.Select(c => c.Tipo));
        Assert.All(r.Value!, c => Assert.Equal("informativo", c.Efeito));
        Assert.Empty(r.Value![0].Opcoes); // opções só valem para "lista"
    }

    [Fact]
    public async Task Tipos_de_operacao_separam_os_campos_e_a_chave_so_e_unica_dentro_do_tipo()
    {
        var (svc, campos, _, _, _, auditoria, _) = Montar();
        var r = await svc.SalvarDadosOperacaoAsync("emp", new DadosOperacaoDto(
            new List<TipoOperacao>
            {
                new() { Id = "tr", Nome = " Transporte " },
                new() { Id = "ar", Nome = "Armazenagem" },
                new() { Id = "novo", Nome = "  " }, // em digitação: não grava
            },
            new List<CampoOperacao>
            {
                new() { Id = "c1", TipoOperacaoId = "tr", Nome = "Origem" },
                new() { Id = "c2", TipoOperacaoId = "ar", Nome = "Origem" }, // mesmo nome em outro tipo: mesma chave
                new() { Id = "c3", TipoOperacaoId = "tr", Nome = "Origem" }, // repetido no mesmo tipo: chave nova
                new() { Id = "c4", TipoOperacaoId = "nao-existe", Nome = "Prazo" }, // tipo inválido: vai para o primeiro
            }));
        Assert.True(r.IsSuccess);
        Assert.Equal(new[] { "Transporte", "Armazenagem" }, r.Value!.Tipos!.Select(t => t.Nome));
        var porId = r.Value.Campos!.ToDictionary(c => c.Id);
        Assert.Equal("origem", porId["c1"].Chave);
        Assert.Equal("origem", porId["c2"].Chave);
        Assert.Equal("origem_2", porId["c3"].Chave);
        Assert.Equal("tr", porId["c4"].TipoOperacaoId);
        Assert.Contains("criar", auditoria.Acoes);

        // Inativar o tipo não apaga nada: tipo e campos continuam guardados.
        await svc.SalvarDadosOperacaoAsync("emp", new DadosOperacaoDto(new List<TipoOperacao> { new() { Id = "ar", Nome = "Armazenagem", Status = "inativo" } }, null));
        Assert.Equal(2, Tipos.Itens.Count);
        Assert.Equal("inativo", Tipos.Itens.Single(t => t.Id == "ar").Status);
        Assert.Equal(4, campos.Itens.Count);
    }

    [Theory]
    [InlineData("são pa", null, "", "sao pa")]
    [InlineData("SP - São Pa", null, "SP", "sao pa")]
    [InlineData("sp-santos", null, "SP", "santos")]
    [InlineData("SP - Santos", "rj", "RJ", "santos")] // a UF do campo prevalece
    [InlineData("Campinas", "SP", "SP", "campinas")]
    [InlineData("Ji-Paraná", null, "", "ji-parana")] // "JI" não é UF
    [InlineData("Santos", "XX", "", "santos")] // UF inválida é ignorada
    public void Busca_de_cidade_entende_o_formato_UF_nome(string termo, string? uf, string ufEsperada, string nomeEsperado)
    {
        var (u, n) = BuscaCidade.Interpretar(termo, uf);
        Assert.Equal(ufEsperada, u);
        Assert.Equal(nomeEsperado, n);
    }

    [Fact]
    public async Task Fichas_gravam_valores_por_coluna_e_o_servidor_calcula_o_total()
    {
        var (svc, _, colunas, fichas, valores, _, _) = Montar();
        var dto = new SalvarFichasDto(
            new List<FichaGrupo> { new() { Id = "g1", Nome = "Funcionários" } },
            new List<FichaColuna>
            {
                new() { Id = "sal", GrupoId = "g1", Nome = "Salário base", Tipo = "valor", CompoeTotal = true },
                new() { Id = "enc", GrupoId = "g1", Nome = "Encargos", Tipo = "calculo", CompoeTotal = true, Formula = "salario_base * 70%" },
                new() { Id = "per", GrupoId = "g1", Nome = "Período", Tipo = "lista", Opcoes = new() { "Diurno", "Noturno" } },
            },
            new List<FichaEntradaDto>
            {
                new("f1", "g1", "Porteiro · Diurno", "ativo", new Dictionary<string, JsonElement>
                {
                    ["sal"] = J("\"2.031,57\""), // digitado com vírgula
                    ["per"] = J("\"Diurno\""),
                    ["enc"] = J("999"),           // fórmula não é gravada
                    ["xxx"] = J("1"),             // coluna inexistente: ignorada
                }),
            });

        var r = await svc.SalvarFichasAsync("emp", dto);
        Assert.True(r.IsSuccess);
        var f = r.Value!.Fichas.Single();
        Assert.Equal(Math.Round(2031.57m * 1.7m, 2), f.Total);
        Assert.Equal(2031.57m, f.Valores["sal"]);
        Assert.Equal("Diurno", f.Valores["per"]);
        Assert.Equal(2, valores.Itens.Count);

        // Inativar a coluna de encargos recalcula o total sem apagar nada.
        dto.Colunas![1].Status = "inativo";
        r = await svc.SalvarFichasAsync("emp", new SalvarFichasDto(null, dto.Colunas, null));
        Assert.Equal(2031.57m, r.Value!.Fichas.Single().Total);
        Assert.Equal(3, colunas.Itens.Count);
        Assert.Single(fichas.Itens);
    }

    [Fact]
    public async Task Empresa_inexistente_e_recusada()
    {
        var (svc, _, _, _, _, _, _) = Montar();
        Assert.False((await svc.SalvarCamposAsync("nao-existe", new())).IsSuccess);
        Assert.False((await svc.SalvarFichasAsync("nao-existe", new SalvarFichasDto(null, null, null))).IsSuccess);
    }

    [Fact]
    public async Task Cada_ficha_tem_as_suas_colunas_e_o_total_do_item_so_usa_as_dela()
    {
        var (svc, _, colunas, _, _, _, grupos) = Montar();
        var r = await svc.SalvarFichasAsync("emp", new SalvarFichasDto(
            new List<FichaGrupo> { new() { Id = "func", Nome = "Funcionários" }, new() { Id = "tec", Nome = "Tecnologia" } },
            new List<FichaColuna>
            {
                new() { Id = "sal", GrupoId = "func", Nome = "Valor", Tipo = "valor", CompoeTotal = true },
                new() { Id = "enc", GrupoId = "func", Nome = "Encargos", Tipo = "percentual", CompoeTotal = true, Base = "valor" },
                new() { Id = "men", GrupoId = "tec", Nome = "Valor", Tipo = "valor", CompoeTotal = true },
                new() { Id = "x", GrupoId = "outra-empresa", Nome = "Intrusa", Tipo = "valor" },
            },
            new List<FichaEntradaDto>
            {
                new("porteiro", "func", "Porteiro", "ativo", new() { ["sal"] = J("2000"), ["enc"] = J("0.5"), ["men"] = J("999") }),
                new("crm", "tec", "Plano CRM - Ouro", "ativo", new() { ["men"] = J("450"), ["sal"] = J("777") }),
            }));
        Assert.True(r.IsSuccess);
        var g = r.Value!;
        Assert.Equal(new[] { "Funcionários", "Tecnologia" }, g.Grupos.Select(x => x.Nome));
        // A mesma chave "valor" vale nas duas fichas, sem virar valor_2.
        Assert.Equal("valor", g.Colunas.Single(c => c.Id == "men").Chave);
        Assert.Equal("valor", g.Colunas.Single(c => c.Id == "sal").Chave);
        // Coluna de ficha que não é da empresa fica sem ficha.
        Assert.Equal(string.Empty, colunas.Itens.Single(c => c.Id == "x").GrupoId);
        Assert.Equal(3000m, g.Fichas.Single(f => f.Id == "porteiro").Total); // 2000 + 50%; ignora a coluna da Tecnologia
        Assert.Equal(450m, g.Fichas.Single(f => f.Id == "crm").Total);       // ignora o salário
        Assert.Equal(2, grupos.Itens.Count);
    }

    // ── infraestrutura de teste ──

    private static JsonElement J(string json) => JsonDocument.Parse(json).RootElement;

    private static FichaColuna Col(string id, string nome, string tipo, string formula = "", string baseK = "", bool compoe = true) =>
        new() { Id = id, Nome = nome, Chave = Formula.ChaveDe(nome), Tipo = tipo, Formula = formula, Base = baseK, CompoeTotal = compoe && FichaCalculo.TiposNumericos.Contains(tipo) };

    /// <summary>Repositório de tipos de operação do último Montar().</summary>
    private static MemRepo<TipoOperacao> Tipos = new();

    private static (ParametrizacaoService, MemRepo<CampoOperacao>, MemRepo<FichaColuna>, MemRepo<FichaTecnica>, MemRepo<FichaValor>, FakeAuditoria, MemRepo<FichaGrupo>) Montar()
    {
        var campos = new MemRepo<CampoOperacao>();
        var grupos = new MemRepo<FichaGrupo>();
        var colunas = new MemRepo<FichaColuna>();
        var fichas = new MemRepo<FichaTecnica>();
        var valores = new MemRepo<FichaValor>();
        var empresas = new MemRepo<Empresa>();
        empresas.Itens.Add(new Empresa { Id = "emp", Nome = "Sinesta" });
        var auditoria = new FakeAuditoria();
        Tipos = new MemRepo<TipoOperacao>();
        return (new ParametrizacaoService(campos, Tipos, grupos, colunas, fichas, valores, empresas, new SemTransacao(), auditoria), campos, colunas, fichas, valores, auditoria, grupos);
    }

    private sealed class SemTransacao : IUnidadeTrabalho
    {
        public Task ExecutarAsync(Func<Task> acao) => acao();
    }

    private sealed class FakeAuditoria : IAuditoriaService
    {
        public List<string> Acoes { get; } = new();
        public Task RegistrarAsync(string acao, string entidade, string entidadeId, string descricao, object? antes = null, object? depois = null, UsuarioAtual? quem = null)
        {
            Acoes.Add(acao);
            return Task.CompletedTask;
        }
        public Task<List<RegistroAuditoria>> ListarAsync(int limite, string? entidade = null, string? usuario = null, string? acao = null, string? entidadeId = null) =>
            Task.FromResult(new List<RegistroAuditoria>());
    }

    /// <summary>Repositório em memória (mesmo contrato do EF: devolve cópias, lote substitui por id).</summary>
    private sealed class MemRepo<T> : ICrudRepository<T> where T : class, IEntity
    {
        public List<T> Itens { get; } = new();
        private static T Copia(T e) => JsonSerializer.Deserialize<T>(JsonSerializer.Serialize(e))!;
        public Task<List<T>> GetAllAsync() => Task.FromResult(Itens.Select(Copia).ToList());
        public Task<List<T>> ListarAsync(Expression<Func<T, bool>> filtro) => Task.FromResult(Itens.Where(filtro.Compile()).Select(Copia).ToList());
        public Task<T?> GetByIdAsync(string id) => Task.FromResult(Itens.FirstOrDefault(e => e.Id == id) is { } e ? Copia(e) : null);
        public Task<T> AddAsync(T entity) { Itens.Add(Copia(entity)); return Task.FromResult(entity); }
        public Task<List<T>> AddRangeAsync(List<T> entities) { Itens.AddRange(entities.Select(Copia)); return Task.FromResult(entities); }
        public Task<T?> UpdateAsync(string id, T entity)
        {
            var i = Itens.FindIndex(e => e.Id == id);
            if (i < 0) return Task.FromResult<T?>(null);
            Itens[i] = Copia(entity);
            return Task.FromResult<T?>(entity);
        }
        public Task SalvarLoteAsync(IReadOnlyList<T> novos, IReadOnlyList<T> alterados)
        {
            Itens.AddRange(novos.Select(Copia));
            foreach (var a in alterados)
            {
                var i = Itens.FindIndex(e => e.Id == a.Id);
                if (i >= 0) Itens[i] = Copia(a);
            }
            return Task.CompletedTask;
        }
        public Task<bool> DeleteAsync(string id) => Task.FromResult(Itens.RemoveAll(e => e.Id == id) > 0);
    }
}
