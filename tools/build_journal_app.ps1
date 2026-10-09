$ErrorActionPreference = "Stop"
$projectRoot = Split-Path $PSScriptRoot -Parent
$python = Join-Path $projectRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $python)) {
    throw "Expected the project virtual environment at .venv\Scripts\python.exe"
}
# Absolute paths on purpose: --specpath makes PyInstaller resolve relative ones
# against the spec folder, not the project root.
$editorPage = Join-Path $projectRoot "tools\desktop_app.html"
$appIcon = Join-Path $projectRoot "assets\img\icons\IC_Main.ico"
$entryPoint = Join-Path $projectRoot "tools\desktop_app.py"
Push-Location $projectRoot
& $python -m PyInstaller --noconfirm --clean --onefile --windowed --noupx --collect-all webview `
    --name "GiuliaHP-Carnet" `
    --icon "$appIcon" `
    --add-data "${editorPage};." `
    --specpath (Join-Path $projectRoot "tools") `
    --workpath (Join-Path $projectRoot "tools\build") `
    --distpath (Join-Path $projectRoot "dist") `
    "$entryPoint"
Pop-Location
