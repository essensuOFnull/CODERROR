@echo off
setlocal
:: Определяем текущий диск скрипта
set "DRIVE=%~d0"
:: Создаем папку CODERROR на текущем диске (если не существует)
set "CHROME_DATA_DIR=%DRIVE%\CODERROR"
if not exist "%CHROME_DATA_DIR%" (
    mkdir "%CHROME_DATA_DIR%"
    if errorlevel 1 (
        echo Failed to create directory: %CHROME_DATA_DIR%
        pause
        exit /b 1
    )
)
:: Запускаем Chrome с настройками
start chrome --disable-web-security --user-data-dir="%CHROME_DATA_DIR%" "%~dp0index.html"
endlocal