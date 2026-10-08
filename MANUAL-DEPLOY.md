# Manual de Deploy — projetos front-end estáticos (BM e similares)

> **Atenção (ELROND):** este guia é da **Fase 1** (front estático). O ELROND hoje roda a stack
> completa em Docker (front + API + Postgres) publicada pelo `deploy.bat` com chave SSH —
> veja `DEPLOY-BACKEND.md`. O `.htaccess` do ELROND no cPanel é um **proxy** para o container,
> não o `.htaccess` de SPA abaixo. Use este manual apenas para o BM e projetos só-front.

Guia reutilizável para publicar um projeto React/Vite (frontend estático)
no servidor cPanel da Sinesta.

> **Resumo:** o servidor roda **cPanel/WHM**. Os sites são **arquivos estáticos**
> servidos pelo Apache do cPanel, com **AutoSSL** (https automático). Publicar =
> compilar o React e copiar os arquivos para a pasta do subdomínio. Sem Docker,
> sem proxy.

---

## Dados do servidor

| Item | Valor |
|---|---|
| IP | `69.6.214.87` |
| Porta SSH | `22022` |
| Usuário SSH | `root` |
| Conta cPanel | `wwsine` |
| Pasta dos sites | `/home/wwsine/<subdominio>` |

(Senhas **não** ficam neste arquivo — guarde no seu gerenciador.)

---

## Configuração inicial (uma vez por projeto)

1. **Crie o subdomínio no cPanel** (`https://sinesta.com.br:2083`, conta `wwsine`):
   - **Domains → Create A New Domain** → informe `<nome>.sinesta.com.br`
   - O document root vira `/home/wwsine/<nome>.sinesta.com.br` automaticamente.
   - O **AutoSSL** emite o certificado sozinho (pode levar alguns minutos; se
     precisar, force em **cPanel → SSL/TLS Status → Run AutoSSL**).

2. **Garanta o `.htaccess` de SPA** em `frontend/public/.htaccess` (se o projeto
   usa React Router). Conteúdo:
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   ```

3. **Crie o `deploy.bat`** na raiz do projeto (veja o do ELROND como modelo —
   basta trocar o subdomínio nas 3 ocorrências de `<nome>.sinesta.com.br`).

---

## Publicar / atualizar (toda vez)

**Duplo-clique no `deploy.bat`.** Ele faz tudo:
1. Compila o projeto (`npm run build`)
2. Empacota os arquivos
3. Envia e publica no servidor (pede a **senha do SSH duas vezes**)

Depois, acesse `https://<nome>.sinesta.com.br`.

> A senha não aparece enquanto você digita — é normal. Se errar, é só rodar de novo.

---

## Passo a passo manual (caso o `.bat` não funcione)

No **PowerShell do seu PC** (na pasta `frontend`):
```powershell
npm run build
tar -czf site.tar.gz -C dist .
scp -P 22022 site.tar.gz root@69.6.214.87:/home/wwsine/<nome>.sinesta.com.br/
```
Depois, conectado na **VPS** (`ssh -p 22022 root@69.6.214.87`):
```bash
cd /home/wwsine/<nome>.sinesta.com.br
tar -xzf site.tar.gz && rm -f site.tar.gz
chown -R wwsine:wwsine /home/wwsine/<nome>.sinesta.com.br
```

---

## Dicas / erros comuns

- **`scp`/`ssh` rodam no PC**; comandos `docker`/`ls`/`tar -x` rodam **na VPS**.
  (Como saber: prompt `PS C:\...` = PC; `root@vps-...#` = VPS.)
- **Porta no ssh é `-p` minúsculo; no scp é `-P` maiúsculo.**
- **`Could not resolve hostname c`** = você rodou o `scp` dentro da VPS por engano.
- **Terminal "travou"** ao clicar = modo de seleção do Windows; aperte **Esc**.
- **Aviso de certificado** na 1ª vez = AutoSSL ainda não rodou; aguarde ou force
  em cPanel → SSL/TLS Status → Run AutoSSL.
- **`path not found` no scp** = o subdomínio ainda não foi criado no cPanel.
