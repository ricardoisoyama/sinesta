using Elrond.API.Security;
using Elrond.Application.Interfaces;
using Elrond.Application.Services;
using Elrond.Domain.Entities;
using Elrond.Domain.Regras;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Elrond.API.Controllers;

[Route("api/taxas")]
public class TaxasController(ICrudRepository<Taxa> repo) : CrudControllerBase<Taxa>(repo);

[Route("api/plano-contas")]
public class PlanoContasController(ICrudRepository<PlanoConta> repo) : CrudControllerBase<PlanoConta>(repo);

[Route("api/custos-fixos")]
public class CustosFixosController(ICrudRepository<CustoFixo> repo, ICompraService compras, UsuarioContexto usuario)
    : CrudControllerBase<CustoFixo>(repo)
{
    /// <summary>Lançar despesa (uma ou em lote) respeita a Regra de Compras do comprador logado.</summary>
    protected override async Task<string?> AntesDeGravarAsync(CustoFixo entity)
    {
        // Recorrente sem término = sem prazo final: grava 31/12/9999 (nunca vazio; exportação e filtros).
        if (entity.Tipo == "recorrente" && string.IsNullOrWhiteSpace(entity.DataFim)) entity.DataFim = CustoFixo.DataFimSemPrazo;
        var r = await compras.ValidarLimiteAsync(entity, await usuario.QuemAsync());
        return r.IsSuccess ? null : r.Error;
    }
}

[Route("api/empresas")]
public class EmpresasController(ICrudRepository<Empresa> repo, UsuarioContexto usuario, IPropostaNumerador numerador, IContratoNumerador numeradorContrato, ICertificadoService certificados) : CrudControllerBase<Empresa>(repo)
{
    private const string PermissaoMarkup = "/cadastros/unidades/markup";

    /// <summary>Envio do certificado A1: o arquivo .pfx em base64 e a senha (só trafegam aqui, nunca voltam).</summary>
    public record CertificadoEnvio(string ArquivoBase64, string Senha, string NomeArquivo);

    /// <summary>Situação do certificado da empresa (titular, CNPJ, validade), sem o arquivo nem a senha.</summary>
    [HttpGet("{id}/certificado")]
    public async Task<IActionResult> Certificado(string id, CancellationToken ct)
    {
        if (await Repo.GetByIdAsync(id) is null) return NotFound();
        return Ok(new { disponivel = certificados.Disponivel, certificado = await certificados.InfoAsync(id, ct) });
    }

    /// <summary>Guarda (ou troca) o certificado: confere a senha, a validade e o CNPJ antes.</summary>
    [HttpPut("{id}/certificado")]
    public async Task<IActionResult> EnviarCertificado(string id, [FromBody] CertificadoEnvio envio, CancellationToken ct)
    {
        byte[] arquivo;
        try
        {
            var b64 = envio.ArquivoBase64 ?? string.Empty;
            arquivo = Convert.FromBase64String(b64.Contains(',') ? b64[(b64.IndexOf(',') + 1)..] : b64);
        }
        catch (FormatException)
        {
            return BadRequest("Arquivo do certificado inválido.");
        }
        var quem = await usuario.QuemAsync();
        var r = await certificados.SalvarAsync(id, arquivo, envio.Senha ?? string.Empty, envio.NomeArquivo ?? string.Empty, quem.Nome, ct);
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }

    [HttpDelete("{id}/certificado")]
    public async Task<IActionResult> RemoverCertificado(string id, CancellationToken ct) =>
        await certificados.RemoverAsync(id, ct) ? NoContent() : NotFound();

    /// <summary>Validades: sem vazias nem repetidas, e no máximo uma padrão.</summary>
    private static void NormalizarValidades(Empresa e)
    {
        var vistas = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var lista = new List<ValidadeEmpresa>();
        foreach (var v in e.ValidadesProposta ?? new())
        {
            v.Descricao = (v.Descricao ?? string.Empty).Trim();
            if (v.Descricao.Length == 0 || !vistas.Add(v.Descricao)) continue;
            if (string.IsNullOrWhiteSpace(v.Id)) v.Id = Guid.NewGuid().ToString("N");
            lista.Add(v);
        }
        var padrao = lista.FirstOrDefault(v => v.Padrao);
        foreach (var v in lista) v.Padrao = ReferenceEquals(v, padrao);
        e.ValidadesProposta = lista;
    }

    /// <summary>Situação da numeração das propostas e dos contratos da empresa (a tela trava o campo quando já emitiu).</summary>
    [HttpGet("{id}/numeracao")]
    public async Task<IActionResult> Numeracao(string id)
    {
        var e = await Repo.GetByIdAsync(id);
        if (e is null) return NotFound();
        var emitidas = await numerador.EmitidasAsync(id);
        var contratos = await numeradorContrato.EmitidosAsync(id);
        return Ok(new { emitidas, travado = emitidas > 0, contratos, contratoTravado = contratos > 0 });
    }

    /// <summary>
    /// Prefixos do número da proposta e do contrato: letras, números e hífen (até 15), únicos entre as
    /// empresas, o padrão do sistema reservado (PROP, CTR) e travados depois do primeiro documento emitido.
    /// </summary>
    private async Task<string?> ValidarNumeracaoAsync(Empresa e, Empresa? atual)
    {
        e.PropostaPrefixo = (e.PropostaPrefixo ?? string.Empty).Trim().ToUpperInvariant();
        e.ContratoPrefixo = (e.ContratoPrefixo ?? string.Empty).Trim().ToUpperInvariant();
        if (e.PropostaDigitos is < 3 or > 8) e.PropostaDigitos = 4;
        if (e.ContratoDigitos is < 3 or > 8) e.ContratoDigitos = 4;
        return await ValidarPrefixoAsync("da proposta", "proposta(s)", "PROP", e.PropostaPrefixo, e.PropostaDigitos, atual?.PropostaPrefixo, atual?.PropostaDigitos,
                x => x.Id != e.Id && x.PropostaPrefixo == e.PropostaPrefixo, () => numerador.EmitidasAsync(e.Id))
            ?? await ValidarPrefixoAsync("do contrato", "contrato(s)", "CTR", e.ContratoPrefixo, e.ContratoDigitos, atual?.ContratoPrefixo, atual?.ContratoDigitos,
                x => x.Id != e.Id && x.ContratoPrefixo == e.ContratoPrefixo, () => numeradorContrato.EmitidosAsync(e.Id));
    }

    private async Task<string?> ValidarPrefixoAsync(string de, string docs, string padrao, string p, int digitos, string? antes, int? digitosAntes,
        System.Linq.Expressions.Expression<Func<Empresa, bool>> mesmoPrefixo, Func<Task<long>> emitidos)
    {
        if (p.Length > 0)
        {
            if (!System.Text.RegularExpressions.Regex.IsMatch(p, "^[A-Z0-9][A-Z0-9-]{0,14}$") || p.EndsWith('-'))
                return $"O prefixo {de} aceita só letras, números e hífen (até 15 caracteres), sem hífen no fim. Ex.: SIN ou SINESTA.";
            if (p == padrao) return $"\"{padrao}\" é o padrão do sistema. Escolha outro prefixo para a empresa (ex.: SIN).";
            var outras = await Repo.ListarAsync(mesmoPrefixo);
            if (outras.Count > 0) return $"O prefixo \"{p}\" já é usado pela empresa {outras[0].Nome}. Cada empresa precisa do seu.";
        }
        if (antes is not null && (antes != p || digitosAntes != digitos) && await emitidos() is > 0 and var n)
            return $"A empresa já emitiu {n} {docs} no padrão {antes}-{new string('0', Math.Max(0, (digitosAntes ?? 4) - 1))}1: o padrão não pode mais mudar.";
        return null;
    }

    /// <summary>Sem a permissão especial de markup, os campos de markup não mudam (nem por chamada direta à API).</summary>
    public override async Task<IActionResult> Create([FromBody] Empresa entity)
    {
        if (await ValidarNumeracaoAsync(entity, null) is { } erroNum) return BadRequest(erroNum);
        NormalizarValidades(entity);
        if (!await usuario.PodeAsync(PermissaoMarkup))
        {
            entity.MarkupMinimo = 0;
            entity.Dv.Lucro = 0;
        }
        var r = await base.Create(entity);
        if (r is OkObjectResult { Value: Empresa criada }) await DesmarcarOutrasPadraoAsync(criada);
        return r;
    }

    public override async Task<IActionResult> Update(string id, [FromBody] Empresa entity)
    {
        var atual = await Repo.GetByIdAsync(id);
        if (atual is null) return NotFound();
        entity.Id = id;
        if (await ValidarNumeracaoAsync(entity, atual) is { } erroNum) return BadRequest(erroNum);
        NormalizarValidades(entity);
        if (!await usuario.PodeAsync(PermissaoMarkup))
        {
            entity.MarkupMinimo = atual.MarkupMinimo;
            entity.Dv.Lucro = atual.Dv.Lucro;
        }
        var r = await base.Update(id, entity);
        if (r is OkObjectResult { Value: Empresa salva }) await DesmarcarOutrasPadraoAsync(salva);
        return r;
    }

    /// <summary>Só uma empresa padrão: marcar uma desmarca as outras.</summary>
    private async Task DesmarcarOutrasPadraoAsync(Empresa e)
    {
        if (!e.Padrao) return;
        foreach (var o in await Repo.ListarAsync(x => x.Padrao && x.Id != e.Id))
        {
            o.Padrao = false;
            await Repo.UpdateAsync(o.Id, o);
        }
    }
}

[Route("api/metas")]
public class MetasController(ICrudRepository<Meta> repo, UsuarioContexto usuario) : CrudControllerBase<Meta>(repo)
{
    /// <summary>Metas são definidas pela gestão; os demais só consultam (a tela esconde os botões, a API confere).</summary>
    private async Task<IActionResult?> SoGestorAsync() =>
        await usuario.EhGestorAsync() ? null : StatusCode(StatusCodes.Status403Forbidden, "Só um gestor define metas.");

    /// <summary>
    /// Anual "X% sobre o ano anterior": o servidor refaz a conta com a meta do ano anterior
    /// (a mesma que compõe o fator naquele ano), para a tela não ser a fonte da verdade.
    /// Meta inativada não refaz (inativar não pode falhar porque a do ano anterior mudou).
    /// </summary>
    private async Task<string?> NormalizarAsync(Meta m)
    {
        m.ValoresMensais ??= new();
        if (m.OrigemAnual != Meta.AnualAnoAnterior || m.Status == "inativo") return null;
        var doAnoAnterior = await Repo.ListarAsync(x => x.EmpresaId == m.EmpresaId && x.Ano == m.Ano - 1 && x.Id != m.Id);
        var (anterior, _) = FatorService.MetaDoAno(doAnoAnterior, m.EmpresaId, m.Ano - 1);
        if (anterior is null || anterior.TotalDoAno <= 0)
            return $"Não há meta ativa de {m.Ano - 1} desta empresa para calcular \"% sobre o ano anterior\". Digite o valor anual.";
        m.BaseAnoAnterior = anterior.TotalDoAno;
        m.MetaAnual = Meta.AnualSobreAnterior(anterior.TotalDoAno, m.CrescimentoAnoAnterior);
        return null;
    }

    /// <summary>Só uma meta principal por empresa e ano: marcar uma desmarca as outras.</summary>
    private async Task DesmarcarOutrasPrincipaisAsync(Meta m)
    {
        if (!m.Principal || string.IsNullOrEmpty(m.EmpresaId)) return;
        var outras = await Repo.ListarAsync(x => x.EmpresaId == m.EmpresaId && x.Ano == m.Ano && x.Principal && x.Id != m.Id);
        foreach (var o in outras)
        {
            o.Principal = false;
            await Repo.UpdateAsync(o.Id, o);
        }
    }

    public override async Task<IActionResult> Create([FromBody] Meta entity)
    {
        if (await SoGestorAsync() is { } negado) return negado;
        if (await NormalizarAsync(entity) is { } erro) return BadRequest(erro);
        var r = await base.Create(entity);
        if (r is OkObjectResult { Value: Meta criada }) await DesmarcarOutrasPrincipaisAsync(criada);
        return r;
    }

    public override async Task<IActionResult> CreateMany([FromBody] List<Meta> entities)
    {
        if (await SoGestorAsync() is { } negado) return negado;
        for (var i = 0; i < entities.Count; i++)
            if (await NormalizarAsync(entities[i]) is { } erro) return BadRequest($"Linha {i + 1}: {erro}");
        return await base.CreateMany(entities);
    }

    public override async Task<IActionResult> Update(string id, [FromBody] Meta entity)
    {
        if (await SoGestorAsync() is { } negado) return negado;
        if (await NormalizarAsync(entity) is { } erro) return BadRequest(erro);
        var r = await base.Update(id, entity);
        if (r is OkObjectResult { Value: Meta salva }) await DesmarcarOutrasPrincipaisAsync(salva);
        return r;
    }

    public override async Task<IActionResult> Delete(string id) =>
        await SoGestorAsync() ?? await base.Delete(id);
}

[Route("api/modelos-proposta")]
public class ModelosPropostaController(ICrudRepository<ModeloProposta> repo) : CrudControllerBase<ModeloProposta>(repo);

[Route("api/servicos")]
public class ServicosController(ICrudRepository<Servico> repo) : CrudControllerBase<Servico>(repo);

[Route("api/tipos-custo")]
public class TiposCustoController(ICrudRepository<TipoCusto> repo) : CrudControllerBase<TipoCusto>(repo);

[Route("api/veiculos")]
public class VeiculosController(ICrudRepository<Veiculo> repo) : CrudControllerBase<Veiculo>(repo)
{
    /// <summary>Placas no formato padrão e placa de tração única entre os veículos ativos.</summary>
    protected override async Task<string?> AntesDeGravarAsync(Veiculo entity)
    {
        entity.Normalizar();
        if (entity.Status == "inativo") return null;
        var placa = entity.PlacaTracao;
        var repetido = (await Repo.ListarAsync(v => v.PlacaTracao == placa && v.Status != "inativo" && v.Id != entity.Id)).FirstOrDefault();
        return repetido is null ? null : $"Já existe um veículo ativo com a placa {Veiculo.PlacaFormatada(placa)}.";
    }
}

[Route("api/validades-proposta")]
public class ValidadesPropostaController(ICrudRepository<ValidadeProposta> repo) : CrudControllerBase<ValidadeProposta>(repo);

[Route("api/categorias-custo")]
public class CategoriasCustoController(ICrudRepository<CategoriaCusto> repo) : CrudControllerBase<CategoriaCusto>(repo);

[Route("api/regras-aprovacao")]
public class RegrasAprovacaoController(ICrudRepository<RegraAprovacao> repo) : CrudControllerBase<RegraAprovacao>(repo);

[Route("api/funis")]
public class FunisController(ICrudRepository<Funil> repo) : CrudControllerBase<Funil>(repo);

[Route("api/oportunidades")]
public class OportunidadesController(ICrudRepository<Oportunidade> repo, IOportunidadeService crm, ICarteiraService carteira, UsuarioContexto usuario, IGoogleAgendaService google)
    : CrudControllerBase<Oportunidade>(repo)
{
    // A próxima ação do card acompanha no Google Agenda do responsável.
    public override async Task<IActionResult> Create([FromBody] Oportunidade entity)
    {
        var r = await base.Create(entity);
        if (r is OkObjectResult { Value: Oportunidade o }) await google.OportunidadeMudouAsync(o.Id);
        return r;
    }

    public override async Task<IActionResult> Update(string id, [FromBody] Oportunidade entity)
    {
        var r = await base.Update(id, entity);
        if (r is OkObjectResult) await google.OportunidadeMudouAsync(id);
        return r;
    }

    public override async Task<IActionResult> Delete(string id)
    {
        var r = await base.Delete(id);
        if (r is NoContentResult) await google.OportunidadeMudouAsync(id);
        return r;
    }

    /// <summary>Vendedor vê só os cards da própria carteira; gestor vê todos.</summary>
    public override async Task<IActionResult> GetAll()
    {
        var visao = await carteira.VisaoAsync(await usuario.QuemAsync());
        var todos = await Repo.GetAllAsync();
        return Ok(visao.VeTudo ? todos : todos.Where(visao.VeOportunidade).ToList());
    }

    public override async Task<IActionResult> GetById(string id)
    {
        var o = await Repo.GetByIdAsync(id);
        if (o is null) return NotFound();
        var visao = await carteira.VisaoAsync(await usuario.QuemAsync());
        return visao.VeOportunidade(o) ? Ok(o) : NotFound();
    }

    /// <summary>Vendedor bloqueado na região do cliente não pode ficar com o card (nem via lote).</summary>
    protected override async Task<string?> AntesDeGravarAsync(Oportunidade entity)
    {
        var r = await crm.ValidarRegiaoAsync(entity);
        return r.IsSuccess ? null : r.Error;
    }
}

[Route("api/clientes")]
public class ClientesController(ICrudRepository<Cliente> repo, ICarteiraService carteira, UsuarioContexto usuario) : CrudControllerBase<Cliente>(repo)
{
    /// <summary>Função em branco = mantém o vendedor atual daquela função.</summary>
    public record TransferirClientesDto(List<string> ClienteIds, string? VendedorSdrId, string? VendedorSalesId, string? VendedorCsId);

    /// <summary>Move os clientes selecionados na lista para vendedores, por função (mesma permissão especial da carteira).</summary>
    [HttpPost("transferir-carteira")]
    [Authorize(Policy = "func:/cadastros/vendedores/transferir")]
    public async Task<IActionResult> TransferirClientes([FromBody] TransferirClientesDto dto)
    {
        var r = await carteira.TransferirClientesAsync(dto.ClienteIds, dto.VendedorSdrId, dto.VendedorSalesId, dto.VendedorCsId);
        return r.IsSuccess ? Ok(new { clientes = r.Value }) : BadRequest(r.Error);
    }

    /// <summary>Vendedor vê só a própria carteira (clientes em que é SDR, Sales ou CS); gestor vê todos.</summary>
    public override async Task<IActionResult> GetAll()
    {
        var visao = await carteira.VisaoAsync(await usuario.QuemAsync());
        var todos = await Repo.GetAllAsync();
        return Ok(visao.VeTudo ? todos : todos.Where(visao.VeCliente).ToList());
    }

    public override async Task<IActionResult> GetById(string id)
    {
        var c = await Repo.GetByIdAsync(id);
        if (c is null) return NotFound();
        var visao = await carteira.VisaoAsync(await usuario.QuemAsync());
        return visao.VeCliente(c) ? Ok(c) : NotFound();
    }

}

/// <summary>Tabela de ICMS por UF de origem × destino (única do sistema). PUT grava só as linhas enviadas.</summary>
[ApiController]
[Authorize]
[Route("api/aliquotas-icms")]
public class AliquotasIcmsController(TabelaIcmsService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Listar() => Ok(await service.ListarAsync());

    [HttpPut]
    public async Task<IActionResult> Salvar([FromBody] List<AliquotaIcms> linhas)
    {
        var r = await service.SalvarAsync(linhas ?? new());
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }
}

[Route("api/fornecedores")]
public class FornecedoresController(ICrudRepository<Fornecedor> repo) : CrudControllerBase<Fornecedor>(repo);

/// <summary>Apólices de seguro (RCTR-C, RCF-DC...), cada uma ligada a um fornecedor seguradora.</summary>
[Route("api/apolices")]
public class ApolicesController(ICrudRepository<Apolice> repo, ICrudRepository<Fornecedor> fornecedores) : CrudControllerBase<Apolice>(repo)
{
    protected override string NomeEntidade => "Apólice";

    protected override async Task<string?> AntesDeGravarAsync(Apolice entity)
    {
        if (ApolicesSeguro.Normalizar(entity) is { } erro) return erro;
        var f = await fornecedores.GetByIdAsync(entity.SeguradoraId);
        return f is { Seguradora: true } ? null : "Escolha uma seguradora (fornecedor com a caixa \"Seguradora\" marcada).";
    }
}

[Route("api/vendedores")]
public class VendedoresController(ICrudRepository<Vendedor> repo, ICarteiraService carteira) : CrudControllerBase<Vendedor>(repo)
{
    public record TransferirCarteiraDto(string ParaVendedorId);

    /// <summary>Passa a carteira de clientes deste vendedor para outro (exige a permissão especial).</summary>
    [HttpPost("{id}/transferir-carteira")]
    [Authorize(Policy = "func:/cadastros/vendedores/transferir")]
    public async Task<IActionResult> TransferirCarteira(string id, [FromBody] TransferirCarteiraDto dto)
    {
        var r = await carteira.TransferirAsync(id, dto.ParaVendedorId);
        return r.IsSuccess ? Ok(new { clientes = r.Value }) : BadRequest(r.Error);
    }
}

/// <summary>Compromissos da Agenda. Sem responsável, o compromisso fica com quem criou.</summary>
[Route("api/compromissos")]
public class CompromissosController(ICrudRepository<Compromisso> repo, UsuarioContexto usuario, IGoogleAgendaService google) : CrudControllerBase<Compromisso>(repo)
{
    // Depois de gravar, o compromisso vai (ou sai) do Google Agenda do responsável.
    public override async Task<IActionResult> Create([FromBody] Compromisso entity)
    {
        var r = await base.Create(entity);
        if (r is OkObjectResult { Value: Compromisso c }) await google.CompromissoMudouAsync(c.Id);
        return r;
    }

    public override async Task<IActionResult> Update(string id, [FromBody] Compromisso entity)
    {
        var r = await base.Update(id, entity);
        if (r is OkObjectResult) await google.CompromissoMudouAsync(id);
        return r;
    }

    public override async Task<IActionResult> Delete(string id)
    {
        var r = await base.Delete(id);
        if (r is NoContentResult) await google.CompromissoMudouAsync(id);
        return r;
    }

    protected override async Task<string?> AntesDeGravarAsync(Compromisso entity)
    {
        if (string.IsNullOrWhiteSpace(entity.ResponsavelId) && await usuario.AtualAsync() is { } eu)
        {
            entity.ResponsavelId = eu.Id.ToString();
            entity.ResponsavelNome = eu.Name;
        }
        return null;
    }
}

[Route("api/motoristas")]
public class MotoristasController(ICrudRepository<Motorista> repo) : CrudControllerBase<Motorista>(repo)
{
    /// <summary>CPF só com dígitos e único entre os motoristas ativos.</summary>
    protected override async Task<string?> AntesDeGravarAsync(Motorista entity)
    {
        entity.Normalizar();
        if (entity.Nome.Length < 2) return "Informe o nome do motorista.";
        if (entity.Cpf.Length is > 0 and not 11) return "CPF inválido: informe os 11 dígitos.";
        if (entity.Status == "inativo" || entity.Cpf.Length == 0) return null;
        var cpf = entity.Cpf;
        var repetido = (await Repo.ListarAsync(m => m.Cpf == cpf && m.Status != "inativo" && m.Id != entity.Id)).FirstOrDefault();
        return repetido is null ? null : $"Já existe um motorista ativo com este CPF ({repetido.Nome}).";
    }
}

/// <summary>
/// Menus do ambiente: todo mundo lê (o menu se monta com isso); só a equipe ELROND altera.
/// </summary>
[ApiController]
[Route("api/configuracao-sistema")]
public class ConfiguracaoSistemaController(ICrudRepository<ConfiguracaoSistema> repo, IAuditoriaService auditoria, UsuarioContexto usuario) : ControllerBase
{
    public record SalvarModulosDto(List<string>? MenusDesligados);

    private async Task<ConfiguracaoSistema> AtualAsync() =>
        await repo.GetByIdAsync(ConfiguracaoSistema.IdPadrao)
        ?? new ConfiguracaoSistema { MenusDesligados = ConfiguracaoSistema.DesligadosPorPadrao.ToList() };

    [HttpGet]
    [Authorize]
    public async Task<IActionResult> Obter() => Ok(new { menusDesligados = (await AtualAsync()).MenusDesligados });

    [HttpPut]
    [Authorize(Policy = "func:/administrativo/modulos")]
    public async Task<IActionResult> Salvar([FromBody] SalvarModulosDto dto)
    {
        // A tela de módulos nunca se desliga (senão ninguém liga de volta).
        var desligados = (dto.MenusDesligados ?? new()).Where(p => p.StartsWith('/') && p != "/administrativo/modulos").Distinct().ToList();
        var existente = await repo.GetByIdAsync(ConfiguracaoSistema.IdPadrao);
        var antes = existente?.MenusDesligados ?? ConfiguracaoSistema.DesligadosPorPadrao.ToList();
        if (existente is null) await repo.AddAsync(new ConfiguracaoSistema { MenusDesligados = desligados });
        else
        {
            existente.MenusDesligados = desligados;
            await repo.UpdateAsync(existente.Id, existente);
        }
        var quem = await usuario.QuemAsync();
        await auditoria.RegistrarAsync("editar", "ConfiguracaoSistema", ConfiguracaoSistema.IdPadrao,
            $"{quem.Nome} alterou os módulos do menu: desligados {(desligados.Count == 0 ? "nenhum" : string.Join(", ", desligados))}", new { menusDesligados = antes }, new { menusDesligados = desligados });
        return Ok(new { menusDesligados = desligados });
    }
}
