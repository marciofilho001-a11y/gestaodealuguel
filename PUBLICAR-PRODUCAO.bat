@echo off
cd /d "%~dp0"
echo ============================================
echo  Isso vai publicar DE VERDADE em
echo  gestao-aluguel-sigma.vercel.app
echo ============================================
echo.
set /p CONFIRMA=Voce ja conferiu a previa e quer publicar mesmo? (digite SIM e Enter): 
if /i not "%CONFIRMA%"=="SIM" (
  echo Cancelado. Nada foi publicado.
  pause
  exit /b 0
)

echo.
set /p TOKEN=Cola aqui seu token da Vercel (clique direito para colar) e aperte Enter: 

echo.
echo ============================================
echo  Publicando em PRODUCAO...
echo ============================================
call npx vercel deploy --token %TOKEN% --prod
if errorlevel 1 (
  echo.
  echo ERRO no deploy. Copia essa tela inteira e manda pro Claude.
  pause
  exit /b 1
)

echo.
echo ============================================
echo  Publicado! gestao-aluguel-sigma.vercel.app ja e essa versao nova.
echo ============================================
pause
