#!/bin/bash
# Cria um ambiente novo do ELROND neste servidor, com banco zerado (só o admin e as tabelas de
# referência, como municípios). Roda no servidor, uma vez por ambiente.
#
#   ADMIN_SENHA='...' novo-ambiente.sh <pacote.tgz> <versao> <nome> <subdominio> <http_port> <pg_port> <admin_email>
#   ex.: ADMIN_SENHA='...' novo-ambiente.sh /root/apps/elrond-deploy.tgz 20261008.abc1234 aldrava aldrava.sinesta.com.br 5092 5434 admin@aldrava.com.br
#
# Faz: pasta /root/apps/elrond-<nome>, .env com segredos aleatórios (gerados aqui, nunca
# impressos), primeira subida e conferência em /api/saude; no cPanel (conta wwsine), o
# subdomínio com o proxy para a porta e o SSL. Depois: acrescentar a linha em deploy/ambientes.conf.
# A senha do admin vem pela variável ADMIN_SENHA (não fica na linha de comando nem no log).
set -u
PKG=${1:?pacote}; VERSAO=${2:?versao}; NOME=${3:?nome}; SUB=${4:?subdominio}
HTTP_PORT=${5:?http_port}; PG_PORT=${6:?pg_port}; ADMIN_EMAIL=${7:?admin_email}
: "${ADMIN_SENHA:?defina ADMIN_SENHA}"
DIR=/root/apps/elrond-$NOME
PROJ=$(basename "$DIR")
CONTA=wwsine
DOCROOT=/home/$CONTA/$SUB

falha() { echo "ERRO: $*"; exit 1; }

[ -e "$DIR" ] && falha "$DIR já existe (ambiente criado antes?)"
ss -ltn | grep -qE "127\.0\.0\.1:($HTTP_PORT|$PG_PORT)\s" && falha "porta $HTTP_PORT ou $PG_PORT já em uso"
getent hosts "$SUB" | grep -q "$(hostname -I | awk '{print $1}')" || echo "aviso: $SUB ainda não resolve para este servidor"

# ── Docker ──
mkdir -p "$DIR" && cd "$DIR" || falha "não criou $DIR"
tar -xzf "$PKG" -C "$DIR" frontend backend docker-compose.prod.yml || falha "não extraiu o pacote"
umask 077
{
  echo "# Ambiente $NOME ($SUB), criado em $(date '+%d/%m/%Y %H:%M') por deploy/novo-ambiente.sh"
  echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)"
  echo "JWT_SECRET_KEY=$(openssl rand -base64 48 | tr -d '\n')"
  echo "HTTP_PORT=$HTTP_PORT"
  echo "PG_PORT=$PG_PORT"
  echo "SEED_DEMO=false"
  echo "APP_URL=https://$SUB"
  echo "ADMIN_EMAIL_INICIAL=$ADMIN_EMAIL"
  echo "ADMIN_SENHA_INICIAL=$ADMIN_SENHA"
  echo "# Cifra os certificados A1 das empresas no banco. NAO trocar depois de enviados."
  echo "CERTIFICADO_CHAVE=$(openssl rand -base64 32)"
} > .env
chmod 600 .env
umask 022

APP_VERSAO=$VERSAO BUILDKIT_PROGRESS=plain docker compose -f docker-compose.prod.yml up -d --build || falha "build/subida falhou"
SUBIU=0
for _ in $(seq 1 36); do
  R=$(curl -s -m 5 "http://127.0.0.1:$HTTP_PORT/api/saude" || true)
  if echo "$R" | grep -q '"ok":true'; then SUBIU=1; break; fi
  sleep 5
done
[ "$SUBIU" -eq 1 ] || falha "não respondeu em /api/saude (veja: docker logs $PROJ-backend-1)"
echo "$VERSAO" > "$DIR/.versao"
echo "ok: $NOME no ar em 127.0.0.1:$HTTP_PORT ($R)"

# ── cPanel: subdomínio + proxy + SSL ──
if [ ! -d "$DOCROOT" ]; then
  uapi --user=$CONTA SubDomain addsubdomain domain="${SUB%%.*}" rootdomain="${SUB#*.}" dir="$SUB" > /tmp/novo-ambiente-sub.txt 2>&1
  grep -q "status: 1" /tmp/novo-ambiente-sub.txt || { cat /tmp/novo-ambiente-sub.txt; falha "não criou o subdomínio $SUB no cPanel"; }
fi
[ -d "$DOCROOT" ] || falha "docroot $DOCROOT não existe"
cat > "$DOCROOT/.htaccess" <<HTACCESS
# ELROND $NOME (desde $(date +%d/%m/%Y)): proxy para a stack Docker em 127.0.0.1:$HTTP_PORT ($DIR).
<IfModule mod_rewrite.c>
  RewriteEngine On
  # Validacao do AutoSSL (cPanel) sai direto do docroot, nao passa pelo container
  RewriteRule ^\.well-known/ - [L]
  # Forca HTTPS (o TLS termina aqui no Apache do cPanel)
  RewriteCond %{HTTPS} !=on
  RewriteRule ^(.*)\$ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
  RewriteRule ^(.*)\$ http://127.0.0.1:$HTTP_PORT/\$1 [P,L]
</IfModule>
HTACCESS
chown $CONTA:$CONTA "$DOCROOT/.htaccess"
/usr/local/cpanel/bin/autossl_check --user=$CONTA > /tmp/novo-ambiente-ssl.txt 2>&1 || true
echo "SSL: pedido ao AutoSSL (pode levar alguns minutos). Teste: curl -sI https://$SUB/"
echo "PRONTO: acrescente em deploy/ambientes.conf ->  $NOME  $DIR  https://$SUB"
