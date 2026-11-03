using System.Text.Json;
using Elrond.Domain.Entities;

namespace Elrond.Application.DTOs;

/// <summary>
/// Dados da Operação de uma empresa: os tipos de operação (Transporte, Armazenagem...) e os
/// campos de cada um. Na gravação, o que não vier não é apagado (remover é status = inativo).
/// </summary>
public record DadosOperacaoDto(List<TipoOperacao>? Tipos, List<CampoOperacao>? Campos);

/// <summary>Item de uma ficha como a tela usa: valores por Id da coluna (número ou texto).</summary>
public record FichaSaidaDto(string Id, string GrupoId, string Nome, string Status, int Ordem, decimal Total, Dictionary<string, object> Valores,
    string CriadoEm, string CriadoPor, string AlteradoEm, string AlteradoPor);

/// <summary>Fichas (pastas), colunas e itens de uma empresa (a Ficha Técnica inteira da tela).</summary>
public record FichasEmpresaDto(List<FichaGrupo> Grupos, List<FichaColuna> Colunas, List<FichaSaidaDto> Fichas, List<FichaPasta>? Pastas = null);

/// <summary>Um item enviado pela tela. Valores por Id da coluna; o Total é recalculado no servidor.</summary>
public record FichaEntradaDto(string Id, string? GrupoId, string Nome, string Status, Dictionary<string, JsonElement>? Valores);

/// <summary>Grava a Ficha Técnica da empresa: fichas, colunas e itens. O que não vier não é apagado (exclusão é status = inativo).</summary>
public record SalvarFichasDto(List<FichaGrupo>? Grupos, List<FichaColuna>? Colunas, List<FichaEntradaDto>? Fichas, List<FichaPasta>? Pastas = null);
