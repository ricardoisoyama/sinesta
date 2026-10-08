using Elrond.Application.Common;

namespace Elrond.Application.Interfaces;

/// <summary>Situação da ligação com o Google para o usuário logado.</summary>
public record StatusGoogleDto(bool Configurado, bool Conectado, string Email, string UltimaSincronia, string UltimoErro);

/// <summary>Evento da agenda pessoal do Google (só para o próprio dono ver na Agenda do ELROND).</summary>
/// <param name="PodeEditar">Falso em convite de outra pessoa (só o organizador muda no Google).</param>
/// <param name="Recorrente">Ocorrência de um evento que se repete (editar muda só esta).</param>
/// <param name="LinkReuniao">Link do Google Meet do evento (vazio sem videoconferência).</param>
public record OcupadoDto(string Id, string Inicio, string Fim, bool DiaInteiro, string Titulo, string Local, string Link, bool PodeEditar, bool Recorrente, string LinkReuniao);

/// <summary>Alteração de um evento pessoal do Google feita pela Agenda do ELROND.</summary>
public record EventoGoogleDto(string Titulo, string Inicio, string Fim, bool DiaInteiro, string? Local);

/// <summary>
/// Agenda ↔ Google Agenda, ida e volta. Ida: compromissos e próximas ações do CRM viram eventos
/// na agenda do responsável. Volta: mudança de horário ou exclusão feitas no Google voltam para
/// o ELROND. Falha do Google nunca derruba a gravação no ELROND: fica registrada na conexão.
/// </summary>
public interface IGoogleAgendaService
{
    Task<StatusGoogleDto> StatusAsync(string usuarioId);
    /// <summary>Endereço de autorização do Google para o usuário (com o estado assinado).</summary>
    Result<string> UrlConectar(string usuarioId, string email);
    /// <summary>Retorno do Google: troca o código pelas chaves e grava a conexão.</summary>
    Task<Result> ConcluirConexaoAsync(string code, string state);
    Task DesconectarAsync(string usuarioId);
    /// <summary>Envia tudo o que é do usuário (de 30 dias atrás em diante) e lê as alterações.</summary>
    Task<Result<int>> SincronizarUsuarioAsync(string usuarioId);
    Task CompromissoMudouAsync(string compromissoId);
    Task OportunidadeMudouAsync(string oportunidadeId);
    Task<List<OcupadoDto>> OcupadoAsync(string usuarioId, string de, string ate);
    /// <summary>Muda título, período e local de um evento pessoal na agenda principal do Google.</summary>
    Task<Result> AlterarEventoGoogleAsync(string usuarioId, string eventId, EventoGoogleDto dto);
    Task<Result> ExcluirEventoGoogleAsync(string usuarioId, string eventId);
    /// <summary>Lê as alterações do Google de todas as conexões (rodado pelo serviço de fundo).</summary>
    Task<int> PuxarTodosAsync(CancellationToken ct);
}
