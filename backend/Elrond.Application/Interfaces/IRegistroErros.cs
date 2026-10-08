namespace Elrond.Application.Interfaces;

/// <summary>Guarda no banco os erros devolvidos pelo servidor (diagnóstico; sem os valores enviados).</summary>
public interface IRegistroErros
{
    /// <summary>Registra em segundo plano: nunca atrasa nem derruba a resposta.</summary>
    void Registrar(string tipo, string metodo, string rota, int status, string mensagem, string detalhe, string usuario, string rastreio);
}
