namespace Elrond.Application.Interfaces;

/// <summary>Servidor SMTP com a senha já aberta (só em memória, na hora do envio).</summary>
public sealed record ServidorSmtp(string Host, int Porta, string Seguranca, string Usuario, string Senha, string RemetenteNome, string RemetenteEmail, string ResponderPara);

public sealed record MensagemEmail(string Para, string Assunto, string Html, string Texto);

/// <summary>Envio por SMTP (a biblioteca fica na infraestrutura). Devolve o erro, ou null quando foi.</summary>
public interface IEnvioSmtp
{
    Task<string?> EnviarAsync(ServidorSmtp servidor, MensagemEmail mensagem, CancellationToken ct = default);
}

/// <summary>Cifra segredos simples (senha do SMTP) com a chave do ambiente, amarrados a um contexto.</summary>
public interface ICofreSegredos
{
    bool Configurado { get; }
    byte[] Fechar(string contexto, string valor);
    string Abrir(string contexto, byte[] cifrado);
}
