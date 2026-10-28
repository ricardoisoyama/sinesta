using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Domain.Entities;

namespace Elrond.Application.Interfaces;

/// <summary>Cadastros parametrizáveis por empresa: tipos de operação e seus campos, e a Ficha Técnica.</summary>
public interface IParametrizacaoService
{
    /// <summary>Tipos de operação e campos da empresa (ativos e inativos), na ordem da tela.</summary>
    Task<DadosOperacaoDto> DadosOperacaoAsync();

    /// <summary>Grava tipos e campos da empresa numa transação (insere, altera, inativa). Não apaga o que não veio.</summary>
    Task<Result<DadosOperacaoDto>> SalvarDadosOperacaoAsync(DadosOperacaoDto dto);

    /// <summary>Campos da empresa (ativos e inativos), na ordem da tela.</summary>
    Task<List<CampoOperacao>> CamposAsync();

    /// <summary>Grava só os campos (os tipos ficam como estão).</summary>
    Task<Result<List<CampoOperacao>>> SalvarCamposAsync(List<CampoOperacao> campos);

    Task<FichasEmpresaDto> FichasAsync();

    /// <summary>Grava colunas, fichas e valores da empresa numa transação e recalcula os totais.</summary>
    Task<Result<FichasEmpresaDto>> SalvarFichasAsync(SalvarFichasDto dto);
}
