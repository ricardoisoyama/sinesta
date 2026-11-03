using Elrond.Application.Services;

namespace Elrond.Tests;

/// <summary>"Ler boleto em outro dispositivo": sessão curta, de quem abriu, uso único, só código válido.</summary>
public class LeituraBoletoTests
{
    private const string Barras = "03395988500000666539201493990000372830030102";

    private sealed class Relogio : TimeProvider
    {
        public DateTimeOffset Agora { get; set; } = new(2026, 11, 3, 15, 0, 0, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => Agora;
    }

    [Fact]
    public void Celular_manda_o_codigo_e_o_computador_pega_uma_vez()
    {
        var svc = new LeituraBoletoService(new Relogio());
        var s = svc.Abrir("u-ric");
        Assert.True(svc.Valida(s.Token));
        Assert.Equal("", svc.Consultar(s.Token, "u-ric")!.Codigo);

        Assert.Contains("tem 47 dígitos", svc.Registrar(s.Token, "123").Erro);
        var (codigo, erro) = svc.Registrar(s.Token, Barras);
        Assert.True(codigo is not null, erro);
        Assert.Equal(666.53m, codigo!.Valor);
        Assert.Equal("Este link já foi usado.", svc.Registrar(s.Token, Barras).Erro);

        Assert.Null(svc.Consultar(s.Token, "outra-pessoa")); // só quem abriu vê
        Assert.Equal(Barras, svc.Consultar(s.Token, "u-ric")!.Codigo);
        Assert.Null(svc.Consultar(s.Token, "u-ric")); // pegou: acabou
    }

    [Fact]
    public void Link_expira_em_10_minutos()
    {
        var relogio = new Relogio();
        var svc = new LeituraBoletoService(relogio);
        var s = svc.Abrir("u-ric");
        relogio.Agora = relogio.Agora.AddMinutes(11);
        Assert.False(svc.Valida(s.Token));
        Assert.Contains("expirou", svc.Registrar(s.Token, Barras).Erro);
        Assert.False(svc.Consultar(s.Token, "u-ric")!.Valida);
        Assert.False(svc.Valida("token-inventado"));
    }
}
