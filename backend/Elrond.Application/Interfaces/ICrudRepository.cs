using System.Linq.Expressions;
using Elrond.Domain.Common;

namespace Elrond.Application.Interfaces;

/// <summary>Repositório CRUD genérico para agregados simples (in-memory → EF).</summary>
public interface ICrudRepository<T> where T : class, IEntity
{
    Task<List<T>> GetAllAsync();
    /// <summary>Lista filtrando no banco (ex.: só os campos de uma empresa).</summary>
    Task<List<T>> ListarAsync(Expression<Func<T, bool>> filtro);
    Task<T?> GetByIdAsync(string id);
    Task<T> AddAsync(T entity);
    /// <summary>Insere vários de uma vez (importação de planilha).</summary>
    Task<List<T>> AddRangeAsync(List<T> entities);
    Task<T?> UpdateAsync(string id, T entity);
    /// <summary>
    /// Grava um lote numa ida só: <paramref name="novos"/> são inseridos e <paramref name="alterados"/>
    /// substituem o registro de mesmo id. Rastro carimbado em todos. Nunca apaga o que não veio.
    /// </summary>
    Task SalvarLoteAsync(IReadOnlyList<T> novos, IReadOnlyList<T> alterados);
    Task<bool> DeleteAsync(string id);
}

/// <summary>Agrupa várias gravações numa transação só (tudo ou nada).</summary>
public interface IUnidadeTrabalho
{
    Task ExecutarAsync(Func<Task> acao);
}
