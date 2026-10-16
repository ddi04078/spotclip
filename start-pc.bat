@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo SpotClip PC 테스트를 시작합니다.
where node >nul 2>&1
if errorlevel 1 (
  echo 먼저 Node.js LTS를 설치한 뒤 이 파일을 다시 실행해주세요.
  start https://nodejs.org/
  pause
  exit /b 1
)
if exist dist-web\index.html goto preview
if not exist node_modules\expo\package.json (
  echo 처음 실행할 때 필요한 파일을 내려받습니다. 잠시 기다려주세요.
  call npm ci --no-audit --no-fund
  if errorlevel 1 goto failed
)
call npm run build:web
if errorlevel 1 goto failed
:preview
echo 브라우저가 열리면 사진을 선택해 테스트해주세요.
node scripts\pc-preview.mjs
if errorlevel 1 goto failed
exit /b 0
:failed
echo 실행하지 못했습니다. 위 오류를 확인해주세요.
pause
exit /b 1
