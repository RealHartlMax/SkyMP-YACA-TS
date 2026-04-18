Param(
    [Parameter(Mandatory = $true)]
    [string]$PapyrusCompilerPath,

    [Parameter(Mandatory = $true)]
    [string]$FlagsFilePath,

    [string]$InputDir = "./skymp5-scripts/psc",
    [string]$OutputDir = "./skymp5-scripts/pex",
    [string]$ImportPath = "./skymp5-scripts/psc"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $PapyrusCompilerPath)) {
    throw "PapyrusCompiler.exe not found: $PapyrusCompilerPath"
}

if (-not (Test-Path $FlagsFilePath)) {
    throw "Flags file not found: $FlagsFilePath"
}

if (-not (Test-Path $InputDir)) {
    throw "Input directory not found: $InputDir"
}

$InputDir = (Resolve-Path $InputDir).Path
$OutputDir = [System.IO.Path]::GetFullPath($OutputDir)
$ImportPath = [System.IO.Path]::GetFullPath($ImportPath)

New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

$pscFiles = Get-ChildItem -Path $InputDir -Filter *.psc -File
if ($pscFiles.Count -eq 0) {
    Write-Host "No .psc files found in $InputDir"
    exit 0
}

foreach ($psc in $pscFiles) {
    Write-Host "Compiling $($psc.Name)..."

    & $PapyrusCompilerPath $psc.FullName "-i=$ImportPath" "-o=$OutputDir" "-f=$FlagsFilePath" | Write-Host

    if ($LASTEXITCODE -ne 0) {
        throw "Papyrus compile failed for $($psc.Name)"
    }
}

Write-Host "Done. Generated .pex files in $OutputDir"
