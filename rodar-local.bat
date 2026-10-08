@echo off
echo ========================================================
echo  Iniciando o Projeto ELROND (Portal de Precificacao)...
echo ========================================================

echo Iniciando o Servidor Frontend (React/Vite)...
start "ELROND - Frontend (React/Vite)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Iniciado! Uma nova janela do terminal deve ter aberto.
echo Acesse: http://localhost:5173
echo.
echo (O backend .NET ainda nao existe - entra na Fase 2.)
echo Pode fechar ou minimizar esta janela principal.
pause
