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

/// <summary>
/// Reserva números da sequência do banco antes de gravar, em ordem crescente. Serve ao
/// parcelamento: o EF grava o lote fora de ordem, então as parcelas levariam números trocados.
/// </summary>
public interface INumerador
{
    Task<IReadOnlyList<long>> ProximosMovimentosAsync(int quantidade);
}

/// <summary>Numeração dos documentos por empresa (fatura, NF-e, NFS-e...): atômica, nunca repete.</summary>
public interface INumeradorDocumentos
{
    /// <summary>
    /// Próximo número: o maior entre o último gravado e <paramref name="minimoUltimo"/> (o último usado fora do
    /// ELROND, ex.: na SIIMP), mais um. Grava como o novo último na mesma operação.
    /// </summary>
    Task<long> ProximoAsync(string empresaId, string tipo, long minimoUltimo = 0);
}

/// <summary>Agrupa várias gravações numa transação só (tudo ou nada).</summary>
public interface IUnidadeTrabalho
{
    Task ExecutarAsync(Func<Task> acao);
}
