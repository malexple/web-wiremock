@echo off
setlocal enabledelayedexpansion

set PROJECT_DIR=%~dp0
set ICONS_DIR=%PROJECT_DIR%src\main\resources\static\icons
set TEMPLATES_DIR=%PROJECT_DIR%src\main\resources\templates
set JS_DIR=%PROJECT_DIR%src\main\resources\static\js

echo === Web WireMock: Cleaning unused Bootstrap Icons ===
echo Icons dir: %ICONS_DIR%
echo.

set USED_FILE=%TEMP%\wm_used_icons.txt
if exist "%USED_FILE%" del "%USED_FILE%"

echo Scanning templates and JS only (excluding bootstrap-icons.css)...
for /r "%TEMPLATES_DIR%" %%f in (*.html) do (
    findstr /i /o "bi-[a-z0-9][a-z0-9-]*" "%%f" >> "%USED_FILE%" 2>nul
)
for /r "%JS_DIR%" %%f in (*.js) do (
    REM Пропускаем bootstrap.esm.js — там тоже могут быть упоминания иконок
    if /i not "%%~nxf"=="bootstrap.esm.js" (
        findstr /i /o "bi-[a-z0-9][a-z0-9-]*" "%%f" >> "%USED_FILE%" 2>nul
    )
)

echo.
echo === Checking icon SVG files ===
set DELETED=0
set KEPT=0

for %%i in ("%ICONS_DIR%\*.svg") do (
    set ICON_FILE=%%~ni
    findstr /i "bi-!ICON_FILE!" "%USED_FILE%" >nul 2>&1
    if !errorlevel! == 0 (
        set /a KEPT+=1
    ) else (
        echo [DELETE] %%~nxi
        del "%%i"
        set /a DELETED+=1
    )
)

del "%USED_FILE%"

echo.
echo === Done ===
echo Kept   : %KEPT% icons
echo Deleted: %DELETED% icons
echo.
pause