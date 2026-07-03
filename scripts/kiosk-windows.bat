@echo off
rem Abre o telao em modo kiosk no Chrome/Edge (Windows).
rem Uso: kiosk-windows.bat [URL] [X] [Y]
rem   X,Y: posicao da janela - use para o segundo monitor, ex.: 1920 0

set URL=%1
if "%URL%"=="" set URL=http://localhost:4700
set POSX=%2
if "%POSX%"=="" set POSX=0
set POSY=%3
if "%POSY%"=="" set POSY=0

set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME% set CHROME="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if not exist %CHROME% set CHROME="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

start "" %CHROME% --kiosk %URL% --window-position=%POSX%,%POSY% --noerrdialogs --disable-infobars --autoplay-policy=no-user-gesture-required --no-first-run
