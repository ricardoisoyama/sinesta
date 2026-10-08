using System.Security.Cryptography;
using System.Text.Json;
using Elrond.Domain.Entities;
using Elrond.Infrastructure.Integracoes.Google;

namespace Elrond.Tests;

/// <summary>Peças da integração com o Google Agenda que não dependem do Google.</summary>
public class GoogleAgendaTests
{
    private static readonly byte[] Chave = RandomNumberGenerator.GetBytes(32);

    [Fact]
    public void Cofre_cifra_e_decifra_e_nao_guarda_o_texto_claro()
    {
        var pacote = CofreGoogle.Cifrar("1//refresh-token-secreto", Chave);
        Assert.DoesNotContain("refresh", pacote);
        Assert.Equal("1//refresh-token-secreto", CofreGoogle.Decifrar(pacote, Chave));
        Assert.NotEqual(pacote, CofreGoogle.Cifrar("1//refresh-token-secreto", Chave)); // nonce novo a cada vez
        Assert.ThrowsAny<CryptographicException>(() => CofreGoogle.Decifrar(pacote, RandomNumberGenerator.GetBytes(32)));
    }

    [Fact]
    public void Estado_do_oauth_vale_15_minutos_e_nao_aceita_adulteracao()
    {
        var agora = DateTimeOffset.UtcNow;
        var estado = CofreGoogle.EmitirEstado("user-123", Chave, agora);
        Assert.Equal("user-123", CofreGoogle.ValidarEstado(estado, Chave, agora.AddMinutes(10)));
        Assert.Null(CofreGoogle.ValidarEstado(estado, Chave, agora.AddMinutes(16)));
        Assert.Null(CofreGoogle.ValidarEstado(estado, RandomNumberGenerator.GetBytes(32), agora));
        Assert.Null(CofreGoogle.ValidarEstado("x" + estado, Chave, agora));
        Assert.Null(CofreGoogle.ValidarEstado("lixo", Chave, agora));
    }

    [Fact]
    public void Compromisso_de_horario_vai_com_o_fuso_de_brasilia_e_a_marca_do_elrond()
    {
        var c = new Compromisso { Id = "c1", Titulo = "Reunião", Tipo = "reuniao", Inicio = "2026-10-02T09:00", Fim = "2026-10-02T10:30", ClienteNome = "BM", Local = "Sala 1" };
        var ev = GoogleMapeamento.EventoDeCompromisso(c, "https://elrond.sinesta.com.br");
        Assert.Equal("Reunião · BM", (string?)ev["summary"]);
        Assert.Equal("2026-10-02T09:00:00", (string?)ev["start"]!["dateTime"]);
        Assert.Equal("America/Sao_Paulo", (string?)ev["start"]!["timeZone"]);
        Assert.Equal("2026-10-02T10:30:00", (string?)ev["end"]!["dateTime"]);
        Assert.Equal("Sala 1", (string?)ev["location"]);
        Assert.Equal("1", (string?)ev["extendedProperties"]!["private"]!["elrond"]);
        Assert.Equal("c1", (string?)ev["extendedProperties"]!["private"]!["elrondId"]);
        Assert.Contains("https://elrond.sinesta.com.br/agenda", (string?)ev["description"]);
    }

    [Fact]
    public void Dia_inteiro_tem_o_fim_exclusivo_como_o_google_espera_e_volta_igual()
    {
        var c = new Compromisso { Id = "c2", Titulo = "Feriado", Tipo = "outro", Inicio = "2026-10-12", Fim = "2026-10-12", DiaInteiro = true };
        var ev = GoogleMapeamento.EventoDeCompromisso(c, "");
        Assert.Equal("2026-10-12", (string?)ev["start"]!["date"]);
        Assert.Equal("2026-10-13", (string?)ev["end"]!["date"]);
        var volta = GoogleMapeamento.LerPeriodo(JsonDocument.Parse(ev.ToJsonString()).RootElement);
        Assert.Equal(("2026-10-12", "2026-10-12", true), volta);
    }

    [Fact]
    public void Proxima_acao_do_crm_dura_30_minutos_ou_o_dia_sem_hora()
    {
        var o = new Oportunidade { Id = "op1", Cliente = "BM", ProximaAcao = "Ligar", ProximaAcaoEm = "2026-10-05T14:00" };
        var ev = GoogleMapeamento.EventoDeAcaoCrm(o, "https://elrond.sinesta.com.br");
        Assert.Equal("Ligar · BM", (string?)ev["summary"]);
        Assert.Equal("2026-10-05T14:30:00", (string?)ev["end"]!["dateTime"]);
        Assert.Contains("/crm?op=op1", (string?)ev["description"]);
        o.ProximaAcaoEm = "2026-10-05";
        Assert.Equal("2026-10-06", (string?)GoogleMapeamento.EventoDeAcaoCrm(o, "")["end"]!["date"]);
    }

    [Fact]
    public void Volta_converte_qualquer_fuso_para_o_horario_de_brasilia()
    {
        // Remarcado no Google por alguém em UTC: 12:00Z = 09:00 em Brasília.
        var ev = JsonDocument.Parse("""{"start":{"dateTime":"2026-10-02T12:00:00Z"},"end":{"dateTime":"2026-10-02T13:00:00Z"}}""").RootElement;
        Assert.Equal(("2026-10-02T09:00", "2026-10-02T10:00", false), GoogleMapeamento.LerPeriodo(ev));
        var br = JsonDocument.Parse("""{"start":{"dateTime":"2026-10-02T15:00:00-03:00"},"end":{"dateTime":"2026-10-02T16:15:00-03:00"}}""").RootElement;
        Assert.Equal(("2026-10-02T15:00", "2026-10-02T16:15", false), GoogleMapeamento.LerPeriodo(br));
    }

    [Fact]
    public void Assinatura_so_muda_quando_o_evento_muda()
    {
        var c = new Compromisso { Id = "c1", Titulo = "Reunião", Tipo = "reuniao", Inicio = "2026-10-02T09:00", Fim = "2026-10-02T10:00" };
        var a = GoogleMapeamento.Assinatura(GoogleMapeamento.EventoDeCompromisso(c, ""));
        Assert.Equal(a, GoogleMapeamento.Assinatura(GoogleMapeamento.EventoDeCompromisso(c, "")));
        c.Fim = "2026-10-02T11:00";
        Assert.NotEqual(a, GoogleMapeamento.Assinatura(GoogleMapeamento.EventoDeCompromisso(c, "")));
    }

    [Fact]
    public void Sem_chaves_a_integracao_fica_desligada()
    {
        Assert.False(new GoogleOpcoes().Configurado);
        Assert.False(new GoogleOpcoes { ClientId = "x", ClientSecret = "y", RetornoUrl = "z", ChaveCriptografia = "curta" }.Configurado);
        Assert.True(new GoogleOpcoes { ClientId = "x", ClientSecret = "y", RetornoUrl = "z", ChaveCriptografia = Convert.ToBase64String(Chave) }.Configurado);
    }

    [Fact]
    public void Convidados_e_meet_vao_no_evento_sem_repetir_email()
    {
        var c = new Compromisso { Id = "c9", Titulo = "Reunião", Tipo = "reuniao", Inicio = "2026-10-02T09:00", Fim = "2026-10-02T10:00",
            Convidados = new() { "Cliente@Empresa.com ", "cliente@empresa.com", "andre@sinesta.com.br" }, ComMeet = true };
        var ev = GoogleMapeamento.EventoDeCompromisso(c, "");
        var emails = ev["attendees"]!.AsArray().Select(a => (string?)a!["email"]).ToList();
        Assert.Equal(new[] { "cliente@empresa.com", "andre@sinesta.com.br" }, emails);
        Assert.Equal("hangoutsMeet", (string?)ev["conferenceData"]!["createRequest"]!["conferenceSolutionKey"]!["type"]);
        Assert.Equal("elrond-c9", (string?)ev["conferenceData"]!["createRequest"]!["requestId"]);
        c.ComMeet = false;
        c.Convidados.Clear();
        var sem = GoogleMapeamento.EventoDeCompromisso(c, "");
        Assert.Null(sem["attendees"]);
        Assert.Null(sem["conferenceData"]);
    }
}
