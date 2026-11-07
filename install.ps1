$ErrorActionPreference = 'Stop'

function Install-Pano {
    $ErrorActionPreference = 'Stop'
    if ($PSVersionTable.PSVersion.Major -lt 6) {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    }
    $arch = $env:PROCESSOR_ARCHITECTURE
    if ($env:PROCESSOR_ARCHITEW6432) { $arch = $env:PROCESSOR_ARCHITEW6432 }
    if ($arch -eq 'ARM64') {
        throw 'Windows ARM64 is not supported by this installer. Use the Docker option.'
    }
    if ($arch -ne 'AMD64') { throw "Unsupported Windows architecture $arch. Use the Docker option." }
    $asset = 'pano-windows-x64.exe'
    $base = $env:PANO_DOWNLOAD_BASE
    if (-not $base) {
        if (-not $env:PANO_VERSION -or $env:PANO_VERSION -eq 'latest') {
            $base = 'https://github.com/Metonya/pano/releases/latest/download'
        } else {
            $base = "https://github.com/Metonya/pano/releases/download/$($env:PANO_VERSION)"
        }
    }
    $tempDir = Join-Path ([IO.Path]::GetTempPath()) ([IO.Path]::GetRandomFileName())
    $staged = $null
    try {
        New-Item -ItemType Directory -Path $tempDir | Out-Null
        foreach ($name in @($asset, 'SHA256SUMS.txt')) {
            $url = "$($base.TrimEnd('/'))/$name"
            try {
                Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile (Join-Path $tempDir $name)
            } catch {
                if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 404) {
                    throw "Release or asset not found (404): $url. No release may exist yet."
                }
                throw "Download failed: $url. $($_.Exception.Message)"
            }
        }
        $matchesForAsset = @(Get-Content (Join-Path $tempDir 'SHA256SUMS.txt') | Where-Object { $_ -match '^([0-9a-fA-F]{64})\s+\*?pano-windows-x64\.exe\s*$' })
        if ($matchesForAsset.Count -ne 1) { throw 'Missing or invalid checksum for Pano.' }
        $expected = ($matchesForAsset[0] -split '\s+')[0]
        # Not Get-FileHash: Windows PowerShell started from PowerShell 7 may not find it.
        $sha256 = [Security.Cryptography.SHA256]::Create()
        try { $hash = $sha256.ComputeHash([IO.File]::ReadAllBytes((Join-Path $tempDir $asset))) }
        finally { $sha256.Dispose() }
        $actual = [BitConverter]::ToString($hash) -replace '-', ''
        if ($actual -ne $expected) { throw 'SHA-256 checksum mismatch. Nothing was installed.' }
        $dir = $env:PANO_INSTALL_DIR
        if (-not $dir) { $dir = Join-Path $env:LOCALAPPDATA 'Programs\pano' }
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
        $staged = Join-Path $dir ('.pano-' + [IO.Path]::GetRandomFileName())
        Copy-Item (Join-Path $tempDir $asset) $staged
        $destination = Join-Path $dir 'pano.exe'
        try {
            if (Test-Path $destination) { [IO.File]::Replace($staged, $destination, $null) }
            else { [IO.File]::Move($staged, $destination) }
        } catch {
            throw "Could not replace $destination. If Pano is running, stop it and try again. $($_.Exception.Message)"
        }
        $staged = $null
        Write-Host "Installed Pano to $destination"
        $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
        $normalizedDir = [IO.Path]::GetFullPath($dir).TrimEnd('\')
        $userEntries = @($userPath -split ';' | Where-Object { $_ })
        if (-not ($userEntries | Where-Object { $_.TrimEnd('\') -ieq $normalizedDir })) {
            $newPath = (@($userEntries) + $normalizedDir) -join ';'
            [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
            Write-Host "Added $normalizedDir to the user PATH."
        } else { Write-Host "$normalizedDir is already in the user PATH." }
        $sessionEntries = @($env:Path -split ';' | Where-Object { $_ })
        if (-not ($sessionEntries | Where-Object { $_.TrimEnd('\') -ieq $normalizedDir })) {
            $env:Path = (@($sessionEntries) + $normalizedDir) -join ';'
            Write-Host 'Updated PATH for this session.'
        } else { Write-Host 'PATH for this session already contains the install directory.' }
        Write-Host 'Run: pano serve'
        Write-Host 'Then open http://localhost:7777'
    } finally {
        if ($staged -and (Test-Path $staged)) { Remove-Item -Force $staged }
        if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
    }
}

Install-Pano
