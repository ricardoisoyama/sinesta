using Elrond.Application.DTOs;
using Elrond.Application.Services;

namespace Elrond.API.Background;

/// <summary>Como está a consulta à SIIMP (a tela acompanha pelo GET).</summary>
public sealed record SituacaoConsultaSiimp(
    bool Rodando, string De, string Ate, string Etapa, int Feito, int Total, string IniciadaEm, string TerminadaEm, string Por,
    string Erro, ResumoPendentesDto? Resumo);

/// <summary>
/// Roda a consulta de pendentes de faturamento em segundo plano: com o limite de 60 chamadas por
/// minuto da SIIMP ela pode levar alguns minutos, mais que uma requisição aguenta. Uma por vez.
/// </summary>
public sealed class ConsultaPendentesSiimp(IServiceScopeFactory escopos, ILogger<ConsultaPendentesSiimp> log)
{
    private readonly object _trava = new();
    private SituacaoConsultaSiimp _situacao = new(false, "", "", "", 0, 0, "", "", "", "", null);

    public SituacaoConsultaSiimp Situacao
    {
        get { lock (_trava) return _situacao; }
    }

    /// <summary>Começa a consulta. Já rodando: devolve a que está em andamento (não empilha outra).</summary>
    public SituacaoConsultaSiimp Iniciar(string de, string ate, UsuarioAtual quem)
    {
        lock (_trava)
        {
            if (_situacao.Rodando) return _situacao;
            _situacao = new(true, de, ate, "Começando", 0, 0, DateTime.UtcNow.ToString("o"), "", quem.Nome, "", null);
        }
        _ = Task.Run(async () =>
        {
            try
            {
                using var escopo = escopos.CreateScope();
                var servico = escopo.ServiceProvider.GetRequiredService<PendentesFaturamentoService>();
                var r = await servico.ConsultarAsync(de, ate, quem, (etapa, feito, total) => Mudar(s => s with { Etapa = etapa, Feito = feito, Total = total }));
                Mudar(s => s with { Rodando = false, TerminadaEm = DateTime.UtcNow.ToString("o"), Etapa = r.IsSuccess ? "Pronto" : "Falhou", Erro = r.IsSuccess ? "" : r.Error ?? "", Resumo = r.Value });
            }
            catch (Exception e)
            {
                log.LogError(e, "Consulta de pendentes na SIIMP falhou");
                Mudar(s => s with { Rodando = false, TerminadaEm = DateTime.UtcNow.ToString("o"), Etapa = "Falhou", Erro = "A consulta parou por um erro inesperado. Tente de novo." });
            }
        });
        return Situacao;
    }

    private void Mudar(Func<SituacaoConsultaSiimp, SituacaoConsultaSiimp> f)
    {
        lock (_trava) _situacao = f(_situacao);
    }
}
