# Deploy — stack completa (Postgres + API .NET + front nginx)

Guia para publicar o ELROND em produção com Docker. É o processo em uso em
`https://elrond.sinesta.com.br` (VPS `69.6.214.87`, a mesma do cPanel).
O `MANUAL-DEPLOY.md` é o guia antigo da Fase 1 (front estático) e vale só para o BM.

## Arquitetura em produção

```
 navegador ──https──► Apache do cPanel (TLS/AutoSSL, vhost elrond.sinesta.com.br)
                         │  .htaccess: RewriteRule ^(.*)$ http://127.0.0.1:5090/$1 [P]
                         ▼
                 [ frontend (nginx) ]  publicado só em 127.0.0.1:5090
                         │  serve o SPA + cabeçalhos de segurança (CSP, HSTS, nosniff...)
                         │  /api/* ──proxy──► [ backend (.NET :8080) ] ──► [ postgres :5432 ]
                         (rede interna do Docker; backend e banco NÃO ficam expostos;
                          o Postgres só responde em 127.0.0.1 da VPS, para túnel SSH)
```

- Mesma origem → sem CORS, sem configurar URL de API no front.
- O backend **aplica migrations e semeia no startup**. Com `SEED_DEMO=false` (padrão) semeia
  só o admin e os municípios do IBGE; nunca ligue `SEED_DEMO=true` em produção (cria usuários
  de teste com senha conhecida).
- Anexos (documentos de cliente/fornecedor) ficam no volume `elrond-arquivos`.

## Primeira subida

```bash
# na VPS
mkdir -p /root/apps/elrond /root/apps/backups && cd /root/apps/elrond
cp .env.prod.example .env
nano .env   # POSTGRES_PASSWORD, JWT_SECRET_KEY (>= 32 chars), HTTP_PORT=5090, ADMIN_SENHA_INICIAL
docker compose -f docker-compose.prod.yml up -d --build
docker logs elrond-backend-1 | grep -i "senha inicial"   # só se ADMIN_SENHA_INICIAL ficou vazio
```

Depois, no cPanel, o `.htaccess` do subdomínio faz o proxy para `127.0.0.1:${HTTP_PORT}` e
força HTTPS (ver o arquivo em `/home/wwsine/elrond.sinesta.com.br/.htaccess`).

Login inicial: `admin@elrond.com.br` com a senha de `ADMIN_SENHA_INICIAL` (ou a gerada no log).
**Troque essa senha no primeiro acesso** (Cadastros › Funcionários e permissões).

## Atualizar (nova versão) — `deploy.bat`

O `deploy.bat` na raiz faz tudo pela chave SSH, sem senha:

1. `pg_dump` do banco e `tar` do volume de anexos em `/root/apps/backups/`
2. empacota `backend/` + `frontend/` (sem `node_modules`, `dist`, `bin`, `obj`)
3. `scp` para a VPS, **apaga** `frontend/` e `backend/` antigos (arquivo removido no PC não pode
   sobrar lá, senão quebra o build) e extrai
4. `docker compose -f docker-compose.prod.yml up -d --build`

Conferir depois: `docker logs elrond-backend-1` ("Now listening"), tabela `__EFMigrationsHistory`,
contagens das tabelas e `curl -I https://elrond.sinesta.com.br/api/clientes` → 401.

## Operação

- **Logs:** `docker compose -f docker-compose.prod.yml logs -f [backend|frontend|postgres]`
- **Parar:** `docker compose -f docker-compose.prod.yml down` (dados ficam nos volumes)
- **Backup manual:** `docker exec elrond-postgres-1 pg_dump -U elrond elrond | gzip > /root/apps/backups/elrond-$(date +%Y%m%d).sql.gz`
- **Restaurar:** `zcat arquivo.sql.gz | docker exec -i elrond-postgres-1 psql -U elrond elrond`
- **Zerar tudo (apaga banco e anexos):** `reset-cliente.bat` / `reset-banco.bat` — fazem backup antes.
  Só com o cliente ciente: a base em produção já tem cadastros reais.

## Regenerar o seed (só para ambiente demo)

`backend/Elrond.API/seed.json` é gerado dos mocks do front:

```bash
cd frontend && npx vite-node scripts/dump-seed.ts
```
