namespace Elrond.Domain.Common;

/// <summary>Raiz de agregado com id string (compatível com os ids dos mocks do front).</summary>
public interface IEntity
{
    string Id { get; set; }
}
