@echo off
echo 🚀 Running DeepSeek-Coder Model...

:: Handle quoted multi-word prompt input
if "%~1"=="" (
    echo ❌ Error: No prompt provided.
    echo Usage: run-model.bat "your prompt here"
    pause
    exit /b
)

python run_model.py "%*"
pause
