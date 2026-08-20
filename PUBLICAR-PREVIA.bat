@echo off
cd /d "%~dp0"
echo ============================================
echo  Instalando dependencias (pode demorar um pouco)
echo ============================================
call npm install
if errorlevel 1 (
  echo.
  echo ERRO no npm install. Copia essa tela inteira e manda pro Claude.
  pause
  exit /b 1
)

echo.
set /p TOKEN=Cola aqui seu token da Vercel (clique direito para colar) e aperte Enter: 

echo.
echo ============================================
echo  Publicando uma PREVIA (o site de producao NAO muda ainda)
echo ============================================
call npx vercel deploy --token %TOKEN%
if errorlevel 1 (
  echo.
  echo ERRO no deploy. Copia essa tela inteira e manda pro Claude.
  pause
  exit /b 1
)

echo.
echo ============================================
echo  Previa publicada! Abre o link "Preview" que apareceu acima
echo  no seu navegador e confere se esta tudo certo.
echo.
echo  Se estiver tudo certo, roda o PUBLICAR-PRODUCAO.bat
echo  pra colocar essa versao no site de verdade.
echo ============================================
pause
