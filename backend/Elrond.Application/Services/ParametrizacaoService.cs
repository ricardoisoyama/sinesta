using System.Globalization;
using System.Text.Json;
using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Domain.Common;
using Elrond.Domain.Entities;
using Elrond.Domain.Regras;

namespace Elrond.Application.Services;

/// <summary>
/// Regras dos cadastros parametrizáveis. A tela manda a lista inteira da empresa (salvamento
/// automático); aqui ela é comparada com o banco: o que é novo entra, o que mudou é alterado,
/// o que não mudou fica intocado e o que NÃO veio também fica (nada é apagado; remover é
/// status = inativo). Assim duas pessoas editando ao mesmo tempo não apagam o trabalho uma da outra.
/// </summary>
public class ParametrizacaoService : IParametrizacaoService
{
    private static readonly string[] TiposCampo = { "texto", "lista", "cadastro", "data", "numero", "valor", "percentual", "uf", "cidade" };
    private static readonly string[] Cadastros = { "cliente", "fornecedor", "vendedor", "servico", "veiculo" };
    private static readonly string[] TiposColuna = { "valor", "percentual", "calculo", "numero", "texto", "lista" };
    private const int MaxItens = 300;
    private const int MaxTipos = 50;

    /// <summary>Efeitos que cada tipo de campo aceita (o resto só informa).</summary>
    public static string EfeitoValido(string tipo, string efeito) => (tipo, efeito) switch
    {
        ("numero", "multiplica") => "multiplica",
        ("valor", "soma-custo") => "soma-custo",
        ("percentual", "pct-custo") => "pct-custo",
        _ => "informativo",
    };

    private readonly ICrudRepository<CampoOperacao> _campos;
    private readonly ICrudRepository<TipoOperacao> _tipos;
    private readonly ICrudRepository<FichaGrupo> _grupos;
    private readonly ICrudRepository<FichaColuna> _colunas;
    private readonly ICrudRepository<FichaTecnica> _fichas;
    private readonly ICrudRepository<FichaValor> _valores;
    private readonly ICrudRepository<Empresa> _empresas;
    private readonly IUnidadeTrabalho _uow;
    private readonly IAuditoriaService _auditoria;

    public ParametrizacaoService(ICrudRepository<CampoOperacao> campos, ICrudRepository<TipoOperacao> tipos, ICrudRepository<FichaGrupo> grupos,
        ICrudRepository<FichaColuna> colunas, ICrudRepository<FichaTecnica> fichas, ICrudRepository<FichaValor> valores,
        ICrudRepository<Empresa> empresas, IUnidadeTrabalho uow, IAuditoriaService auditoria)
    {
        _campos = campos;
        _tipos = tipos;
        _grupos = grupos;
        _colunas = colunas;
        _fichas = fichas;
        _valores = valores;
        _empresas = empresas;
        _uow = uow;
        _auditoria = auditoria;
    }

    // ══════════════════════════ Dados da Operação ══════════════════════════

    /// <summary>O que mudou numa gravação: registros novos, alterados (antes/depois) e o conjunto final.</summary>
    private sealed record Lote<T>(List<T> Novos, List<(T Antes, T Depois)> Alterados, List<T> Todos);

    public async Task<DadosOperacaoDto> DadosOperacaoAsync(string empresaId) =>
        new(await TiposAsync(empresaId), await CamposAsync(empresaId));

    private async Task<List<TipoOperacao>> TiposAsync(string empresaId) =>
        (await _tipos.ListarAsync(t => t.EmpresaId == empresaId)).OrderBy(t => t.Ordem).ToList();

    public async Task<List<CampoOperacao>> CamposAsync(string empresaId) =>
        (await _campos.ListarAsync(c => c.EmpresaId == empresaId)).OrderBy(c => c.Ordem).ToList();

    public async Task<Result<DadosOperacaoDto>> SalvarDadosOperacaoAsync(string empresaId, DadosOperacaoDto dto)
    {
        if (await _empresas.GetByIdAsync(empresaId) is not { } empresa)
            return Result.Failure<DadosOperacaoDto>("Empresa não encontrada.");
        var brutosTipos = dto?.Tipos ?? new();
        var brutosCampos = dto?.Campos ?? new();
        if (brutosTipos.Count > MaxTipos)
            return Result.Failure<DadosOperacaoDto>($"No máximo {MaxTipos} tipos de operação por empresa.");
        if (brutosCampos.Count > MaxItens)
            return Result.Failure<DadosOperacaoDto>($"No máximo {MaxItens} campos por empresa.");

        var tipos = await PrepararTiposAsync(empresaId, brutosTipos);
        var campos = await PrepararCamposAsync(empresaId, brutosCampos, tipos.Todos);

        await _uow.ExecutarAsync(async () =>
        {
            await _tipos.SalvarLoteAsync(tipos.Novos, tipos.Alterados.Select(a => a.Depois).ToList());
            await _campos.SalvarLoteAsync(campos.Novos, campos.Alterados.Select(a => a.Depois).ToList());
        });

        await AuditarAsync(empresa, "TipoOperacao", "Tipo de operação", tipos, t => t.Nome, t => t.Status);
        await AuditarAsync(empresa, "CampoOperacao", "Campo", campos, c => c.Nome, c => c.Status);
        return Result.Success(await DadosOperacaoAsync(empresaId));
    }

    public async Task<Result<List<CampoOperacao>>> SalvarCamposAsync(string empresaId, List<CampoOperacao> campos)
    {
        var r = await SalvarDadosOperacaoAsync(empresaId, new DadosOperacaoDto(null, campos));
        return r.IsSuccess ? Result.Success(r.Value!.Campos ?? new()) : Result.Failure<List<CampoOperacao>>(r.Error!);
    }

    /// <summary>Tipos de operação: insere, renomeia, reordena e inativa. Os que não vieram ficam como estão.</summary>
    private async Task<Lote<TipoOperacao>> PrepararTiposAsync(string empresaId, List<TipoOperacao> brutos)
    {
        var existentes = (await _tipos.ListarAsync(t => t.EmpresaId == empresaId)).ToDictionary(t => t.Id);
        var novos = new List<TipoOperacao>();
        var alterados = new List<(TipoOperacao Antes, TipoOperacao Depois)>();
        var vistos = new HashSet<string>();
        var ordem = 0;
        foreach (var bruto in brutos)
        {
            existentes.TryGetValue(bruto.Id ?? string.Empty, out var antes);
            var nome = (bruto.Nome ?? string.Empty).Trim();
            if (antes is null && nome.Length == 0) continue; // tipo novo ainda sem nome
            var t = new TipoOperacao
            {
                Id = antes?.Id ?? (string.IsNullOrWhiteSpace(bruto.Id) ? Guid.NewGuid().ToString() : bruto.Id.Trim()),
                EmpresaId = empresaId,
                Nome = Limitar(nome.Length > 0 ? nome : antes!.Nome, 80),
                Ordem = ordem++,
                Status = bruto.Status == "inativo" ? "inativo" : "ativo",
            };
            if (!vistos.Add(t.Id)) continue;
            if (antes is null) novos.Add(t);
            else if (antes.Nome != t.Nome || antes.Ordem != t.Ordem || antes.Status != t.Status) alterados.Add((antes, t));
        }
        var depois = alterados.ToDictionary(a => a.Antes.Id, a => a.Depois);
        var todos = existentes.Values.Select(e => depois.GetValueOrDefault(e.Id) ?? e).Concat(novos).ToList();
        return new(novos, alterados, todos);
    }

    /// <summary>
    /// Campos: normaliza tipo, efeito e chave (única entre os ativos do mesmo tipo de operação).
    /// Campo sem tipo de operação válido vai para o primeiro tipo ativo da empresa.
    /// </summary>
    private async Task<Lote<CampoOperacao>> PrepararCamposAsync(string empresaId, List<CampoOperacao> brutos, List<TipoOperacao> tipos)
    {
        var existentes = (await _campos.ListarAsync(c => c.EmpresaId == empresaId)).ToDictionary(c => c.Id);
        var idsTipos = tipos.Select(t => t.Id).ToHashSet();
        var tipoPadrao = tipos.Where(t => t.Status == "ativo").OrderBy(t => t.Ordem).FirstOrDefault()?.Id ?? tipos.FirstOrDefault()?.Id ?? string.Empty;
        var chavesPorTipo = new Dictionary<string, HashSet<string>>();
        var novos = new List<CampoOperacao>();
        var alterados = new List<(CampoOperacao Antes, CampoOperacao Depois)>();

        var ordem = 0;
        foreach (var bruto in brutos)
        {
            existentes.TryGetValue(bruto.Id ?? string.Empty, out var antes);
            var nome = (bruto.Nome ?? string.Empty).Trim();
            // Linha nova ainda sem nome: a tela está no meio da digitação; grava quando tiver nome.
            if (antes is null && nome.Length == 0) continue;

            var tipo = TiposCampo.Contains(bruto.Tipo) ? bruto.Tipo : "texto";
            var status = bruto.Status == "inativo" ? "inativo" : "ativo";
            var tipoOperacaoId = idsTipos.Contains(bruto.TipoOperacaoId ?? string.Empty) ? bruto.TipoOperacaoId!
                : antes is not null && idsTipos.Contains(antes.TipoOperacaoId) ? antes.TipoOperacaoId
                : tipoPadrao;
            var c = new CampoOperacao
            {
                Id = antes?.Id ?? (string.IsNullOrWhiteSpace(bruto.Id) ? Guid.NewGuid().ToString() : bruto.Id.Trim()),
                EmpresaId = empresaId,
                TipoOperacaoId = tipoOperacaoId,
                Nome = Limitar(nome.Length > 0 ? nome : antes!.Nome, 120),
                Tipo = tipo,
                Efeito = EfeitoValido(tipo, bruto.Efeito ?? string.Empty),
                Obrigatorio = bruto.Obrigatorio,
                Largura = bruto.Largura is 1 or 2 or 4 ? bruto.Largura : 1,
                Ordem = ordem++,
                Opcoes = tipo == "lista" ? Opcoes(bruto.Opcoes) : new(),
                Cadastro = tipo == "cadastro" ? (Cadastros.Contains(bruto.Cadastro) ? bruto.Cadastro : "cliente") : string.Empty,
                Ajuda = Limitar((bruto.Ajuda ?? string.Empty).Trim(), 400),
                Status = status,
            };
            var chaves = status == "ativo"
                ? chavesPorTipo.TryGetValue(tipoOperacaoId, out var k) ? k : chavesPorTipo[tipoOperacaoId] = new HashSet<string>()
                : new HashSet<string>();
            c.Chave = ChaveUnica(bruto.Chave, c.Nome, chaves);

            if (antes is null) novos.Add(c);
            else if (MudouCampo(antes, c)) alterados.Add((antes, c));
        }
        return new(novos, alterados, new());
    }

    /// <summary>Trilha de auditoria de uma gravação: criar, editar, inativar ou reativar cada registro.</summary>
    private async Task AuditarAsync<T>(Empresa empresa, string entidade, string rotulo, Lote<T> lote, Func<T, string> nome, Func<T, string> status)
        where T : IEntity
    {
        foreach (var n in lote.Novos)
            await _auditoria.RegistrarAsync("criar", entidade, n.Id, $"{rotulo} \"{nome(n)}\" criado em Dados da Operação de {empresa.Nome}");
        foreach (var (a, d) in lote.Alterados)
        {
            var acao = status(a) != "inativo" && status(d) == "inativo" ? "inativar" : status(a) == "inativo" && status(d) != "inativo" ? "reativar" : "editar";
            await _auditoria.RegistrarAsync(acao, entidade, d.Id, $"{rotulo} \"{nome(d)}\" de Dados da Operação ({empresa.Nome}): {acao}", a, d);
        }
    }

    private static bool MudouCampo(CampoOperacao a, CampoOperacao b) =>
        a.Nome != b.Nome || a.Chave != b.Chave || a.Tipo != b.Tipo || a.Efeito != b.Efeito || a.Obrigatorio != b.Obrigatorio
        || a.Largura != b.Largura || a.Ordem != b.Ordem || a.Cadastro != b.Cadastro || a.Ajuda != b.Ajuda || a.Status != b.Status
        || a.TipoOperacaoId != b.TipoOperacaoId || !a.Opcoes.SequenceEqual(b.Opcoes);

    // ══════════════════════════ Ficha Técnica ══════════════════════════

    public async Task<FichasEmpresaDto> FichasAsync(string empresaId)
    {
        var grupos = (await _grupos.ListarAsync(g => g.EmpresaId == empresaId)).OrderBy(g => g.Ordem).ToList();
        var colunas = (await _colunas.ListarAsync(c => c.EmpresaId == empresaId)).OrderBy(c => c.Ordem).ToList();
        var fichas = (await _fichas.ListarAsync(f => f.EmpresaId == empresaId)).OrderBy(f => f.Ordem).ToList();
        var ids = fichas.Select(f => f.Id).ToList();
        var valores = ids.Count == 0 ? new List<FichaValor>() : await _valores.ListarAsync(v => ids.Contains(v.FichaId));
        var tipoDa = colunas.ToDictionary(c => c.Id, c => c.Tipo);
        var porFicha = valores.GroupBy(v => v.FichaId).ToDictionary(g => g.Key, g => g.ToList());

        var saida = fichas.Select(f =>
        {
            var dic = new Dictionary<string, object>();
            foreach (var v in porFicha.GetValueOrDefault(f.Id) ?? new())
            {
                if (!tipoDa.TryGetValue(v.ColunaId, out var tipo)) continue;
                if (tipo is "texto" or "lista") dic[v.ColunaId] = v.Texto;
                else if (v.Numero is { } n) dic[v.ColunaId] = n;
            }
            return new FichaSaidaDto(f.Id, f.GrupoId, f.Nome, f.Status, f.Ordem, f.Total, dic, f.CriadoEm, f.CriadoPor, f.AlteradoEm, f.AlteradoPor);
        }).ToList();
        return new FichasEmpresaDto(grupos, colunas, saida);
    }

    public async Task<Result<FichasEmpresaDto>> SalvarFichasAsync(string empresaId, SalvarFichasDto dto)
    {
        if (await _empresas.GetByIdAsync(empresaId) is not { } empresa)
            return Result.Failure<FichasEmpresaDto>("Empresa não encontrada.");
        if ((dto.Grupos?.Count ?? 0) > MaxItens || (dto.Colunas?.Count ?? 0) > MaxItens || (dto.Fichas?.Count ?? 0) > 2000)
            return Result.Failure<FichasEmpresaDto>("Grade grande demais para gravar de uma vez.");

        // ── 0. Fichas (pastas) ──
        var grupoExistentes = (await _grupos.ListarAsync(g => g.EmpresaId == empresaId)).ToDictionary(g => g.Id);
        var grupoNovos = new List<FichaGrupo>();
        var grupoAlterados = new List<(FichaGrupo Antes, FichaGrupo Depois)>();
        var gruposValidos = new HashSet<string>(grupoExistentes.Keys);
        var ordemG = 0;
        foreach (var bruto in dto.Grupos ?? new())
        {
            grupoExistentes.TryGetValue(bruto.Id ?? string.Empty, out var antes);
            var nome = (bruto.Nome ?? string.Empty).Trim();
            var g = new FichaGrupo
            {
                Id = antes?.Id ?? (string.IsNullOrWhiteSpace(bruto.Id) ? Guid.NewGuid().ToString() : bruto.Id.Trim()),
                EmpresaId = empresaId,
                Nome = Limitar(nome.Length > 0 ? nome : antes?.Nome ?? "Nova ficha", 120),
                Ordem = ordemG++,
                FormulaTotal = Limitar((bruto.FormulaTotal ?? string.Empty).Trim(), 500),
                Status = bruto.Status == "inativo" ? "inativo" : "ativo",
            };
            gruposValidos.Add(g.Id);
            if (antes is null) grupoNovos.Add(g);
            else if (antes.Nome != g.Nome || antes.Ordem != g.Ordem || antes.Status != g.Status || antes.FormulaTotal != g.FormulaTotal) grupoAlterados.Add((antes, g));
        }
        // Fórmula do total de cada ficha (a que veio agora ou a gravada).
        var formulaPorGrupo = grupoExistentes.Values.Concat(grupoNovos).Concat(grupoAlterados.Select(a => a.Depois))
            .GroupBy(g => g.Id).ToDictionary(g => g.Key, g => g.Last().FormulaTotal);
        // Ficha pedida pela tela, se for desta empresa; senão a que já estava (ou nenhuma).
        string GrupoDe(string? pedido, string? atual) =>
            !string.IsNullOrWhiteSpace(pedido) && gruposValidos.Contains(pedido.Trim()) ? pedido.Trim() : atual ?? string.Empty;

        // ── 1. Colunas ──
        var colExistentes = (await _colunas.ListarAsync(c => c.EmpresaId == empresaId)).ToDictionary(c => c.Id);
        var colNovas = new List<FichaColuna>();
        var colAlteradas = new List<(FichaColuna Antes, FichaColuna Depois)>();
        var colFinal = new Dictionary<string, FichaColuna>(colExistentes);
        // A chave (nome nas fórmulas) é única dentro de cada ficha: "valor" pode existir em várias.
        var chavesPorGrupo = new Dictionary<string, HashSet<string>>();
        var ordem = 0;
        foreach (var bruto in dto.Colunas ?? new())
        {
            colExistentes.TryGetValue(bruto.Id ?? string.Empty, out var antes);
            var nome = (bruto.Nome ?? string.Empty).Trim();
            if (antes is null && nome.Length == 0) continue;
            var tipo = TiposColuna.Contains(bruto.Tipo) ? bruto.Tipo : "valor";
            var status = bruto.Status == "inativo" ? "inativo" : "ativo";
            var c = new FichaColuna
            {
                Id = antes?.Id ?? (string.IsNullOrWhiteSpace(bruto.Id) ? Guid.NewGuid().ToString() : bruto.Id.Trim()),
                EmpresaId = empresaId,
                GrupoId = GrupoDe(bruto.GrupoId, antes?.GrupoId),
                Nome = Limitar(nome.Length > 0 ? nome : antes!.Nome, 120),
                Tipo = tipo,
                CompoeTotal = FichaCalculo.TiposNumericos.Contains(tipo) && bruto.CompoeTotal,
                Base = tipo == "percentual" ? Formula.ChaveDe(bruto.Base ?? string.Empty) : string.Empty,
                Formula = tipo == "calculo" ? Limitar((bruto.Formula ?? string.Empty).Trim(), 500) : string.Empty,
                Opcoes = tipo == "lista" ? Opcoes(bruto.Opcoes) : new(),
                Ordem = ordem++,
                Status = status,
            };
            if (!chavesPorGrupo.TryGetValue(c.GrupoId, out var chaves)) chavesPorGrupo[c.GrupoId] = chaves = new HashSet<string>();
            c.Chave = ChaveUnica(bruto.Chave, c.Nome, status == "ativo" ? chaves : new HashSet<string>());
            colFinal[c.Id] = c;
            if (antes is null) colNovas.Add(c);
            else if (MudouColuna(antes, c)) colAlteradas.Add((antes, c));
        }

        // ── 2. Fichas ──
        var fichaExistentes = (await _fichas.ListarAsync(f => f.EmpresaId == empresaId)).ToDictionary(f => f.Id);
        // Cópias: o total é recalculado em cima delas e comparado com o original.
        var fichaFinal = fichaExistentes.ToDictionary(k => k.Key, k => new FichaTecnica
        {
            Id = k.Value.Id, EmpresaId = k.Value.EmpresaId, GrupoId = k.Value.GrupoId, Nome = k.Value.Nome, Total = k.Value.Total, Ordem = k.Value.Ordem, Status = k.Value.Status,
        });
        var fichasNovas = new HashSet<string>();
        var entradaPorFicha = new Dictionary<string, Dictionary<string, JsonElement>>();
        ordem = 0;
        foreach (var bruto in dto.Fichas ?? new())
        {
            fichaExistentes.TryGetValue(bruto.Id ?? string.Empty, out var antes);
            var nome = (bruto.Nome ?? string.Empty).Trim();
            var f = new FichaTecnica
            {
                Id = antes?.Id ?? (string.IsNullOrWhiteSpace(bruto.Id) ? Guid.NewGuid().ToString() : bruto.Id.Trim()),
                EmpresaId = empresaId,
                GrupoId = GrupoDe(bruto.GrupoId, antes?.GrupoId),
                Nome = Limitar(nome.Length > 0 ? nome : antes?.Nome ?? "Novo item", 160),
                Total = antes?.Total ?? 0m,
                Ordem = ordem++,
                Status = bruto.Status == "inativo" ? "inativo" : "ativo",
            };
            if (antes is null) fichasNovas.Add(f.Id);
            fichaFinal[f.Id] = f;
            entradaPorFicha[f.Id] = bruto.Valores ?? new();
        }

        // ── 3. Valores (célula = ficha × coluna; fórmula não é gravada, é calculada) ──
        var fichaIds = fichaFinal.Keys.ToList();
        var valExistentes = fichaIds.Count == 0 ? new List<FichaValor>() : await _valores.ListarAsync(v => fichaIds.Contains(v.FichaId));
        var valFinal = valExistentes.ToDictionary(v => (v.FichaId, v.ColunaId));
        var valNovos = new List<FichaValor>();
        var valAlterados = new List<FichaValor>();
        var fichasComValorMudado = new HashSet<string>();
        foreach (var (fichaId, entrada) in entradaPorFicha)
        {
            foreach (var (colunaId, json) in entrada)
            {
                if (!colFinal.TryGetValue(colunaId, out var col) || col.Tipo == "calculo") continue;
                var texto = col.Tipo is "texto" or "lista" ? Limitar(Texto(json), 400) : string.Empty;
                decimal? numero = col.Tipo is "texto" or "lista" ? null : Numero(json);
                valFinal.TryGetValue((fichaId, colunaId), out var atual);
                if (atual is not null && atual.Numero == numero && atual.Texto == texto) continue;
                var v = new FichaValor
                {
                    Id = atual?.Id ?? Guid.NewGuid().ToString(),
                    FichaId = fichaId,
                    ColunaId = colunaId,
                    Numero = numero,
                    Texto = texto,
                };
                if (atual is null) valNovos.Add(v); else valAlterados.Add(v);
                valFinal[(fichaId, colunaId)] = v;
                fichasComValorMudado.Add(fichaId);
            }
        }

        // ── 4. Totais: calculados aqui, com as colunas ativas DA FICHA de cada item ──
        var ativasPorGrupo = colFinal.Values.Where(c => c.Status == "ativo").OrderBy(c => c.Ordem)
            .GroupBy(c => c.GrupoId).ToDictionary(g => g.Key, g => (IReadOnlyList<FichaColuna>)g.ToList());
        var valPorFicha = valFinal.Values.GroupBy(v => v.FichaId).ToDictionary(g => g.Key, g => (IReadOnlyDictionary<string, FichaValor>)g.ToDictionary(v => v.ColunaId));
        var fichasNovasLista = new List<FichaTecnica>();
        var fichasAlteradas = new List<(FichaTecnica Antes, FichaTecnica Depois)>();
        foreach (var f in fichaFinal.Values)
        {
            f.Total = FichaCalculo.Total(ativasPorGrupo.GetValueOrDefault(f.GrupoId) ?? Array.Empty<FichaColuna>(), valPorFicha.GetValueOrDefault(f.Id) ?? new Dictionary<string, FichaValor>(),
                formulaPorGrupo.GetValueOrDefault(f.GrupoId));
            if (fichasNovas.Contains(f.Id)) { fichasNovasLista.Add(f); continue; }
            var antes = fichaExistentes[f.Id];
            if (antes.Nome != f.Nome || antes.GrupoId != f.GrupoId || antes.Status != f.Status || antes.Ordem != f.Ordem || antes.Total != f.Total || fichasComValorMudado.Contains(f.Id))
                fichasAlteradas.Add((antes, f));
        }

        await _uow.ExecutarAsync(async () =>
        {
            await _grupos.SalvarLoteAsync(grupoNovos, grupoAlterados.Select(a => a.Depois).ToList());
            await _colunas.SalvarLoteAsync(colNovas, colAlteradas.Select(a => a.Depois).ToList());
            await _fichas.SalvarLoteAsync(fichasNovasLista, fichasAlteradas.Select(a => a.Depois).ToList());
            await _valores.SalvarLoteAsync(valNovos, valAlterados);
        });

        var nomeGrupo = grupoExistentes.Values.Concat(grupoNovos).Concat(grupoAlterados.Select(a => a.Depois))
            .GroupBy(g => g.Id).ToDictionary(g => g.Key, g => g.Last().Nome);
        string Onde(string grupoId) => nomeGrupo.TryGetValue(grupoId, out var n) ? $"ficha {n}" : "Ficha Técnica";
        foreach (var g in grupoNovos)
            await _auditoria.RegistrarAsync("criar", "FichaGrupo", g.Id, $"Ficha \"{g.Nome}\" criada na Ficha Técnica de {empresa.Nome}");
        foreach (var (a, d) in grupoAlterados)
            await _auditoria.RegistrarAsync(Acao(a.Status, d.Status), "FichaGrupo", d.Id, $"Ficha \"{d.Nome}\" ({empresa.Nome}): {Acao(a.Status, d.Status)}", a, d);
        foreach (var c in colNovas)
            await _auditoria.RegistrarAsync("criar", "FichaColuna", c.Id, $"Coluna \"{c.Nome}\" criada na {Onde(c.GrupoId)} ({empresa.Nome})");
        foreach (var (a, d) in colAlteradas)
            await _auditoria.RegistrarAsync(Acao(a.Status, d.Status), "FichaColuna", d.Id, $"Coluna \"{d.Nome}\" da {Onde(d.GrupoId)} ({empresa.Nome}): {Acao(a.Status, d.Status)}", a, d);
        foreach (var f in fichasNovasLista)
            await _auditoria.RegistrarAsync("criar", "FichaTecnica", f.Id, $"Item \"{f.Nome}\" criado na {Onde(f.GrupoId)} ({empresa.Nome})");
        foreach (var (a, d) in fichasAlteradas.Where(x => x.Antes.Nome != x.Depois.Nome || x.Antes.Status != x.Depois.Status || fichasComValorMudado.Contains(x.Depois.Id)))
            await _auditoria.RegistrarAsync(Acao(a.Status, d.Status), "FichaTecnica", d.Id, $"Item \"{d.Nome}\" da {Onde(d.GrupoId)} ({empresa.Nome}): {Acao(a.Status, d.Status)}, total {d.Total:N2}", a, d);

        return Result.Success(await FichasAsync(empresaId));
    }

    private static bool MudouColuna(FichaColuna a, FichaColuna b) =>
        a.Nome != b.Nome || a.GrupoId != b.GrupoId || a.Chave != b.Chave || a.Tipo != b.Tipo || a.CompoeTotal != b.CompoeTotal || a.Base != b.Base
        || a.Formula != b.Formula || a.Ordem != b.Ordem || a.Status != b.Status || !a.Opcoes.SequenceEqual(b.Opcoes);

    // ══════════════════════════ auxiliares ══════════════════════════

    private static string Acao(string antes, string depois) =>
        antes != "inativo" && depois == "inativo" ? "inativar" : antes == "inativo" && depois != "inativo" ? "reativar" : "editar";

    private static string Limitar(string s, int max) => s.Length <= max ? s : s[..max];

    private static List<string> Opcoes(List<string>? opcoes) =>
        (opcoes ?? new()).Select(o => Limitar((o ?? string.Empty).Trim(), 80)).Where(o => o.Length > 0).Distinct().Take(50).ToList();

    /// <summary>Chave do campo: a enviada (ou a do nome), normalizada e sem repetir entre os ativos.</summary>
    private static string ChaveUnica(string? pedida, string nome, HashSet<string> usadas)
    {
        var baseK = Formula.ChaveDe(string.IsNullOrWhiteSpace(pedida) ? nome : pedida);
        if (baseK.Length == 0) baseK = "campo";
        baseK = Limitar(baseK, 70);
        var k = baseK;
        for (var n = 2; usadas.Contains(k); n++) k = $"{baseK}_{n}";
        usadas.Add(k);
        return k;
    }

    private static string Texto(JsonElement j) => j.ValueKind switch
    {
        JsonValueKind.String => (j.GetString() ?? string.Empty).Trim(),
        JsonValueKind.Number => j.GetRawText(),
        _ => string.Empty,
    };

    /// <summary>Número vindo da tela: JSON number ou texto digitado ("1.500,50", "12,5", "12.5"). Vazio = nulo.</summary>
    public static decimal? Numero(JsonElement j)
    {
        if (j.ValueKind == JsonValueKind.Number && j.TryGetDecimal(out var d)) return d;
        if (j.ValueKind != JsonValueKind.String) return null;
        var s = (j.GetString() ?? string.Empty).Trim();
        if (s.Length == 0) return null;
        var norm = s.Contains(',') ? s.Replace(".", "").Replace(',', '.') : s;
        return decimal.TryParse(norm, NumberStyles.Number, CultureInfo.InvariantCulture, out var n) ? n : null;
    }
}
