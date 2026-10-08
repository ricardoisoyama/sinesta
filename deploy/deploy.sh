#!/bin/bash
# Deploy do ELROND (roda na máquina de desenvolvimento, pelo Git Bash): publica o último commit
# em TODOS os ambientes de deploy/ambientes.conf, pelo deploy/replicar.sh no servidor.
#
#   deploy/deploy.sh [rotulo]        (ou deploy.bat, na raiz)
#
# Só publica o que está no git: com alteração sem commit, para e avisa. Assim a versão que vai
# para o servidor é exatamente um commit, e /api/saude de cada ambiente mostra qual.
set -u
cd "$(dirname "$0")/.." || exit 1
SERVIDOR=root@69.6.214.87
SSH=(ssh -p 22022 -o BatchMode=yes "$SERVIDOR")
ROT=${1:-deploy}
ruido() { grep -viE "post-quantum|store now|openssh.com/pq|upgraded"; }

if [ -n "$(git status --porcelain)" ]; then
  echo "Há alterações sem commit:"
  git status --short
  echo
  echo "Faça o commit antes de publicar (o deploy publica só o que está no git)."
  exit 1
fi
VERSAO=$(git log -1 --format=%cd.%h --date=format:%Y%m%d)
echo "Publicando $VERSAO: $(git log -1 --format=%s)"

TMP=$(mktemp -d)
PKG="$TMP/elrond-deploy.tgz"
git archive --format=tar.gz -o "$PKG" HEAD frontend backend deploy docker-compose.prod.yml || exit 1
scp -P 22022 -o BatchMode=yes "$PKG" "$SERVIDOR:/root/apps/elrond-deploy.tgz" 2>&1 | ruido
rm -rf "$TMP"

# O replicador roda do próprio pacote (versionado junto com o código), destacado da sessão SSH.
"${SSH[@]}" "set -e; rm -rf /root/apps/pacote && mkdir -p /root/apps/pacote && tar -xzf /root/apps/elrond-deploy.tgz -C /root/apps/pacote deploy && (setsid nohup bash /root/apps/pacote/deploy/replicar.sh /root/apps/elrond-deploy.tgz '$VERSAO' '$ROT' > /dev/null 2>&1 &) && echo iniciado" 2>&1 | ruido

echo "Acompanhando (pode levar alguns minutos por ambiente)..."
"${SSH[@]}" "for i in \$(seq 1 120); do grep -qE 'TUDO PRONTO|PARANDO|PACOTE INVALIDO' /root/apps/build.log && break; sleep 10; done; grep -vE '^#[0-9]+ |^ *[0-9.]+ |^\s*$' /root/apps/build.log | grep -E '^(===|---|ok |backup|FALHOU|voltou|PARANDO|PACOTE|[a-z]+ = )'" 2>&1 | ruido
"${SSH[@]}" "grep -q 'TUDO PRONTO' /root/apps/build.log" 2>/dev/null
