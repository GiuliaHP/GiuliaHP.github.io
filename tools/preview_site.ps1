$ErrorActionPreference = "Stop"
$projectRoot = Split-Path $PSScriptRoot -Parent
$livereload = Join-Path $projectRoot ".venv\Scripts\livereload.exe"
if (-not (Test-Path $livereload)) {
    throw "Expected livereload at .venv\Scripts\livereload.exe. Run: .venv\Scripts\pip install -r tools\requirements.txt"
}
$port = 5500
$url = "http://localhost:$port/pages/carnet.html"
Write-Host "Apercu du carnet : $url"
Write-Host "Enregistrez une entree dans l'editeur, la page se rafraichit toute seule."
Write-Host "Ctrl+C pour arreter le serveur."
Start-Job -ScriptBlock { Start-Sleep -Seconds 2; Start-Process $using:url } | Out-Null
& $livereload -p $port $projectRoot
