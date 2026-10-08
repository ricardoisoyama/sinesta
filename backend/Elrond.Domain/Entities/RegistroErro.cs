namespace Elrond.Domain.Entities;

/// <summary>
/// Erro que o servidor devolveu (dados que não puderam ser lidos, erro interno), guardado para
/// diagnóstico. Nunca guarda o valor enviado (pode ter senha, certificado, dado pessoal):
/// só onde foi, qual campo, o motivo e quem estava logado.
/// </summary>
public class RegistroErro
{
    public long Id { get; set; }
    public DateTime Em { get; set; }
    /// <summary>"validacao" (400 de dados ilegíveis) ou "excecao" (500).</summary>
    public string Tipo { get; set; } = string.Empty;
    public string Metodo { get; set; } = string.Empty;
    public string Rota { get; set; } = string.Empty;
    public int Status { get; set; }
    /// <summary>O que a tela recebeu.</summary>
    public string Mensagem { get; set; } = string.Empty;
    /// <summary>Campos e motivos (validação) ou tipo e mensagem da exceção.</summary>
    public string Detalhe { get; set; } = string.Empty;
    /// <summary>E-mail de quem estava logado (vazio se anônimo).</summary>
    public string Usuario { get; set; } = string.Empty;
    /// <summary>Id de rastreio da requisição (o mesmo do log do container).</summary>
    public string Rastreio { get; set; } = string.Empty;
}
