namespace Elrond.Domain.Entities;

/// <summary>Situação da NFS-e no ELROND (independente do provedor de emissão).</summary>
public enum SituacaoNfse
{
    /// <summary>Criada no ELROND; o envio ao provedor ainda não foi confirmado.</summary>
    Pendente,
    /// <summary>Aceita pelo provedor; aguardando a prefeitura.</summary>
    Processando,
    Emitida,
    /// <summary>Recusada pelo provedor ou pela prefeitura. É final: corrige e emite outra.</summary>
    Rejeitada,
    /// <summary>Cancelamento pedido; aguardando a prefeitura.</summary>
    Cancelando,
    Cancelada,
}

/// <summary>
/// O que o provedor informa sobre uma nota, já traduzido para o vocabulário do ELROND.
/// <see cref="CancelamentoRecusado"/>: a prefeitura recusou o cancelamento e a nota continua válida.
/// </summary>
public sealed record RetornoNfse(
    string IdProvedor,
    SituacaoNfse Situacao,
    string Etapa,
    string Mensagem,
    bool CancelamentoRecusado = false,
    string Ambiente = "",
    string Numero = "",
    string CodigoVerificacao = "",
    string SerieRps = "",
    string NumeroRps = "",
    decimal? ValorIss = null,
    decimal? ValorRetido = null,
    decimal? ValorLiquido = null,
    DateTime? EmitidaEm = null,
    DateTime? CanceladaEm = null);

/// <summary>
/// Nota fiscal de serviço emitida pelo ELROND. O <see cref="Id"/> também é o identificador externo
/// enviado ao provedor: é o que impede emitir a mesma nota duas vezes. As mudanças de situação
/// passam pelos métodos abaixo, que só permitem os caminhos válidos.
/// </summary>
public class NotaFiscalServico
{
    /// <summary>Acompanhamento automático para de insistir depois deste tempo sem resposta.</summary>
    public static readonly TimeSpan PrazoAcompanhamento = TimeSpan.FromHours(48);

    private NotaFiscalServico() { }

    public string Id { get; private set; } = string.Empty;
    public string EmpresaId { get; private set; } = string.Empty;
    public string Provedor { get; private set; } = string.Empty;
    /// <summary>Empresa no provedor usada na emissão (consultas e cancelamento usam a mesma).</summary>
    public string IdEmpresaProvedor { get; private set; } = string.Empty;
    /// <summary>Identificador da nota no provedor (vazio até o envio ser aceito).</summary>
    public string IdProvedor { get; private set; } = string.Empty;
    public string Ambiente { get; private set; } = string.Empty;
    public SituacaoNfse Situacao { get; private set; }
    /// <summary>Etapa como o provedor descreve (ex.: WaitingReturn), para diagnóstico.</summary>
    public string EtapaProvedor { get; private set; } = string.Empty;
    /// <summary>Último aviso para o usuário: motivo da recusa, pendência, etc.</summary>
    public string Mensagem { get; private set; } = string.Empty;

    public string Numero { get; private set; } = string.Empty;
    public string CodigoVerificacao { get; private set; } = string.Empty;
    public string SerieRps { get; private set; } = string.Empty;
    public string NumeroRps { get; private set; } = string.Empty;

    public string TomadorNome { get; private set; } = string.Empty;
    public string TomadorDocumento { get; private set; } = string.Empty;
    public string Descricao { get; private set; } = string.Empty;
    public DateOnly? Competencia { get; private set; }
    public decimal ValorServicos { get; private set; }
    public decimal ValorIss { get; private set; }
    public decimal ValorRetido { get; private set; }
    public decimal ValorLiquido { get; private set; }

    /// <summary>Pedido completo recebido pelo motor (JSON), para conferência e reenvio.</summary>
    public string Pedido { get; private set; } = string.Empty;
    /// <summary>Vínculo opcional com quem originou a nota (ex.: "movimento" + id).</summary>
    public string OrigemTipo { get; private set; } = string.Empty;
    public string OrigemId { get; private set; } = string.Empty;

    public DateTime CriadaEm { get; private set; }
    public string CriadaPor { get; private set; } = string.Empty;
    public DateTime AtualizadaEm { get; private set; }
    public DateTime? EmitidaEm { get; private set; }
    public DateTime? CanceladaEm { get; private set; }
    public string CanceladaPor { get; private set; } = string.Empty;
    public string MotivoCancelamento { get; private set; } = string.Empty;

    /// <summary>Quando consultar o provedor de novo (null = não precisa).</summary>
    public DateTime? ProximaConsultaEm { get; private set; }
    public int Consultas { get; private set; }

    public bool EmAndamento => Situacao is SituacaoNfse.Pendente or SituacaoNfse.Processando or SituacaoNfse.Cancelando;
    public bool TemArquivos => Situacao is SituacaoNfse.Emitida or SituacaoNfse.Cancelada;

    public static NotaFiscalServico Criar(
        string id, string empresaId, string provedor, string idEmpresaProvedor, string pedidoJson,
        string tomadorNome, string tomadorDocumento, string descricao, DateOnly? competencia, decimal valorServicos,
        string origemTipo, string origemId, string usuario, DateTime agora)
    {
        if (string.IsNullOrWhiteSpace(id)) throw new ArgumentException("A nota precisa de um identificador.", nameof(id));
        if (valorServicos <= 0) throw new ArgumentException("O valor do serviço precisa ser maior que zero.", nameof(valorServicos));
        return new NotaFiscalServico
        {
            Id = id,
            EmpresaId = empresaId,
            Provedor = provedor,
            IdEmpresaProvedor = idEmpresaProvedor,
            Situacao = SituacaoNfse.Pendente,
            Pedido = pedidoJson,
            TomadorNome = tomadorNome,
            TomadorDocumento = tomadorDocumento,
            Descricao = descricao.Length <= 300 ? descricao : descricao[..300],
            Competencia = competencia,
            ValorServicos = valorServicos,
            ValorLiquido = valorServicos,
            OrigemTipo = origemTipo,
            OrigemId = origemId,
            CriadaEm = agora,
            CriadaPor = usuario,
            AtualizadaEm = agora,
            ProximaConsultaEm = agora.AddMinutes(1),
        };
    }

    /// <summary>O provedor aceitou o envio: agora é com a prefeitura.</summary>
    public void RegistrarAceite(RetornoNfse retorno, DateTime agora)
    {
        ExigirSituacao(nameof(RegistrarAceite), SituacaoNfse.Pendente);
        IdProvedor = retorno.IdProvedor;
        Situacao = SituacaoNfse.Processando;
        Mensagem = string.Empty;
        AplicarDados(retorno);
        Agendar(agora);
    }

    /// <summary>O provedor ou a prefeitura recusou a nota. Situação final.</summary>
    public void RegistrarRecusa(string motivo, DateTime agora)
    {
        ExigirSituacao(nameof(RegistrarRecusa), SituacaoNfse.Pendente, SituacaoNfse.Processando);
        Situacao = SituacaoNfse.Rejeitada;
        Mensagem = motivo;
        Encerrar(agora);
    }

    /// <summary>Envio sem confirmação (queda de conexão, demora): fica pendente até conferir no provedor.</summary>
    public void RegistrarEnvioIncerto(string motivo, DateTime agora)
    {
        ExigirSituacao(nameof(RegistrarEnvioIncerto), SituacaoNfse.Pendente);
        Mensagem = $"Envio sem confirmação ({motivo}). O ELROND confere no provedor antes de qualquer reenvio.";
        Agendar(agora);
    }

    /// <summary>Retorno do provedor (consulta ou aviso). Retorno de uma nota já encerrada é ignorado.</summary>
    public void AplicarRetorno(RetornoNfse retorno, DateTime agora)
    {
        if (Situacao is SituacaoNfse.Rejeitada or SituacaoNfse.Cancelada) return;
        if (IdProvedor.Length == 0) IdProvedor = retorno.IdProvedor;
        AplicarDados(retorno);

        if (retorno.CancelamentoRecusado)
        {
            Situacao = SituacaoNfse.Emitida;
            Mensagem = Juntar("O cancelamento foi recusado e a nota continua válida", retorno.Mensagem);
            Encerrar(agora);
            return;
        }

        // Nota emitida não volta para "processando" por um retorno atrasado.
        if (Situacao == SituacaoNfse.Emitida && retorno.Situacao == SituacaoNfse.Processando) return;
        // Cancelamento pedido: só sai de "cancelando" com o resultado do cancelamento.
        if (Situacao == SituacaoNfse.Cancelando && retorno.Situacao is SituacaoNfse.Processando or SituacaoNfse.Emitida)
        {
            Agendar(agora);
            return;
        }

        Situacao = retorno.Situacao;
        Mensagem = retorno.Situacao == SituacaoNfse.Rejeitada ? retorno.Mensagem : string.Empty;
        if (retorno.Situacao == SituacaoNfse.Emitida) EmitidaEm ??= retorno.EmitidaEm ?? agora;
        if (retorno.Situacao == SituacaoNfse.Cancelada) CanceladaEm ??= retorno.CanceladaEm ?? agora;

        if (EmAndamento) Agendar(agora);
        else Encerrar(agora);
    }

    /// <summary>Pedido de cancelamento aceito pelo provedor.</summary>
    public void SolicitarCancelamento(string motivo, string usuario, DateTime agora)
    {
        ExigirSituacao(nameof(SolicitarCancelamento), SituacaoNfse.Emitida);
        if (string.IsNullOrWhiteSpace(motivo)) throw new ArgumentException("Informe o motivo do cancelamento.", nameof(motivo));
        Situacao = SituacaoNfse.Cancelando;
        MotivoCancelamento = motivo.Trim();
        CanceladaPor = usuario;
        Mensagem = string.Empty;
        Consultas = 0;
        Agendar(agora);
    }

    /// <summary>
    /// O provedor não conhece a nota. Se ela está pendente há bastante tempo, o envio não chegou:
    /// libera para emitir de novo. Devolve true quando encerrou a nota.
    /// </summary>
    public bool RegistrarNaoEncontrada(DateTime agora, TimeSpan tolerancia)
    {
        if (Situacao != SituacaoNfse.Pendente || agora - CriadaEm < tolerancia)
        {
            Agendar(agora);
            return false;
        }
        Situacao = SituacaoNfse.Rejeitada;
        Mensagem = "O envio não chegou ao provedor. Nenhuma nota foi emitida: pode emitir de novo.";
        Encerrar(agora);
        return true;
    }

    /// <summary>Consulta ao provedor falhou (fora do ar): tenta de novo mais tarde, dentro do prazo.</summary>
    public void RegistrarFalhaDeConsulta(DateTime agora) => Agendar(agora);

    private void AplicarDados(RetornoNfse r)
    {
        EtapaProvedor = r.Etapa;
        if (r.Ambiente.Length > 0) Ambiente = r.Ambiente;
        if (r.Numero.Length > 0) Numero = r.Numero;
        if (r.CodigoVerificacao.Length > 0) CodigoVerificacao = r.CodigoVerificacao;
        if (r.SerieRps.Length > 0) SerieRps = r.SerieRps;
        if (r.NumeroRps.Length > 0) NumeroRps = r.NumeroRps;
        if (r.ValorIss is { } iss) ValorIss = iss;
        if (r.ValorRetido is { } retido) ValorRetido = retido;
        if (r.ValorLiquido is { } liquido) ValorLiquido = liquido;
    }

    /// <summary>Próxima consulta com espera crescente (1, 2, 5, 10, 30 min, depois de hora em hora), até o prazo.</summary>
    private void Agendar(DateTime agora)
    {
        AtualizadaEm = agora;
        Consultas++;
        if (agora - CriadaEm > PrazoAcompanhamento && Situacao != SituacaoNfse.Cancelando
            || Situacao == SituacaoNfse.Cancelando && Consultas > 60)
        {
            ProximaConsultaEm = null;
            const string semResposta = "Sem resposta do provedor no prazo; consulte manualmente.";
            if (!Mensagem.Contains(semResposta, StringComparison.Ordinal)) Mensagem = Juntar(Mensagem, semResposta);
            return;
        }
        var minutos = Consultas switch { <= 1 => 1, 2 => 2, 3 => 5, 4 => 10, 5 => 30, _ => 60 };
        ProximaConsultaEm = agora.AddMinutes(minutos);
    }

    private void Encerrar(DateTime agora)
    {
        AtualizadaEm = agora;
        ProximaConsultaEm = null;
    }

    private void ExigirSituacao(string operacao, params SituacaoNfse[] permitidas)
    {
        if (!permitidas.Contains(Situacao))
            throw new InvalidOperationException($"Não é possível {Verbo(operacao)} uma nota {Situacao.ToString().ToLowerInvariant()}.");
    }

    private static string Verbo(string operacao) => operacao switch
    {
        nameof(SolicitarCancelamento) => "cancelar",
        nameof(RegistrarAceite) => "registrar o aceite de",
        nameof(RegistrarRecusa) => "recusar",
        _ => "alterar",
    };

    private static string Juntar(string a, string b) =>
        string.Join(": ", new[] { a, b }.Where(x => !string.IsNullOrWhiteSpace(x)));
}
