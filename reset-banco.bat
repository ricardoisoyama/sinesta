@echo off
setlocal
title ZERAR BANCO - ELROND
echo ============================================================
echo    *** ATENCAO: ISTO APAGA TODOS OS DADOS DO BANCO ***
echo    (tudo que foi cadastrado: empresas, custos, propostas,
echo     usuarios criados, etc.) e recria LIMPO a partir do seed
echo     (cadastros reais da planilha, SEM propostas de exemplo).
echo.
echo    Use SO quando quiser zerar de proposito (ex.: antes de
echo    liberar pro cliente). NAO use no dia a dia.
echo ============================================================
echo.
set /p CONFIRMA="Para confirmar, digite  ZERAR  e tecle Enter: "
if /i not "%CONFIRMA%"=="ZERAR" goto cancelado
echo.
echo Zerando e recriando o banco na VPS (pede a senha do root)...
echo.
ssh -p 22022 root@69.6.214.87 "mkdir -p /root/apps/backups && cd /root/apps/elrond && S=$(date +%Y%m%d-%H%M) && (docker exec elrond-postgres-1 pg_dump -U elrond elrond | gzip > /root/apps/backups/elrond-antes-reset-$S.sql.gz; docker run --rm -v elrond_elrond-arquivos:/dados:ro -v /root/apps/backups:/backups alpine tar czf /backups/elrond-anexos-antes-reset-$S.tar.gz -C /dados . ) ; docker compose -f docker-compose.prod.yml down -v && docker compose -f docker-compose.prod.yml up -d --build"
if errorlevel 1 goto erro

echo.
echo ============================================================
echo    PRONTO! Banco zerado e recriado limpo.
echo    (backup anterior em /root/apps/backups/elrond-antes-reset-*)
echo    Login inicial: admin@elrond.com.br
echo    Senha: ADMIN_SENHA_INICIAL do .env, ou a gerada em
echo           docker logs elrond-backend-1 ^| grep "senha inicial"
echo ============================================================
echo.
pause
exit /b 0

:cancelado
echo.
echo Cancelado - NADA foi apagado.
echo.
pause
exit /b 0

:erro
echo.
echo *** ERRO - veja a mensagem acima. ***
echo.
pause
exit /b 1
