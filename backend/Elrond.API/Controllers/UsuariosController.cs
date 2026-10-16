using Elrond.API.Security;
using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Elrond.API.Controllers;

/// <summary>
/// Funcionários/usuários do portal. Regras de escalada: só Admin (a nossa equipe, "Suporte")
/// cria, promove ou altera Admin; só Gestor cria/promove Gestor e concede permissões especiais;
/// ninguém muda o próprio perfil, permissões ou status; o último Gestor ativo não pode ser
/// rebaixado nem desativado.
/// </summary>
[ApiController]
[Authorize]
[Route("api/usuarios")]
public class UsuariosController : ControllerBase
{
    private static readonly IReadOnlyList<string> PerfisValidos = Perfis.Validos;
    public const int SenhaMinima = 8;

    private readonly IUsuarioRepository _repo;
    private readonly IPasswordHasher _hasher;
    private readonly UsuarioContexto _usuario;
    private readonly IAuditoriaService _auditoria;

    public UsuariosController(IUsuarioRepository repo, IPasswordHasher hasher, UsuarioContexto usuario, IAuditoriaService auditoria)
    {
        _repo = repo;
        _hasher = hasher;
        _usuario = usuario;
        _auditoria = auditoria;
    }

    /// <summary>Retrato do usuário para a trilha (sem hash de senha).</summary>
    private static object Retrato(User u) => new
    {
        nome = u.Name, email = u.Email, perfil = u.Perfil, permissoes = u.Permissoes, ativo = u.Ativo,
        cargo = u.Cargo, departamento = u.Departamento, cpf = u.Cpf, rg = u.Rg, telefone = u.Telefone, dataAdmissao = u.DataAdmissao,
        // Troca de conta bancária fica no histórico (é o tipo de alteração que precisa de rastro).
        cidade = u.Cidade, endereco = u.Endereco, banco = u.Banco,
    };

    private static UsuarioDto ToDto(User u) =>
        new(u.Id.ToString(), u.Name, u.Email, u.Perfil, u.Permissoes, u.Ativo ? "ativo" : "inativo",
            u.Cargo, u.Departamento, u.Cpf, u.Rg, u.Telefone, u.DataAdmissao, u.Cidade, u.Endereco, u.Banco);

    private static void AplicarDadosPessoais(User user, SalvarUsuarioDto dto)
    {
        user.AtualizarDadosRh(dto.Cargo, dto.Departamento, dto.Cpf, dto.Rg, dto.Telefone, dto.DataAdmissao);
        user.AtualizarEndereco(dto.Cidade, dto.Endereco);
        user.AtualizarDadosBancarios(dto.Banco);
    }

    /// <summary>Versão enxuta para quem não tem a tela de Usuários (combos de vendedor/aprovador): sem CPF, RG, telefone e permissões.</summary>
    private static UsuarioDto ToDtoResumido(User u) =>
        new(u.Id.ToString(), u.Name, u.Email, u.Perfil, Array.Empty<string>(), u.Ativo ? "ativo" : "inativo",
            u.Cargo, u.Departamento, string.Empty, string.Empty, string.Empty, string.Empty);

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var completo = await _usuario.PodeAsync("/cadastros/usuarios");
        var todos = await _repo.GetAllAsync();
        return Ok(completo ? todos.Select(ToDto) : todos.Select(ToDtoResumido));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SalvarUsuarioDto dto)
    {
        if (await ValidarAsync(dto, atual: null) is { } erro) return BadRequest(erro);
        if (string.IsNullOrWhiteSpace(dto.Senha))
            return BadRequest($"Informe a senha inicial (mínimo {SenhaMinima} caracteres).");
        if (await EmailEmUsoAsync(dto.Email, ignorarId: null))
            return BadRequest("Já existe um usuário com este e-mail.");

        var user = new User(dto.Email, dto.Nome, _hasher.Hash(dto.Senha),
            dto.Perfil, PermissoesConhecidas(dto.Permissoes), dto.Status != "inativo");
        AplicarDadosPessoais(user, dto);
        await _repo.AddAsync(user);
        await _auditoria.RegistrarAsync("criar", "Usuario", user.Id.ToString(), $"Usuário \"{user.Name}\" ({user.Email}) criado como {user.Perfil}");
        return Ok(ToDto(user));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] SalvarUsuarioDto dto)
    {
        var user = await _repo.GetByIdAsync(id);
        if (user is null) return NotFound();
        if (await ValidarAsync(dto, atual: user) is { } erro) return BadRequest(erro);
        if (await EmailEmUsoAsync(dto.Email, ignorarId: user.Id))
            return BadRequest("Já existe um usuário com este e-mail.");

        var eu = await _usuario.AtualAsync();
        var editandoAMimMesmo = eu is not null && eu.Id == user.Id;
        var ativo = dto.Status != "inativo";

        // Ninguém muda o próprio perfil, permissões ou status: evita se promover ou se trancar fora.
        var perfil = editandoAMimMesmo ? user.Perfil : dto.Perfil;
        var permissoes = editandoAMimMesmo ? user.Permissoes : PermissoesConhecidas(dto.Permissoes);
        if (editandoAMimMesmo) ativo = user.Ativo;

        // O último Gestor ativo não pode ser rebaixado nem desativado.
        if (user.Perfil == "Gestor" && user.Ativo && (perfil != "Gestor" || !ativo) && await EhUltimoGestorAtivoAsync(user.Id))
            return BadRequest("Este é o único gestor ativo. Cadastre outro gestor antes de rebaixá-lo ou desativá-lo.");

        var antes = Retrato(user);
        user.AtualizarCadastro(dto.Email, dto.Nome, perfil, permissoes, ativo);
        AplicarDadosPessoais(user, dto);
        // Senha em branco no edit = manter a atual.
        var trocouSenha = !string.IsNullOrWhiteSpace(dto.Senha);
        if (trocouSenha)
            user.DefinirSenha(_hasher.Hash(dto.Senha!));
        await _repo.SaveAsync();
        await _auditoria.RegistrarAsync("editar", "Usuario", user.Id.ToString(),
            $"Usuário \"{user.Name}\" alterado" + (trocouSenha ? " (senha redefinida)" : string.Empty), antes, Retrato(user));
        return Ok(ToDto(user));
    }

    /// <summary>Regras comuns a criar/editar. Devolve a mensagem do problema ou null.</summary>
    private async Task<string?> ValidarAsync(SalvarUsuarioDto dto, User? atual)
    {
        if (string.IsNullOrWhiteSpace(dto.Nome)) return "Informe o nome.";
        if (string.IsNullOrWhiteSpace(dto.Email) || !dto.Email.Contains('@')) return "Informe um e-mail válido.";
        if (!PerfisValidos.Contains(dto.Perfil)) return "Perfil inválido. Use Gestor ou Colaborador.";        if (!string.IsNullOrEmpty(dto.Senha) && dto.Senha.Length < SenhaMinima)
            return $"A senha precisa ter ao menos {SenhaMinima} caracteres.";

        // Admin (Suporte) é da nossa equipe: só outro Admin cria, promove ou mexe nele.
        if (await _usuario.EhAdminAsync()) return null;
        if (dto.Perfil == Perfis.Admin && atual?.Perfil != Perfis.Admin)
            return "O perfil Suporte é da equipe ELROND e não pode ser atribuído aqui.";
        if (atual?.Perfil == Perfis.Admin)
            return "Este é um usuário de suporte da equipe ELROND: o cadastro dele não pode ser alterado por aqui.";

        var souGestor = await _usuario.EhGestorAsync();
        if (souGestor) return null;

        // Colaborador com a tela de Usuários liberada mantém cadastros, mas não distribui poder.
        var viraGestor = dto.Perfil == "Gestor" && atual?.Perfil != "Gestor";
        if (viraGestor) return "Só um gestor pode cadastrar ou promover um gestor.";
        var extrasNovas = dto.Permissoes.Where(Funcionalidades.Extras.Contains)
            .Where(p => atual is null || !atual.Permissoes.Contains(p));
        if (extrasNovas.Any()) return "Só um gestor pode conceder permissões especiais.";
        if (atual is not null && atual.Perfil == "Gestor")
            return "Só um gestor pode alterar o cadastro de outro gestor.";
        return null;
    }

    /// <summary>
    /// Descarta chaves que não existem no catálogo (nada de permissão inventada no payload) e as
    /// administrativas, que não se gravam: vêm do perfil Admin.
    /// </summary>
    private static List<string> PermissoesConhecidas(IEnumerable<string> permissoes) =>
        permissoes.Where(Funcionalidades.Concediveis.Contains).Distinct().ToList();

    private async Task<bool> EmailEmUsoAsync(string email, Guid? ignorarId)
    {
        var normalizado = email.ToLowerInvariant().Trim();
        return (await _repo.GetAllAsync()).Any(u => u.Email == normalizado && u.Id != ignorarId);
    }

    private async Task<bool> EhUltimoGestorAtivoAsync(Guid id) =>
        !(await _repo.GetAllAsync()).Any(u => u.Perfil == "Gestor" && u.Ativo && u.Id != id);
}
