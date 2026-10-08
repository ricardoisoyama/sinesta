@echo off
rem Deploy do ELROND: publica o ultimo commit em TODOS os ambientes (Sinesta, BM, Aldrava...),
rem com backup de cada banco antes e conferencia da versao no fim. A lista de ambientes fica em
rem deploy\ambientes.conf; a logica, em deploy\deploy.sh (local) e deploy\replicar.sh (servidor).
rem Uso: deploy.bat [rotulo]    ex.: deploy.bat ajuste-impostos
setlocal
cd /d "%~dp0"
title Deploy ELROND
where bash >nul 2>&1 || (echo Git Bash nao encontrado. Instale o Git for Windows. & pause & exit /b 1)
bash deploy/deploy.sh %*
if errorlevel 1 (
  echo.
  echo ************************************************************
  echo    O deploy NAO terminou. Veja a mensagem acima.
  echo ************************************************************
  pause
  exit /b 1
)
echo.
echo ============================================================
echo    PRONTO! Todos os ambientes na mesma versao.
echo ============================================================
pause
