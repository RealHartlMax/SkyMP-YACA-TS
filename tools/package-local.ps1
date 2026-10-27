Param([switch]$SkipBuild)
$ErrorActionPreference = 'Stop'
$taskRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Push-Location $taskRoot
try {
    if (-not $SkipBuild) {
        & npm test
        if ($LASTEXITCODE -ne 0) { throw 'Build/tests failed; no package created.' }
    }
    foreach ($required in @('dist/yacaBridge.js', 'dist/yacaBridge.d.ts', 'dist/ui/overlay.js', 'dist/plugin/server.js', 'dist/plugin/plugin.json')) {
        if (-not (Test-Path -LiteralPath (Join-Path $taskRoot $required))) { throw "Build artifact missing: $required" }
    }
    try { $zone = [System.TimeZoneInfo]::FindSystemTimeZoneById('Europe/Berlin') }
    catch { $zone = [System.TimeZoneInfo]::FindSystemTimeZoneById('W. Europe Standard Time') }
    $stamp = [System.TimeZoneInfo]::ConvertTime([System.DateTimeOffset]::UtcNow, $zone).ToString('yyyy-MM-dd-HHmmss')
    $artifactRoot = Join-Path $taskRoot "artifacts/local-build-$stamp"
    $packageDir = Join-Path $artifactRoot 'skymp-yaca-ts'
    if (Test-Path -LiteralPath $artifactRoot) { throw "Output already exists: $artifactRoot" }
    New-Item -ItemType Directory -Path $packageDir -Force | Out-Null
    $sourceItems = @('src','ui','tools','docs','tests','config.json','plugin.json','package.json','package-lock.json','tsconfig.json','README.md','LICENSE')
    foreach ($item in @('dist') + $sourceItems) {
        Copy-Item -LiteralPath (Join-Path $taskRoot $item) -Destination $packageDir -Recurse
    }
    $validationDir = Join-Path $packageDir 'validation'
    New-Item -ItemType Directory -Path $validationDir | Out-Null
    foreach ($item in @('browser-validation.json','native-validation.json','plugin-loader-validation.json','plugin-native-validation.json','unit-validation.txt','ui-desktop.png','ui-mobile.png','ui-mock-plugin.png')) {
        $source = Join-Path $taskRoot "artifacts/$item"
        if (Test-Path -LiteralPath $source) { Copy-Item -LiteralPath $source -Destination $validationDir }
    }
    $zipPath = Join-Path $artifactRoot "skymp-yaca-ts-local-$stamp.zip"
    Compress-Archive -LiteralPath $packageDir -DestinationPath $zipPath
    $hash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $installRoot = Join-Path $artifactRoot 'plugin-install'
    $pluginsDir = Join-Path $installRoot 'Plugins'
    $pluginDir = Join-Path $pluginsDir 'skymp-yaca-ts'
    New-Item -ItemType Directory -Path $pluginDir -Force | Out-Null
    foreach ($item in @('server.js','plugin.json','config.json','set-enabled.cjs')) {
        Copy-Item -LiteralPath (Join-Path $taskRoot "dist/plugin/$item") -Destination $pluginDir
    }
    Copy-Item -LiteralPath (Join-Path $taskRoot 'docs/PLUGIN-INSTALL.md') -Destination (Join-Path $pluginDir 'README.md')
    Copy-Item -LiteralPath (Join-Path $taskRoot 'LICENSE') -Destination $pluginDir
    Copy-Item -LiteralPath (Join-Path $taskRoot 'docs') -Destination $pluginDir -Recurse
    Copy-Item -LiteralPath $validationDir -Destination $pluginDir -Recurse
    $sourcesDir = Join-Path $pluginDir 'sources'
    New-Item -ItemType Directory -Path $sourcesDir | Out-Null
    foreach ($item in $sourceItems) { Copy-Item -LiteralPath (Join-Path $taskRoot $item) -Destination $sourcesDir -Recurse }
    $pluginZip = Join-Path $artifactRoot "skymp-yaca-ts-plugin-$stamp.zip"
    Compress-Archive -LiteralPath $pluginsDir -DestinationPath $pluginZip
    $pluginHash = (Get-FileHash -LiteralPath $pluginZip -Algorithm SHA256).Hash.ToLowerInvariant()
    [System.IO.File]::WriteAllText((Join-Path $artifactRoot 'SHA256SUMS.txt'), "$hash  $([System.IO.Path]::GetFileName($zipPath))`n$pluginHash  $([System.IO.Path]::GetFileName($pluginZip))`n")
    Write-Output "Source package: $zipPath"
    Write-Output "Plugin package: $pluginZip"
    Write-Output "Plugin SHA256: $pluginHash"
}
finally { Pop-Location }
