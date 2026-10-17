using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Elrond.Domain.Regras;

namespace Elrond.Application.Services;

/// <summary>
/// Regras da proposta fora do controller. O servidor decide sozinho se a proposta nasce
/// pendente: preço editado pelo vendedor ou margem abaixo do markup mínimo da empresa
/// (para gestor, o piso é só alerta; para os demais, pede aprovação).
/// </summary>
public class PropostaService : IPropostaService
{
    private static readonly string[] StatusValidos = { "rascunho", "pendente", "enviada", "aprovada", "recusada" };

    private readonly ICrudRepository<Proposta> _propostas;
    private readonly ICrudRepository<RegraAprovacao> _regras;
    private readonly ICrudRepository<Empresa> _empresas;
    private readonly ICrudRepository<Vendedor> _vendedores;
    private readonly ICrudRepository<Cliente> _clientes;
    private readonly IOportunidadeService _crm;
    private readonly IPropostaNumerador _numerador;
    private readonly IAuditoriaService _auditoria;

    public PropostaService(
        ICrudRepository<Proposta> propostas,
        ICrudRepository<RegraAprovacao> regras,
        ICrudRepository<Empresa> empresas,
        ICrudRepository<Vendedor> vendedores,
        ICrudRepository<Cliente> clientes,
        IOportunidadeService crm,
        IPropostaNumerador numerador,
        IAuditoriaService auditoria)
    {
        _propostas = propostas;
        _regras = regras;
        _empresas = empresas;
        _vendedores = vendedores;
        _clientes = clientes;
        _crm = crm;
        _numerador = numerador;
        _auditoria = auditoria;
    }

    public async Task<Result<Proposta>> CriarAsync(CriarPropostaDto dto, UsuarioAtual quem) =>
        await MontarAsync(dto, quem, existente: null);

    public async Task<Result<Proposta>> AtualizarAsync(string id, CriarPropostaDto dto, UsuarioAtual quem)
    {
        var atual = await _propostas.GetByIdAsync(id);
        if (atual is null) return Result.Failure<Proposta>("Proposta não encontrada.");
        if (atual.Status != "rascunho")
            return Result.Failure<Proposta>("Só proposta em rascunho pode ser editada. Esta está " + atual.Status + ".");
        return await MontarAsync(dto, quem, atual);
    }

    /// <summary>Validações e montagem comuns a criar e editar. Com <paramref name="existente"/>, reescreve mantendo número e data.</summary>
    private async Task<Result<Proposta>> MontarAsync(CriarPropostaDto dto, UsuarioAtual quem, Proposta? existente)
    {
        if (string.IsNullOrWhiteSpace(dto.Cliente))
            return Result.Failure<Proposta>("Informe o cliente da proposta.");
        if (dto.Itens is null || dto.Itens.Count == 0)
            return Result.Failure<Proposta>("A proposta precisa de ao menos um item.");
        if (string.IsNullOrWhiteSpace(dto.Validade))
            return Result.Failure<Proposta>("Escolha a validade da proposta (cadastre as opções em Cadastros › Empresas, aba Proposta).");
        if (string.IsNullOrWhiteSpace(dto.ModeloId))
            return Result.Failure<Proposta>("Escolha o modelo da proposta (Configurações > Modelos de Proposta).");

        // Região do vendedor (lista de exclusão): conferida aqui, com a cidade do cadastro do cliente.
        // O cliente precisa vir do cadastro quando há vendedor; só o nome permitiria driblar o bloqueio.
        if (!string.IsNullOrEmpty(dto.VendedorId))
        {
            if (string.IsNullOrEmpty(dto.ClienteId))
                return Result.Failure<Proposta>("Escolha o cliente pelo cadastro (Cadastros > Clientes).");
            var vendedor = await _vendedores.GetByIdAsync(dto.VendedorId);
            var cliente = await _clientes.GetByIdAsync(dto.ClienteId);
            if (cliente is null)
                return Result.Failure<Proposta>("Cliente não encontrado no cadastro.");
            if (vendedor is not null)
            {
                var bloqueio = RegiaoVendedor.Bloqueio(vendedor.RegioesBloqueadas, cliente.Cidade);
                if (bloqueio is not null)
                    return Result.Failure<Proposta>(
                        $"O vendedor {vendedor.Nome} não atende a região do cliente ({cliente.Cidade}): bloqueado em \"{bloqueio.Valor}\".");
            }
        }

        // Piso: o fator calculado é o mínimo, então margem líquida abaixo do lucro da empresa
        // (desconto ou preço menor) fica abaixo do mínimo. Conferido aqui, não só na tela.
        var empresas = await _empresas.GetAllAsync();
        var abaixoDoMinimo = false;
        foreach (var item in dto.Itens)
        {
            var emp = empresas.FirstOrDefault(e => e.Id == item.EmpresaId);
            item.AdValorem = Math.Max(0, Math.Round(item.AdValorem, 2));
            item.AbaixoMinimo = emp is not null && emp.Dv.Lucro > 0 && item.Ml < emp.Dv.Lucro - 0.00005m;
            abaixoDoMinimo |= item.AbaixoMinimo;
        }

        var precoEditado = dto.PrecoOriginal > 0 || dto.Itens.Any(i => i.PrecoCalculado > 0);
        var ehGestor = quem.EhGestor;
        var motivo = precoEditado ? "preco-editado" : abaixoDoMinimo && !ehGestor ? "abaixo-markup-minimo" : string.Empty;
        var precisaAprovacao = motivo.Length > 0;

        if (precisaAprovacao && string.IsNullOrWhiteSpace(dto.Justificativa))
            return Result.Failure<Proposta>(motivo == "preco-editado"
                ? "Escreva a justificativa do preço negociado para pedir a aprovação."
                : "O preço ficou abaixo do fator da empresa (a margem não cobre o lucro). Escreva a justificativa para pedir a aprovação.");

        var nova = new Proposta
        {
            Id = existente?.Id ?? Guid.NewGuid().ToString(),
            // Sequência do banco: duas propostas criadas ao mesmo tempo nunca repetem o número.
            // A empresa que emite (a do primeiro item) define o padrão do número (ex.: SIN-0001).
            Numero = existente?.Numero ?? await _numerador.ProximoAsync(dto.Itens.FirstOrDefault()?.EmpresaId),
            Cliente = dto.Cliente.Trim(),
            ClienteId = dto.ClienteId ?? string.Empty,
            VendedorId = dto.VendedorId ?? string.Empty,
            VendedorNome = dto.VendedorNome ?? string.Empty,
            Status = precisaAprovacao ? "pendente" : "rascunho",
            Data = existente?.Data ?? DateTime.Now.ToString("dd/MM/yyyy"),
            Total = dto.Total,
            ModeloId = dto.ModeloId,
            PrazoEntrega = dto.PrazoEntrega ?? string.Empty,
            Validade = dto.Validade,
            FormaPagamento = dto.FormaPagamento ?? string.Empty,
            PrazoPagamentoDias = Math.Max(0, dto.PrazoPagamentoDias),
            Itens = dto.Itens,
            PrecoOriginal = dto.PrecoOriginal,
            Justificativa = dto.Justificativa?.Trim() ?? string.Empty,
            MotivoAprovacao = motivo,
        };

        if (precisaAprovacao)
            nova.RegraId = (await RegraDaProposta(nova))?.Id ?? string.Empty;

        if (existente is not null)
        {
            var editada = await _propostas.UpdateAsync(existente.Id, nova) ?? nova;
            await _auditoria.RegistrarAsync("editar", "Proposta", editada.Id,
                $"Proposta {editada.Numero} editada ({editada.Status}, total {editada.Total:N2})" +
                (precisaAprovacao ? $" — pede aprovação: {motivo}" : string.Empty),
                new { itens = existente.Itens.Count, total = existente.Total, status = existente.Status },
                new { itens = editada.Itens.Count, total = editada.Total, status = editada.Status });
            return Result.Success(editada);
        }

        var criada = await _propostas.AddAsync(nova);
        await _auditoria.RegistrarAsync("criar", "Proposta", criada.Id,
            $"Proposta {criada.Numero} criada para {criada.Cliente} ({criada.Status}, total {criada.Total:N2})" +
            (precisaAprovacao ? $" — pede aprovação: {motivo}" : string.Empty));
        return Result.Success(criada);
    }

    public async Task<Result<Proposta>> AprovarAsync(string id, UsuarioAtual quem)
    {
        var p = await _propostas.GetByIdAsync(id);
        if (p is null) return Result.Failure<Proposta>("Proposta não encontrada.");
        if (p.Status != "pendente") return Result.Failure<Proposta>("A proposta não está pendente de aprovação.");

        var regra = string.IsNullOrEmpty(p.RegraId) ? null : await _regras.GetByIdAsync(p.RegraId);
        var exigidos = regra?.Aprovadores ?? new List<string>();
        if (exigidos.Count > 0 && !exigidos.Contains(quem.Id))
            return Result.Failure<Proposta>("Você não está entre os aprovadores desta faixa.");

        if (!p.Aprovacoes.Any(a => a.UsuarioId == quem.Id))
            p.Aprovacoes.Add(new AprovacaoProposta { UsuarioId = quem.Id, Nome = quem.Nome, Em = DateTime.UtcNow.ToString("o") });

        var assinaram = p.Aprovacoes.Select(a => a.UsuarioId).ToHashSet();
        if (exigidos.Count == 0 || exigidos.All(assinaram.Contains))
            p.Status = "aprovada";

        await _propostas.UpdateAsync(id, p);
        await _auditoria.RegistrarAsync("aprovar", "Proposta", p.Id,
            p.Status == "aprovada"
                ? $"Proposta {p.Numero} aprovada (motivo da alçada: {p.MotivoAprovacao})"
                : $"Proposta {p.Numero}: assinatura registrada, faltam outros aprovadores");
        // Automação do CRM: proposta aprovada leva o card para a etapa de ganho.
        if (p.Status == "aprovada") await _crm.MarcarGanhoPorPropostaAsync(p.Numero);
        return Result.Success(p);
    }

    public async Task<Result<Proposta>> AtualizarCustoRealAsync(string id, List<ItemProposta> itens)
    {
        var p = await _propostas.GetByIdAsync(id);
        if (p is null) return Result.Failure<Proposta>("Proposta não encontrada.");
        if (p.Status != "aprovada")
            return Result.Failure<Proposta>("O custo realizado só é lançado em proposta aprovada.");

        // Só o custo realizado entra; o resto do item (preço, margem, custos orçados) fica como foi aprovado.
        var enviados = itens.ToDictionary(i => i.Id, i => i.CustoReal);
        var antes = p.Itens.ToDictionary(i => i.Id, i => i.CustoReal);
        foreach (var item in p.Itens)
            if (enviados.TryGetValue(item.Id, out var custoReal))
                item.CustoReal = Math.Max(0, custoReal);

        await _propostas.UpdateAsync(id, p);
        var depois = p.Itens.ToDictionary(i => i.Id, i => i.CustoReal);
        await _auditoria.RegistrarAsync("custo-real", "Proposta", p.Id, $"Custo realizado lançado na proposta {p.Numero}", antes, depois);
        return Result.Success(p);
    }

    public async Task<Result<Proposta>> AlterarStatusAsync(string id, string status, UsuarioAtual quem)
    {
        if (!StatusValidos.Contains(status)) return Result.Failure<Proposta>("Status inválido.");
        var p = await _propostas.GetByIdAsync(id);
        if (p is null) return Result.Failure<Proposta>("Proposta não encontrada.");
        if (p.Status == status) return Result.Success(p);

        // "aprovada" só nasce da aprovação formal (assinaturas dos aprovadores da faixa).
        if (status == "aprovada")
            return Result.Failure<Proposta>("Use o botão \"Aprovar este preço\": a aprovação registra quem aprovou.");
        // Quem não aprova não tira a proposta da fila de aprovação (nem para "enviada" ou "rascunho").
        if (p.Status == "pendente" && !quem.PodeAprovar)
            return Result.Failure<Proposta>("A proposta está aguardando aprovação; só um aprovador pode alterar o status.");
        // Uma proposta aprovada não volta a pendente/rascunho pela mão de quem não aprova.
        if (p.Status == "aprovada" && !quem.PodeAprovar)
            return Result.Failure<Proposta>("A proposta já foi aprovada; só um aprovador pode alterar o status.");

        var de = p.Status;
        p.Status = status;
        await _propostas.UpdateAsync(id, p);
        await _auditoria.RegistrarAsync("status", "Proposta", p.Id, $"Proposta {p.Numero}: status {de} → {status}",
            new { status = de }, new { status });
        return Result.Success(p);
    }

    /// <summary>Regra de alçada que cobre esta proposta (por margem média ou por valor).</summary>
    private async Task<RegraAprovacao?> RegraDaProposta(Proposta p)
    {
        var total = p.Itens.Sum(i => i.PrecoFinal);
        var mlMedia = total > 0 ? p.Itens.Sum(i => i.Ml * i.PrecoFinal) / total : 0m;
        var regras = (await _regras.GetAllAsync()).Where(r => r.Status == "ativo" && r.EhProposta);
        return regras.FirstOrDefault(r => r.Cobre(r.Base == "valor" ? total : mlMedia));
    }
}
