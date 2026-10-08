using Elrond.Domain.Entities;

namespace Elrond.Application.Interfaces;

public interface IAnexoRepository
{
    /// <summary>Anexos vivos de um registro (os excluídos logicamente ficam de fora).</summary>
    Task<List<Anexo>> ListarAsync(string entidade, string entidadeId);
    Task<Anexo?> GetByIdAsync(string id);
    Task AddAsync(Anexo anexo);
    Task UpdateAsync(Anexo anexo);
}
