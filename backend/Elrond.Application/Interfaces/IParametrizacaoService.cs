using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Domain.Entities;

namespace Elrond.Application.Interfaces;

/// <summary>Cadastros parametrizáveis por empresa: campos de Dados da Operação e a Ficha Técnica.</summary>
public interface IParametrizacaoService
{
    /// <summary>Campos da empresa (ativos e inativos), na ordem da tela.</summary>
    Task<List<CampoOperacao>> CamposAsync(string empresaId);

    /// <summary>Grava a lista de campos da empresa (insere, altera, inativa). Não apaga o que não veio.</summary>
    Task<Result<List<CampoOperacao>>> SalvarCamposAsync(string empresaId, List<CampoOperacao> campos);

    Task<FichasEmpresaDto> FichasAsync(string empresaId);

    /// <summary>Grava colunas, fichas e valores da empresa numa transação e recalcula os totais.</summary>
    Task<Result<FichasEmpresaDto>> SalvarFichasAsync(string empresaId, SalvarFichasDto dto);
}
