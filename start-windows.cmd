@echo off
REM Minecraft Christmas Builder - Start unter Windows (Doppelklick).
REM Installiert beim ersten Start die Abhaengigkeiten, baut die App und oeffnet den Browser.
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js wurde nicht gefunden. Bitte Node.js 22 LTS von https://nodejs.org installieren und dieses Fenster neu starten.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installiere Abhaengigkeiten ^(einmalig, dauert etwas^) ...
  call npm ci
  if errorlevel 1 goto fehler
)

echo Baue die App ...
call npm run build
if errorlevel 1 goto fehler

echo Starte auf http://localhost:3000 - zum Beenden dieses Fenster schliessen oder Strg+C druecken.
start "" http://localhost:3000
call npm start
exit /b 0

:fehler
echo Es ist ein Fehler aufgetreten. Details siehe oben.
pause
exit /b 1
