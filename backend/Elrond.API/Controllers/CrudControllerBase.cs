using Elrond.Application.Interfaces;
using Elrond.Domain.Common;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Elrond.API.Controllers;

/// <summary>
/// CRUD REST genérico para agregados simples. Requer autenticação. Se existir um
/// validador (FluentValidation) para o tipo, ele roda antes de gravar e devolve 400.
/// Toda escrita entra na trilha de auditoria (com os campos que mudaram).
/// </summary>
[ApiController]
[Authorize]
public abstract class CrudControllerBase<T> : ControllerBase where T : class, IEntity
{
    protected readonly ICrudRepository<T> Repo;

    protected CrudControllerBase(ICrudRepository<T> repo) => Repo = repo;

    /// <summary>Nome do tipo na trilha de auditoria (ex.: "Cliente", "Empresa").</summary>
    protected virtual string NomeEntidade => typeof(T).Name;

    protected IAuditoriaService Auditoria => HttpContext.RequestServices.GetRequiredService<IAuditoriaService>();

    /// <summary>Como o registro aparece na trilha: Nome, Numero ou o id.</summary>
    protected static string RotuloDe(T entity)
    {
        var t = entity.GetType();
        foreach (var prop in new[] { "Nome", "Numero", "Name", "Cliente", "Descricao" })
        {
            var v = t.GetProperty(prop)?.GetValue(entity) as string;
            if (!string.IsNullOrWhiteSpace(v)) return v;
        }
        return entity.Id;
    }

    /// <summary>Mensagem do primeiro erro de validação, ou null quando o registro está ok.</summary>
    protected async Task<string?> ValidarAsync(T entity)
    {
        var validator = HttpContext.RequestServices.GetService<IValidator<T>>();
        if (validator is null) return null;
        var r = await validator.ValidateAsync(entity);
        return r.IsValid ? null : r.Errors[0].ErrorMessage;
    }

    /// <summary>Teto de registros por importação (planilha): evita payloads gigantes.</summary>
    protected virtual int MaximoPorLote => 2000;

    /// <summary>
    /// Regra de negócio extra antes de gravar (limite de compras, região do vendedor...).
    /// Vale para Create, Update e CreateMany, para o lote não virar atalho. Null = ok.
    /// </summary>
    protected virtual Task<string?> AntesDeGravarAsync(T entity) => Task.FromResult<string?>(null);

    [HttpGet]
    public virtual async Task<IActionResult> GetAll() => Ok(await Repo.GetAllAsync());

    [HttpGet("{id}")]
    public virtual async Task<IActionResult> GetById(string id)
    {
        var e = await Repo.GetByIdAsync(id);
        return e is null ? NotFound() : Ok(e);
    }

    [HttpPost]
    public virtual async Task<IActionResult> Create([FromBody] T entity)
    {
        if (await ValidarAsync(entity) is { } erro) return BadRequest(erro);
        if (await AntesDeGravarAsync(entity) is { } regra) return BadRequest(regra);
        if (string.IsNullOrWhiteSpace(entity.Id))
            entity.Id = Guid.NewGuid().ToString();
        var created = await Repo.AddAsync(entity);
        await Auditoria.RegistrarAsync("criar", NomeEntidade, created.Id, $"{NomeEntidade} \"{RotuloDe(created)}\" criado(a)");
        return Ok(created);
    }

    /// <summary>Importação em lote (planilha): cria vários registros de uma vez.</summary>
    [HttpPost("bulk")]
    public virtual async Task<IActionResult> CreateMany([FromBody] List<T> entities)
    {
        if (entities.Count == 0) return BadRequest("Nenhum registro enviado.");
        if (entities.Count > MaximoPorLote) return BadRequest($"Envie no máximo {MaximoPorLote} registros por vez.");

        for (var i = 0; i < entities.Count; i++)
        {
            if (await ValidarAsync(entities[i]) is { } erro) return BadRequest($"Linha {i + 1}: {erro}");
            if (await AntesDeGravarAsync(entities[i]) is { } regra) return BadRequest($"Linha {i + 1}: {regra}");
            if (string.IsNullOrWhiteSpace(entities[i].Id))
                entities[i].Id = Guid.NewGuid().ToString();
        }

        var created = await Repo.AddRangeAsync(entities);
        await Auditoria.RegistrarAsync("importar", NomeEntidade, string.Empty, $"{created.Count} registro(s) de {NomeEntidade} importado(s) em lote");
        return Ok(created);
    }

    [HttpPut("{id}")]
    public virtual async Task<IActionResult> Update(string id, [FromBody] T entity)
    {
        if (await ValidarAsync(entity) is { } erro) return BadRequest(erro);
        if (await AntesDeGravarAsync(entity) is { } regra) return BadRequest(regra);
        var antes = await Repo.GetByIdAsync(id);
        var updated = await Repo.UpdateAsync(id, entity);
        if (updated is null) return NotFound();
        await Auditoria.RegistrarAsync("editar", NomeEntidade, id, $"{NomeEntidade} \"{RotuloDe(updated)}\" alterado(a)", antes, updated);
        return Ok(updated);
    }

    /// <summary>
    /// Nenhum cadastro é apagado de verdade: DELETE inativa (exclusão lógica), com quem/quando
    /// gravados no registro e na trilha. Tipos sem status não aceitam exclusão.
    /// </summary>
    [HttpDelete("{id}")]
    public virtual async Task<IActionResult> Delete(string id)
    {
        var atual = await Repo.GetByIdAsync(id);
        if (atual is null) return NotFound();
        if (atual is not IInativavel inativavel)
            return BadRequest($"{NomeEntidade} não pode ser excluído(a); o histórico é mantido.");
        if (inativavel.Status == "inativo") return NoContent();

        var antes = new { status = inativavel.Status };
        inativavel.Status = "inativo";
        await Repo.UpdateAsync(id, atual);
        await Auditoria.RegistrarAsync("inativar", NomeEntidade, id, $"{NomeEntidade} \"{RotuloDe(atual)}\" inativado(a) (exclusão lógica)", antes, new { status = "inativo" });
        return NoContent();
    }
}
