using Elrond.Application.Interfaces;

namespace Elrond.Infrastructure.Bancos;

/// <summary>Módulos de banco disponíveis. Banco novo = um módulo novo registrado aqui (e na DI).</summary>
public sealed class BancosRegistro(IEnumerable<IBancoModulo> modulos) : IBancos
{
    private readonly Dictionary<string, IBancoModulo> _porCodigo = modulos.ToDictionary(m => m.Codigo, StringComparer.OrdinalIgnoreCase);

    public IBancoModulo? Modulo(string codigo) => _porCodigo.GetValueOrDefault(codigo ?? string.Empty);

    public IReadOnlyList<IBancoModulo> Todos => _porCodigo.Values.ToList();
}
