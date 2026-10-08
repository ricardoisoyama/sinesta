using Elrond.Domain.Entities;

namespace Elrond.Application.DTOs;

/// <summary>Novo lançamento: o movimento-base e em quantas parcelas ele se divide.</summary>
public record NovoMovimentoDto(Movimento Movimento, int Parcelas = 1, string Periodicidade = "mensal");

/// <summary>Baixa de um ou vários lançamentos. Ajustes (desconto/juros/multa) só valem para um.</summary>
public record BaixaDto(List<string> Ids, string PagoEm, string CarteiraId, decimal? Desconto = null, decimal? Juros = null, decimal? Multa = null);

public record IdsDto(List<string> Ids);

public record ReprovarMovimentoDto(string Motivo);

/// <summary>Linhas lidas do .ofx na tela (o arquivo é lido no navegador).</summary>
public record LinhaExtratoDto(string Fitid, string Data, decimal Valor, string Memo);
public record ImportarExtratoDto(string CarteiraId, List<LinhaExtratoDto> Linhas);
public record ImportarExtratoResultado(int Novas, int JaImportadas);

public record VincularExtratoDto(string LinhaId, string MovimentoId);

/// <summary>Cria o lançamento a partir da linha do extrato (já liquidado) e concilia.</summary>
public record CriarDoExtratoDto(string LinhaId, string ParceiroNome, string Descricao, string PlanoContaId, string CentroCustoId, string FormaPagamento, string EmpresaId);
