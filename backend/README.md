# Elrond.API — Backend

Backend do portal de precificação de serviços ELROND. **.NET 10 · Clean Architecture ·
EF Core + PostgreSQL · JWT · RBAC por funcionalidade.** Espelha o molde do Erebor.

## Estrutura (Clean Architecture)

| Projeto | Responsabilidade |
|---|---|
| `Elrond.Domain` | Entidades puras (User, Cliente, Fornecedor, Vendedor, Empresa, Proposta, Funil, Oportunidade, Anexo...), motor de preço (`PricingEngine`), regras de domínio (`RegiaoVendedor`). Sem ORM. |
| `Elrond.Application` | Serviços de aplicação (proposta, compras, carteira, anexos, CRM), DTOs, interfaces, validators (FluentValidation), catálogo RBAC (`Funcionalidades`). |
| `Elrond.Infrastructure` | EF Core (`AppDbContext`, migrations), repositórios, segurança (BCrypt, JWT), storage de anexos em disco, seeders, DI. |
| `Elrond.API` | ASP.NET Core: controllers finos, `Program.cs`, filtro de permissão por rota, rate limit do login, tratamento global de erros, OpenAPI/Scalar (só em Development). |
| `Elrond.Tests` | xUnit (auth, hasher, validators, motor de preço, impostos, região, compras). |

## Rodar local

Pré-requisitos: .NET 10 SDK + Docker Desktop.

```bash
cd backend
docker compose up -d                                   # Postgres em localhost:5432 (user/senha: elrond)
dotnet run --project Elrond.API --urls http://localhost:5000
```

- Em `Development` os segredos vêm de `appsettings.Development.json` (chave JWT de exemplo,
  banco local, `SEED_DEMO=true`). O `appsettings.json` não tem segredo nenhum: produção usa
  variáveis de ambiente (`docker-compose.prod.yml` + `.env`).
- Doc interativa (só Development): `http://localhost:5000/scalar/v1`
- O front (Vite) faz proxy de `/api` para `http://localhost:5000` (ver `frontend/vite.config.ts`).

Usuários semeados em **Development** (base vazia):

| E-mail | Senha | Perfil |
|---|---|---|
| admin@elrond.com.br | elrond@2024 | Gestor |
| usuario@elrond.com.br | senha123 | Colaborador |
| marina@sinesta.com.br | senha123 | Colaborador (restrito) |

Em produção (`SEED_DEMO=false`) só o admin é criado, com a senha de `Seed:AdminSenha`
(env `ADMIN_SENHA_INICIAL`) ou uma gerada e impressa uma vez no log.

## Segurança (resumo do que o servidor garante)

- **Login:** BCrypt (fator 12), JWT HS256 de 8 h, 10 tentativas/min por IP (`429` depois).
- **Sessão:** usuário desativado perde o acesso na hora (`OnTokenValidated` consulta o banco);
  perfil e permissões são lidos do banco a cada requisição (`UsuarioContexto`), não do token.
- **Permissão por tela:** `PermissaoPorRotaFilter` exige a funcionalidade da tela em toda escrita
  (POST/PUT/PATCH/DELETE); rota de escrita sem mapeamento é negada. Ações especiais usam
  `[Authorize(Policy = "func:/chave")]`. Leituras exigem login (e a tela de Usuários devolve
  dados de RH só a quem tem `/cadastros/usuarios`).
- **Regras no serviço, não no controller:** piso de markup, região bloqueada do vendedor, limite
  da regra de compras (inclusive no `bulk`), status da proposta (aprovar só pela aprovação
  formal), campos de markup só com a permissão especial, metas só por gestor, escalada de
  perfil/permissões bloqueada em Usuários.
- **Carteira:** usuário ligado a um cadastro de Vendedor (`Vendedor.UsuarioId`) vê só a própria
  carteira (clientes em que é SDR/Sales/CS, propostas e cards desses clientes ou em que é o
  vendedor); gestor e quem não é vendedor veem tudo (`ICarteiraService.VisaoAsync`).
- **Auditoria:** toda escrita (criar/editar/excluir/inativar/importar), status e aprovação de
  proposta, anexos, transferência de carteira e cada login (inclusive recusado) entram na tabela
  `auditoria` com usuário, IP e os campos que mudaram (`IAuditoriaService`). Tela em
  Configurações › Auditoria (funcionalidade `/cadastros/auditoria`).
- **Nenhum cadastro é apagado:** `DELETE` em qualquer rota do `CrudControllerBase` só inativa
  (exclusão lógica, `IInativavel`); metas, modelos, funis e cards do CRM também têm status. Anexo
  excluído some da lista, mas registro e arquivo ficam. Todo registro carrega o rastro
  `CriadoEm/Por`, `AlteradoEm/Por`, `InativadoEm/Por` (`Rastreavel`, carimbado pelo
  `EfCrudRepository` com o usuário da requisição; o payload não manda nesses campos). Número da
  proposta vem da sequência `propostas_numero_seq` (sem repetição).
- **Anexos:** extensão em allowlist + assinatura do arquivo conferida (PDF/JPEG/Office), tipo
  vem da extensão (nunca do navegador), `nosniff`, id do cadastro validado e existente,
  permissão da tela dona (Clientes/Fornecedores).

## Migrations (EF Core)

```bash
dotnet ef migrations add <Nome> -p Elrond.Infrastructure -s Elrond.API -o Persistence/Migrations
dotnet build            # confere que compila; nunca `migrations remove` de algo já aplicado
dotnet ef migrations has-pending-model-changes -p Elrond.Infrastructure -s Elrond.API
```

Regra do projeto: migrations **só aditivas** (a base em produção tem cadastros reais).
Coluna nova obrigatória entra com default; ajuste de dado é feito à mão.

## Testes

```bash
dotnet test
```
