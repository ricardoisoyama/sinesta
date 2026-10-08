using System.Collections.Concurrent;
using System.Globalization;
using System.Text.Json;
using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Elrond.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Elrond.Infrastructure.Integracoes.Google;

/// <summary>
/// Ida e volta Agenda ↔ Google Agenda (ver <see cref="IGoogleAgendaService"/>). Ida: na gravação
/// do compromisso ou do card. Volta: o serviço de fundo lê, a cada poucos minutos, os eventos do
/// ELROND alterados no Google (horário e exclusão). Qualquer erro do Google fica em
/// ConexaoGoogle.UltimoErro; a gravação no ELROND nunca falha por causa dele.
/// </summary>
public sealed class GoogleAgendaService(AppDbContext db, IGoogleApi api, GoogleOpcoes opcoes, IAuditoriaService auditoria) : IGoogleAgendaService
{
    private const string Escopos = "openid email https://www.googleapis.com/auth/calendar.events";
    private static readonly UsuarioAtual Sistema = new("google", "Google Agenda", "Sistema");
    private static readonly ConcurrentDictionary<string, (DateTimeOffset Em, List<OcupadoDto> Lista)> CacheOcupado = new();

    private byte[] Chave => opcoes.Chave()!;
    private static string AgoraIso() => DateTimeOffset.UtcNow.ToString("o", CultureInfo.InvariantCulture);
    private static string HojeMenos(int dias) => DateTime.Now.AddDays(-dias).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    // ══════════════════════════ conexão ══════════════════════════

    public async Task<StatusGoogleDto> StatusAsync(string usuarioId)
    {
        var con = await Conexao(usuarioId, incluirInativa: true);
        return new StatusGoogleDto(opcoes.Configurado, con?.Status == "ativo", con?.Email ?? string.Empty,
            con?.UltimaSincronia ?? string.Empty, con?.UltimoErro ?? string.Empty);
    }

    public Result<string> UrlConectar(string usuarioId, string email)
    {
        if (!opcoes.Configurado) return Result.Failure<string>("A integração com o Google ainda não foi configurada no servidor.");
        var estado = CofreGoogle.EmitirEstado(usuarioId, Chave, DateTimeOffset.UtcNow);
        var q = new Dictionary<string, string>
        {
            ["client_id"] = opcoes.ClientId,
            ["redirect_uri"] = opcoes.RetornoUrl,
            ["response_type"] = "code",
            ["scope"] = Escopos,
            // offline + consent: o Google devolve a chave de renovação (a conexão não expira).
            ["access_type"] = "offline",
            ["prompt"] = "consent",
            ["include_granted_scopes"] = "true",
            ["state"] = estado,
        };
        if (email.Length > 0) q["login_hint"] = email;
        return Result.Success("https://accounts.google.com/o/oauth2/v2/auth?" + string.Join("&", q.Select(kv => $"{kv.Key}={Uri.EscapeDataString(kv.Value)}")));
    }

    public async Task<Result> ConcluirConexaoAsync(string code, string state)
    {
        if (!opcoes.Configurado) return Result.Failure("A integração com o Google ainda não foi configurada no servidor.");
        var usuarioId = CofreGoogle.ValidarEstado(state, Chave, DateTimeOffset.UtcNow);
        if (usuarioId is null) return Result.Failure("O pedido de conexão venceu ou não é válido. Tente conectar de novo.");
        try
        {
            using var doc = await api.TrocarCodigoAsync(code);
            var r = doc.RootElement;
            var escopo = r.TryGetProperty("scope", out var s) ? s.GetString() ?? string.Empty : string.Empty;
            if (!escopo.Contains("calendar.events", StringComparison.Ordinal))
                return Result.Failure("A permissão de acesso à agenda não foi concedida. Conecte de novo e marque a opção da agenda.");
            var access = r.GetProperty("access_token").GetString()!;
            var refresh = r.TryGetProperty("refresh_token", out var rt) ? rt.GetString() ?? string.Empty : string.Empty;
            var expira = DateTimeOffset.UtcNow.AddSeconds(r.TryGetProperty("expires_in", out var ex) ? ex.GetInt32() : 3600);
            var email = await api.EmailAsync(access);

            var con = await Conexao(usuarioId, incluirInativa: true);
            if (con is null)
            {
                con = new ConexaoGoogle { Id = Guid.NewGuid().ToString(), UsuarioId = usuarioId };
                db.ConexoesGoogle.Add(con);
            }
            if (refresh.Length == 0 && con.RefreshTokenCifrado.Length == 0)
                return Result.Failure("O Google não devolveu a autorização permanente. Remova o ELROND em myaccount.google.com/permissions e conecte de novo.");
            if (refresh.Length > 0) con.RefreshTokenCifrado = CofreGoogle.Cifrar(refresh, Chave);
            con.AccessTokenCifrado = CofreGoogle.Cifrar(access, Chave);
            con.AccessTokenExpiraEm = expira.ToString("o", CultureInfo.InvariantCulture);
            con.Email = email;
            con.ConectadoEm = AgoraIso();
            con.UltimaSincronia = AgoraIso();
            con.UltimoErro = string.Empty;
            con.Status = "ativo";
            await db.SaveChangesAsync();
            await auditoria.RegistrarAsync("conectar", "ConexaoGoogle", con.Id, $"Google Agenda conectado ({email})");
        }
        catch (GoogleApiException e)
        {
            return Result.Failure($"O Google recusou a conexão ({(int)e.Status}). Tente de novo em instantes.");
        }

        // Primeira ida: tudo o que já está marcado para o usuário.
        await SincronizarUsuarioAsync(usuarioId);
        return Result.Success();
    }

    public async Task DesconectarAsync(string usuarioId)
    {
        var con = await Conexao(usuarioId);
        if (con is null) return;
        var refresh = Ler(con.RefreshTokenCifrado);
        if (refresh.Length > 0) await api.RevogarAsync(refresh);
        con.RefreshTokenCifrado = string.Empty;
        con.AccessTokenCifrado = string.Empty;
        con.Status = "inativo";
        con.UltimoErro = string.Empty;
        // Os eventos já criados ficam no Google (são do usuário); os vínculos saem.
        db.VinculosGoogle.RemoveRange(db.VinculosGoogle.Where(v => v.UsuarioId == usuarioId));
        await db.SaveChangesAsync();
        await auditoria.RegistrarAsync("desconectar", "ConexaoGoogle", con.Id, $"Google Agenda desconectado ({con.Email})");
    }

    // ══════════════════════════ ida (ELROND → Google) ══════════════════════════

    public Task CompromissoMudouAsync(string compromissoId) => Seguro(() => EnviarAsync("compromisso", compromissoId));

    public Task OportunidadeMudouAsync(string oportunidadeId) => Seguro(() => EnviarAsync("crm", oportunidadeId));

    public async Task<Result<int>> SincronizarUsuarioAsync(string usuarioId)
    {
        var con = await Conexao(usuarioId);
        if (con is null) return Result.Failure<int>("Conecte o Google Agenda primeiro.");
        var desde = HojeMenos(30);
        var compromissos = await db.Compromissos.AsNoTracking()
            .Where(c => c.ResponsavelId == usuarioId && c.Status == "ativo" && string.Compare(c.Fim, desde) >= 0)
            .Select(c => c.Id).ToListAsync();
        var cards = (await db.Oportunidades.AsNoTracking()
                .Where(o => o.Status != "inativo" && o.ProximaAcao != "" && o.ProximaAcaoEm != "" && string.Compare(o.ProximaAcaoEm, desde) >= 0)
                .ToListAsync())
            .Where(o => ResponsavelDoCard(o) == usuarioId).Select(o => o.Id).ToList();
        var n = 0;
        foreach (var id in compromissos) n += await Seguro(() => EnviarAsync("compromisso", id)) ? 1 : 0;
        foreach (var id in cards) n += await Seguro(() => EnviarAsync("crm", id)) ? 1 : 0;
        await Seguro(() => PuxarAsync(con));
        return Result.Success(n);
    }

    /// <summary>Cria, atualiza ou apaga o evento do compromisso/card na agenda de quem é o responsável.</summary>
    private async Task EnviarAsync(string origem, string id)
    {
        if (!opcoes.Configurado) return;
        string? dono = null;
        Func<System.Text.Json.Nodes.JsonObject>? montar = null;
        if (origem == "compromisso")
        {
            var c = await db.Compromissos.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
            if (c is { Status: "ativo" })
            {
                dono = c.ResponsavelId;
                montar = () => GoogleMapeamento.EventoDeCompromisso(c, opcoes.UrlPublica);
            }
        }
        else
        {
            var o = await db.Oportunidades.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
            if (o is not null && o.Status != "inativo" && o.ProximaAcao.Length > 0 && o.ProximaAcaoEm.Length >= 10)
            {
                dono = ResponsavelDoCard(o);
                montar = () => GoogleMapeamento.EventoDeAcaoCrm(o, opcoes.UrlPublica);
            }
        }

        var vinculo = await db.VinculosGoogle.FirstOrDefaultAsync(v => v.Origem == origem && v.OrigemId == id);
        // Saiu da agenda de alguém (excluído, sem data ou trocou de responsável): apaga lá.
        if (vinculo is not null && (dono is null || vinculo.UsuarioId != dono))
        {
            var antigo = await Conexao(vinculo.UsuarioId);
            if (antigo is not null && await AcessoAsync(antigo) is { } tokenAntigo)
                await api.ExcluirEventoAsync(tokenAntigo, vinculo.GoogleEventId);
            db.VinculosGoogle.Remove(vinculo);
            await db.SaveChangesAsync();
            vinculo = null;
        }
        if (dono is null || dono.Length == 0 || montar is null) return;

        var con = await Conexao(dono);
        if (con is null || await AcessoAsync(con) is not { } token) return;
        var evento = montar();
        var assinatura = GoogleMapeamento.Assinatura(evento);
        if (vinculo is not null)
        {
            if (vinculo.Assinatura == assinatura) return;
            if (await api.AtualizarEventoAsync(token, vinculo.GoogleEventId, evento) is { } linkAtual)
            {
                vinculo.Assinatura = assinatura;
                vinculo.AtualizadoEm = AgoraIso();
                await db.SaveChangesAsync();
                await GuardarLinkReuniao(origem, id, linkAtual);
                return;
            }
            // Apagado direto no Google antes da volta chegar: cria de novo.
            db.VinculosGoogle.Remove(vinculo);
        }
        var (googleId, link) = await api.InserirEventoAsync(token, evento);
        db.VinculosGoogle.Add(new VinculoGoogle
        {
            Id = Guid.NewGuid().ToString(), UsuarioId = dono, Origem = origem, OrigemId = id,
            GoogleEventId = googleId, Assinatura = assinatura, AtualizadoEm = AgoraIso(),
        });
        await db.SaveChangesAsync();
        await GuardarLinkReuniao(origem, id, link);
    }

    /// <summary>O link do Meet volta do Google: guarda no compromisso para aparecer no ELROND.</summary>
    private async Task GuardarLinkReuniao(string origem, string id, string link)
    {
        if (origem != "compromisso") return;
        await db.Compromissos.Where(c => c.Id == id && c.LinkReuniao != link)
            .ExecuteUpdateAsync(s => s.SetProperty(c => c.LinkReuniao, link));
    }

    // ══════════════════════════ volta (Google → ELROND) ══════════════════════════

    public async Task<int> PuxarTodosAsync(CancellationToken ct)
    {
        if (!opcoes.Configurado) return 0;
        var conexoes = await db.ConexoesGoogle.Where(c => c.Status == "ativo").ToListAsync(ct);
        var n = 0;
        foreach (var con in conexoes)
        {
            if (ct.IsCancellationRequested) break;
            n += await Seguro(() => PuxarAsync(con)) ? 1 : 0;
        }
        return n;
    }

    /// <summary>Lê os eventos do ELROND alterados no Google desde a última leitura e aplica horário e exclusão.</summary>
    private async Task PuxarAsync(ConexaoGoogle con)
    {
        if (await AcessoAsync(con) is not { } token) return;
        var inicioDaLeitura = DateTimeOffset.UtcNow;
        var desde = DateTimeOffset.TryParse(con.UltimaSincronia, CultureInfo.InvariantCulture, DateTimeStyles.None, out var u)
            ? u.AddMinutes(-2)
            : inicioDaLeitura.AddDays(-1);
        var eventos = await api.ListarAsync(token, new Dictionary<string, string>
        {
            ["privateExtendedProperty"] = $"{GoogleMapeamento.Marca}=1",
            ["showDeleted"] = "true",
            ["updatedMin"] = desde.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", CultureInfo.InvariantCulture),
        });
        foreach (var ev in eventos)
        {
            var googleId = ev.TryGetProperty("id", out var gid) ? gid.GetString() ?? string.Empty : string.Empty;
            var vinculo = await db.VinculosGoogle.FirstOrDefaultAsync(v => v.GoogleEventId == googleId && v.UsuarioId == con.UsuarioId);
            if (vinculo is null) continue;
            var cancelado = ev.TryGetProperty("status", out var st) && st.GetString() == "cancelled";
            if (vinculo.Origem == "compromisso") await AplicarNoCompromisso(vinculo, ev, cancelado);
            else await AplicarNoCard(vinculo, ev, cancelado);
        }
        con.UltimaSincronia = inicioDaLeitura.ToString("o", CultureInfo.InvariantCulture);
        con.UltimoErro = string.Empty;
        await db.SaveChangesAsync();
    }

    private async Task AplicarNoCompromisso(VinculoGoogle vinculo, JsonElement ev, bool cancelado)
    {
        var c = await db.Compromissos.FirstOrDefaultAsync(x => x.Id == vinculo.OrigemId);
        if (c is null || c.Status != "ativo")
        {
            db.VinculosGoogle.Remove(vinculo);
            return;
        }
        if (cancelado)
        {
            c.Status = "inativo";
            db.VinculosGoogle.Remove(vinculo);
            await db.SaveChangesAsync();
            await auditoria.RegistrarAsync("inativar", "Compromisso", c.Id, $"Compromisso \"{c.Titulo}\" excluído no Google Agenda", quem: Sistema);
            return;
        }
        if (GoogleMapeamento.LerPeriodo(ev) is not { } p || (p.Inicio == c.Inicio && p.Fim == c.Fim && p.DiaInteiro == c.DiaInteiro)) return;
        var antes = new { c.Inicio, c.Fim, c.DiaInteiro };
        (c.Inicio, c.Fim, c.DiaInteiro) = p;
        // Assinatura nova: a próxima ida não devolve ao Google o que veio dele.
        vinculo.Assinatura = GoogleMapeamento.Assinatura(GoogleMapeamento.EventoDeCompromisso(c, opcoes.UrlPublica));
        vinculo.AtualizadoEm = AgoraIso();
        await db.SaveChangesAsync();
        await auditoria.RegistrarAsync("editar", "Compromisso", c.Id, $"Horário de \"{c.Titulo}\" alterado no Google Agenda", antes, new { c.Inicio, c.Fim, c.DiaInteiro }, Sistema);
    }

    private async Task AplicarNoCard(VinculoGoogle vinculo, JsonElement ev, bool cancelado)
    {
        var o = await db.Oportunidades.FirstOrDefaultAsync(x => x.Id == vinculo.OrigemId);
        if (o is null || o.Status == "inativo")
        {
            db.VinculosGoogle.Remove(vinculo);
            return;
        }
        if (cancelado)
        {
            // Apagou no Google: a próxima ação continua no card, sem data (sai da Agenda).
            var antes = o.ProximaAcaoEm;
            o.ProximaAcaoEm = string.Empty;
            db.VinculosGoogle.Remove(vinculo);
            await db.SaveChangesAsync();
            await auditoria.RegistrarAsync("editar", "Oportunidade", o.Id, $"Próxima ação de {o.Cliente} removida no Google Agenda", new { ProximaAcaoEm = antes }, new { ProximaAcaoEm = "" }, Sistema);
            return;
        }
        if (GoogleMapeamento.LerPeriodo(ev) is not { } p) return;
        var novo = p.DiaInteiro ? p.Inicio : p.Inicio[..16];
        var atual = o.ProximaAcaoEm.Length >= 16 ? o.ProximaAcaoEm[..16] : o.ProximaAcaoEm;
        if (novo == atual) return;
        o.ProximaAcaoEm = novo;
        vinculo.Assinatura = GoogleMapeamento.Assinatura(GoogleMapeamento.EventoDeAcaoCrm(o, opcoes.UrlPublica));
        vinculo.AtualizadoEm = AgoraIso();
        await db.SaveChangesAsync();
        await auditoria.RegistrarAsync("editar", "Oportunidade", o.Id, $"Próxima ação de {o.Cliente} remarcada no Google Agenda", new { ProximaAcaoEm = atual }, new { ProximaAcaoEm = novo }, Sistema);
    }

    // ══════════════════════════ agenda pessoal (só o dono vê) ══════════════════════════

    public async Task<List<OcupadoDto>> OcupadoAsync(string usuarioId, string de, string ate)
    {
        var chave = $"{usuarioId}|{de}|{ate}";
        if (CacheOcupado.TryGetValue(chave, out var c) && c.Em > DateTimeOffset.UtcNow.AddMinutes(-2)) return c.Lista;
        var con = await Conexao(usuarioId);
        if (con is null || await AcessoAsync(con) is not { } token) return new();
        if (!DateOnly.TryParseExact(de, "yyyy-MM-dd", out var d1) || !DateOnly.TryParseExact(ate, "yyyy-MM-dd", out var d2) || d2 < d1 || d2.DayNumber - d1.DayNumber > 62)
            return new();
        List<JsonElement> eventos;
        try
        {
            eventos = await api.ListarAsync(token, new Dictionary<string, string>
            {
                ["timeMin"] = $"{de}T00:00:00-03:00",
                ["timeMax"] = $"{d2.AddDays(1):yyyy-MM-dd}T00:00:00-03:00",
                ["singleEvents"] = "true",
                ["orderBy"] = "startTime",
            });
        }
        catch (Exception e) when (e is GoogleApiException or HttpRequestException or TaskCanceledException)
        {
            await Registrar(con, e);
            return new();
        }
        var lista = eventos
            .Where(ev => !(ev.TryGetProperty("status", out var s) && s.GetString() == "cancelled"))
            .Where(ev => !(ev.TryGetProperty("transparency", out var t) && t.GetString() == "transparent"))
            // Os eventos do próprio ELROND já aparecem na Agenda: não repete como "ocupado".
            .Where(ev => !(ev.TryGetProperty("extendedProperties", out var x) && x.TryGetProperty("private", out var pv) && pv.TryGetProperty(GoogleMapeamento.Marca, out _)))
            .Select(ev => (Periodo: GoogleMapeamento.LerPeriodo(ev), Ev: ev))
            .Where(x => x.Periodo is not null)
            .Select(x => new OcupadoDto(Texto(x.Ev, "id"), x.Periodo!.Value.Inicio, x.Periodo.Value.Fim, x.Periodo.Value.DiaInteiro,
                Texto(x.Ev, "summary") is { Length: > 0 } titulo ? titulo : "(sem título)", Texto(x.Ev, "location"), Texto(x.Ev, "htmlLink"),
                PodeEditar(x.Ev), Texto(x.Ev, "recurringEventId").Length > 0, Texto(x.Ev, "hangoutLink")))
            .ToList();
        CacheOcupado[chave] = (DateTimeOffset.UtcNow, lista);
        return lista;
    }

    public async Task<Result> AlterarEventoGoogleAsync(string usuarioId, string eventId, EventoGoogleDto dto)
    {
        var titulo = (dto.Titulo ?? string.Empty).Trim();
        if (titulo.Length == 0) return Result.Failure("Dê um título ao evento.");
        var formato = dto.DiaInteiro ? @"^\d{4}-\d{2}-\d{2}$" : @"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$";
        if (!System.Text.RegularExpressions.Regex.IsMatch(dto.Inicio ?? string.Empty, formato) || !System.Text.RegularExpressions.Regex.IsMatch(dto.Fim ?? string.Empty, formato))
            return Result.Failure("Informe a data e o horário do evento.");
        if (string.CompareOrdinal(dto.Fim, dto.Inicio) < 0) return Result.Failure("O fim não pode ser antes do início.");
        return await NoGoogle(usuarioId, async token =>
        {
            var (inicio, fim) = GoogleMapeamento.Periodo(dto.Inicio!, dto.Fim!, dto.DiaInteiro);
            var patch = new System.Text.Json.Nodes.JsonObject { ["summary"] = titulo, ["start"] = inicio, ["end"] = fim, ["location"] = (dto.Local ?? string.Empty).Trim() };
            return await api.AtualizarEventoAsync(token, eventId, patch) is not null ? Result.Success() : Result.Failure("O evento não existe mais no Google.");
        });
    }

    public Task<Result> ExcluirEventoGoogleAsync(string usuarioId, string eventId) =>
        NoGoogle(usuarioId, async token =>
        {
            await api.ExcluirEventoAsync(token, eventId);
            return Result.Success();
        });

    /// <summary>Ação direta na agenda pessoal: traduz a recusa do Google e limpa o cache da semana.</summary>
    private async Task<Result> NoGoogle(string usuarioId, Func<string, Task<Result>> acao)
    {
        var con = await Conexao(usuarioId);
        if (con is null || await AcessoAsync(con) is not { } token) return Result.Failure("Conecte o Google Agenda primeiro.");
        try
        {
            var r = await acao(token);
            foreach (var k in CacheOcupado.Keys.Where(k => k.StartsWith($"{usuarioId}|", StringComparison.Ordinal)).ToList()) CacheOcupado.TryRemove(k, out _);
            return r;
        }
        catch (GoogleApiException e) when (e.Status == System.Net.HttpStatusCode.Forbidden)
        {
            return Result.Failure("O Google não deixou alterar: este evento é de outra pessoa (você é convidado). Só o organizador muda.");
        }
        catch (Exception e) when (e is GoogleApiException or HttpRequestException or TaskCanceledException)
        {
            return Result.Failure("Não foi possível falar com o Google agora. Tente de novo em instantes.");
        }
    }

    /// <summary>Organizador (ou convite que deixa convidados mudarem) pode editar pelo ELROND.</summary>
    private static bool PodeEditar(JsonElement ev)
    {
        var organizador = ev.TryGetProperty("organizer", out var o) && o.TryGetProperty("self", out var s) && s.ValueKind == JsonValueKind.True;
        var semOrganizador = !ev.TryGetProperty("organizer", out _);
        var convidadoMuda = ev.TryGetProperty("guestsCanModify", out var g) && g.ValueKind == JsonValueKind.True;
        return organizador || semOrganizador || convidadoMuda;
    }

    // ══════════════════════════ auxiliares ══════════════════════════

    private static string Texto(JsonElement ev, string campo) =>
        ev.TryGetProperty(campo, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() ?? string.Empty : string.Empty;

    private Task<ConexaoGoogle?> Conexao(string usuarioId, bool incluirInativa = false) =>
        db.ConexoesGoogle.FirstOrDefaultAsync(c => c.UsuarioId == usuarioId && (incluirInativa || c.Status == "ativo"));

    /// <summary>
    /// Dono do card na agenda: o usuário responsável (pelo id; nos cards antigos, pelo nome) e,
    /// sem responsável, o funcionário ligado ao vendedor do card.
    /// </summary>
    private string ResponsavelDoCard(Oportunidade o)
    {
        if (o.ResponsavelId.Length > 0) return o.ResponsavelId;
        if (o.Responsavel.Length > 0
            && db.Users.AsNoTracking().Where(u => u.Name == o.Responsavel).Select(u => u.Id.ToString()).FirstOrDefault() is { Length: > 0 } peloNome)
            return peloNome;
        if (o.VendedorId.Length == 0) return string.Empty;
        return db.Vendedores.AsNoTracking().Where(v => v.Id == o.VendedorId).Select(v => v.UsuarioId).FirstOrDefault() ?? string.Empty;
    }

    /// <summary>Chave de acesso válida (renova se estiver para vencer). Null quando a autorização caiu.</summary>
    private async Task<string?> AcessoAsync(ConexaoGoogle con)
    {
        if (DateTimeOffset.TryParse(con.AccessTokenExpiraEm, CultureInfo.InvariantCulture, DateTimeStyles.None, out var vence)
            && vence > DateTimeOffset.UtcNow.AddSeconds(60) && con.AccessTokenCifrado.Length > 0)
            return Ler(con.AccessTokenCifrado);
        var refresh = Ler(con.RefreshTokenCifrado);
        if (refresh.Length == 0) return null;
        try
        {
            using var doc = await api.RenovarAsync(refresh);
            var access = doc.RootElement.GetProperty("access_token").GetString()!;
            var segundos = doc.RootElement.TryGetProperty("expires_in", out var ex) ? ex.GetInt32() : 3600;
            con.AccessTokenCifrado = CofreGoogle.Cifrar(access, Chave);
            con.AccessTokenExpiraEm = DateTimeOffset.UtcNow.AddSeconds(segundos).ToString("o", CultureInfo.InvariantCulture);
            await db.SaveChangesAsync();
            return access;
        }
        catch (GoogleApiException e) when (e.AutorizacaoPerdida)
        {
            con.Status = "inativo";
            con.RefreshTokenCifrado = string.Empty;
            con.AccessTokenCifrado = string.Empty;
            con.UltimoErro = "A autorização do Google foi removida ou venceu. Conecte o Google Agenda de novo.";
            await db.SaveChangesAsync();
            return null;
        }
    }

    private string Ler(string cifrado)
    {
        try
        {
            return CofreGoogle.Decifrar(cifrado, Chave);
        }
        catch (Exception)
        {
            // Chave do servidor trocada: a conexão precisa ser refeita.
            return string.Empty;
        }
    }

    /// <summary>Roda a ação; erro do Google ou de rede fica registrado na conexão e não sobe.</summary>
    private async Task<bool> Seguro(Func<Task> acao)
    {
        try
        {
            await acao();
            return true;
        }
        catch (Exception e) when (e is GoogleApiException or HttpRequestException or TaskCanceledException or JsonException or KeyNotFoundException)
        {
            foreach (var con in db.ChangeTracker.Entries<ConexaoGoogle>().Select(x => x.Entity).ToList())
                con.UltimoErro = Resumo(e);
            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
            }
            return false;
        }
    }

    private async Task Registrar(ConexaoGoogle con, Exception e)
    {
        con.UltimoErro = Resumo(e);
        await db.SaveChangesAsync();
    }

    private static string Resumo(Exception e) => e switch
    {
        GoogleApiException g => $"O Google respondeu {(int)g.Status} na última sincronização.",
        TaskCanceledException => "O Google demorou para responder na última sincronização.",
        _ => "Não foi possível falar com o Google na última sincronização.",
    };
}
