@echo off
setlocal
title SISTEMA DO ZERO (cliente) - ELROND
echo ============================================================
echo    *** SUBIR O SISTEMA DO ZERO PARA O CLIENTE ***
echo.
echo    Isto APAGA TODOS os dados e sobe LIMPO:
echo      - SEM empresas, custos, taxas, plano de contas,
echo        metas, modelos e propostas
echo      - SO o usuario admin (admin@elrond.com.br); a senha inicial
echo        vem de ADMIN_SENHA_INICIAL no .env da VPS ou e gerada e
echo        mostrada em: docker logs elrond-backend-1
echo    O cliente cadastra tudo do zero.
echo    (Tambem envia o codigo mais recente. Um backup do banco e
echo     dos anexos fica em /root/apps/backups/ antes de apagar.)
echo ============================================================
echo.
set /p CONFIRMA="Para confirmar, digite  ZERAR  e tecle Enter: "
if /i not "%CONFIRMA%"=="ZERAR" goto cancelado
echo.

cd /d "%~dp0"

echo [1/3] Empacotando o codigo...
tar --exclude=node_modules --exclude=dist --exclude=bin --exclude=obj --exclude=.git --exclude=*.tar.gz -czf "%~dp0elrond-src.tar.gz" backend frontend docker-compose.prod.yml .env.prod.example DEPLOY-BACKEND.md
if errorlevel 1 goto erro
echo.

echo [2/3] Enviando para a VPS (pede a senha do root)...
scp -P 22022 "%~dp0elrond-src.tar.gz" root@69.6.214.87:/root/apps/
if errorlevel 1 goto erro
echo.

echo [3/3] Zerando e subindo LIMPO (pode levar 1-3 min)...
ssh -p 22022 root@69.6.214.87 "mkdir -p /root/apps/elrond /root/apps/backups && cd /root/apps/elrond && S=$(date +%Y%m%d-%H%M) && (docker exec elrond-postgres-1 pg_dump -U elrond elrond | gzip > /root/apps/backups/elrond-antes-reset-$S.sql.gz; docker run --rm -v elrond_elrond-arquivos:/dados:ro -v /root/apps/backups:/backups alpine tar czf /backups/elrond-anexos-antes-reset-$S.tar.gz -C /dados . ) ; rm -rf /root/apps/elrond/frontend /root/apps/elrond/backend && tar -xzf /root/apps/elrond-src.tar.gz -C /root/apps/elrond && grep -v '^SEED_DEMO=' .env > .env.tmp && echo SEED_DEMO=false >> .env.tmp && mv .env.tmp .env && docker compose -f docker-compose.prod.yml down -v && docker compose -f docker-compose.prod.yml up -d --build"
if errorlevel 1 goto erro

del "%~dp0elrond-src.tar.gz" >nul 2>&1

echo.
echo ============================================================
echo    PRONTO! Sistema do zero no ar.
echo    Acesse:  https://elrond.sinesta.com.br
echo    Login:   admin@elrond.com.br
echo    Senha:   a de ADMIN_SENHA_INICIAL no .env, ou a gerada em
echo             docker logs elrond-backend-1 ^| grep "senha inicial"
echo    (troque a senha do admin em Cadastros ^> Usuarios)
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
