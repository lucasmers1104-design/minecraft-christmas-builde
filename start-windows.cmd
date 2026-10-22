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

echo.
echo Starte die App auf http://localhost:3000 ...
echo Der Browser oeffnet sich automatisch, sobald die App bereit ist.
echo Zum Beenden dieses Fenster schliessen.
echo.
start "" /b node scripts\open-browser-when-ready.mjs http://localhost:3000
call npm start
echo.
echo Die App wurde beendet. Falls oben eine Fehlermeldung steht, bitte den Text an Claude schicken.
pause
exit /b 1

:fehler
echo Es ist ein Fehler aufgetreten. Details siehe oben.
pause
exit /b 1
