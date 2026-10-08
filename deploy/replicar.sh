#!/bin/bash
# Publica uma versão do ELROND em TODOS os ambientes de deploy/ambientes.conf (roda no servidor).
#
#   replicar.sh <pacote.tgz> <versao> [rotulo]
#
# 1. Confere todos os ambientes antes de mexer em qualquer um (pasta, .env com as variáveis
#    obrigatórias, banco no ar). Faltou algo em um, nada é alterado.
# 2. Para cada ambiente, em ordem: backup do banco e dos anexos, troca o código (o anterior fica
#    em .anterior), sobe com a versão nova e espera /api/saude responder com ela.
# 3. Se um ambiente não sobe, volta o código anterior dele e PARA (os seguintes não são tocados).
# 4. No fim, relatório com a versão de cada ambiente.
#
# O log vai para /root/apps/build.log (acompanhamento) e fica guardado em /root/apps/deploy-logs/.
set -u

PKG=${1:?pacote}
VERSAO=${2:?versao}
ROT=${3:-deploy}
BASE=/root/apps
LOG=$BASE/build.log
AQUI=$(cd "$(dirname "$0")" && pwd)
TS=$(date +%Y%m%d-%H%M%S)
mkdir -p "$BASE/backups" "$BASE/deploy-logs"
: > "$LOG"

log() { echo "$*" | tee -a "$LOG"; }
fim() {
  cp "$LOG" "$BASE/deploy-logs/$TS-$ROT.log"
  exit "$1"
}
parar() {
  log "PARANDO: $*"
  fim 1
}
valor_env() { grep -E "^$2=" "$1/.env" | tail -1 | cut -d= -f2-; }

log "=== DEPLOY $VERSAO ($ROT) em $(date '+%d/%m/%Y %H:%M:%S')"

# ── Pacote ──
tar -tzf "$PKG" > /tmp/elrond-pacote.lista 2>/dev/null || { log "PACOTE INVALIDO"; fim 1; }
for p in frontend/ backend/ docker-compose.prod.yml; do
  grep -q "^$p" /tmp/elrond-pacote.lista || { log "PACOTE INVALIDO: falta $p"; fim 1; }
done

# ── Ambientes ──
mapfile -t AMBIENTES < <(grep -vE '^\s*(#|$)' "$AQUI/ambientes.conf")
[ "${#AMBIENTES[@]}" -gt 0 ] || parar "nenhum ambiente em ambientes.conf"
mapfile -t OBRIGATORIAS < <(grep -vE '^\s*(#|$)' "$AQUI/variaveis-obrigatorias.txt")

log "--- Conferência (nada foi alterado ainda)"
for linha in "${AMBIENTES[@]}"; do
  read -r NOME DIR URL <<< "$linha"
  PROJ=$(basename "$DIR")
  [ -d "$DIR" ] || parar "$NOME: pasta $DIR não existe (ambiente novo? rode novo-ambiente.sh)"
  [ -f "$DIR/.env" ] || parar "$NOME: $DIR/.env não existe"
  for v in "${OBRIGATORIAS[@]}"; do
    [ -n "$(valor_env "$DIR" "$v")" ] || parar "$NOME: falta $v no .env"
  done
  docker inspect -f '{{.State.Running}}' "$PROJ-postgres-1" 2>/dev/null | grep -q true || parar "$NOME: banco $PROJ-postgres-1 fora do ar"
  log "ok $NOME ($URL)"
done
LIVRE=$(df --output=avail -m "$BASE" | tail -1)
[ "$LIVRE" -gt 5000 ] || parar "pouco disco livre (${LIVRE} MB)"

# ── Publicação, um ambiente por vez ──
for linha in "${AMBIENTES[@]}"; do
  read -r NOME DIR URL <<< "$linha"
  PROJ=$(basename "$DIR")
  PORTA=$(valor_env "$DIR" HTTP_PORT)
  log "=== $NOME: $DIR ($TS)"

  BKP="$BASE/backups/$PROJ-antes-$ROT-$TS.sql.gz"
  docker exec "$PROJ-postgres-1" pg_dump -U elrond elrond | gzip > "$BKP"
  SZ=$(stat -c %s "$BKP")
  log "backup $SZ bytes"
  [ "$SZ" -gt 10000 ] || parar "$NOME: BACKUP PEQUENO DEMAIS ($SZ bytes)"
  if docker volume inspect "${PROJ}_elrond-arquivos" > /dev/null 2>&1; then
    docker run --rm -v "${PROJ}_elrond-arquivos:/dados:ro" -v "$BASE/backups:/backups" alpine \
      tar czf "/backups/$PROJ-anexos-antes-$ROT-$TS.tgz" -C /dados . && log "backup dos anexos ok"
  fi

  # Código anterior guardado para voltar se a versão nova não subir.
  ANTERIOR=$(cat "$DIR/.versao" 2>/dev/null || echo "?")
  rm -rf "$DIR/.anterior" && mkdir -p "$DIR/.anterior"
  for p in frontend backend docker-compose.prod.yml; do [ -e "$DIR/$p" ] && mv "$DIR/$p" "$DIR/.anterior/"; done
  tar -xzf "$PKG" -C "$DIR" frontend backend docker-compose.prod.yml || parar "$NOME: não extraiu o pacote"

  cd "$DIR" || parar "$NOME: sem acesso a $DIR"
  APP_VERSAO=$VERSAO BUILDKIT_PROGRESS=plain docker compose -f docker-compose.prod.yml up -d --build >> "$LOG" 2>&1
  RC=$?
  log "=== FIM BUILD $NOME rc=$RC"

  SUBIU=0
  if [ "$RC" -eq 0 ]; then
    for _ in $(seq 1 36); do
      R=$(curl -s -m 5 "http://127.0.0.1:$PORTA/api/saude" || true)
      if echo "$R" | grep -q '"ok":true' && echo "$R" | grep -q "\"versao\":\"$VERSAO\""; then SUBIU=1; break; fi
      sleep 5
    done
  fi

  if [ "$SUBIU" -ne 1 ]; then
    log "FALHOU em $NOME: não respondeu com a versão $VERSAO. Voltando o código anterior ($ANTERIOR)."
    rm -rf "$DIR/frontend" "$DIR/backend" "$DIR/docker-compose.prod.yml"
    mv "$DIR/.anterior/"* "$DIR/" 2>/dev/null
    APP_VERSAO=$ANTERIOR docker compose -f docker-compose.prod.yml up -d --build >> "$LOG" 2>&1
    log "voltou para $ANTERIOR (o banco não volta sozinho: backup em $BKP)"
    parar "$NOME falhou; os ambientes seguintes não foram tocados"
  fi
  echo "$VERSAO" > "$DIR/.versao"
  log "ok $NOME na versão $VERSAO ($(echo "$R" | grep -o '"migration":"[^"]*"'))"
done

# ── Relatório ──
log "--- Versão em cada ambiente"
DIVERGE=0
for linha in "${AMBIENTES[@]}"; do
  read -r NOME DIR URL <<< "$linha"
  V=$(curl -s -m 5 "http://127.0.0.1:$(valor_env "$DIR" HTTP_PORT)/api/saude" | grep -o '"versao":"[^"]*"' | cut -d'"' -f4)
  [ "$V" = "$VERSAO" ] || DIVERGE=1
  log "$NOME = ${V:-sem resposta}"
done
[ "$DIVERGE" -eq 0 ] || parar "algum ambiente não está na versão $VERSAO"
log "=== TUDO PRONTO"
fim 0
