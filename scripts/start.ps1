[CmdletBinding()]
param(
    [switch]$SkipBe,
    [switch]$SkipFe
)

$ErrorActionPreference = "Stop"

$rootDir = Split-Path -Parent $PSScriptRoot
$beDir = Join-Path $rootDir "be"
$feDir = Join-Path $rootDir "fe"
$bePort = 8080
$fePort = 3000
$startedProcesses = @()
$logDir = Join-Path ([System.IO.Path]::GetTempPath()) ("neviad-start-" + $PID)

function Write-Step([string]$Message) { Write-Host "`n>>> $Message" -ForegroundColor Cyan }
function Write-Ok([string]$Message) { Write-Host "  [OK] $Message" -ForegroundColor Green }
function Write-Warn([string]$Message) { Write-Host "  [WARN] $Message" -ForegroundColor Yellow }
function Write-Fail([string]$Message) { Write-Host "  [ERROR] $Message" -ForegroundColor Red }

function Require-Command([string]$Name, [string]$Hint) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "$Name is not installed or not in PATH. $Hint"
    }
}

function Load-Env {
    $envFile = Join-Path $rootDir ".env"
    if (-not (Test-Path $envFile)) {
        Write-Warn ".env not found; using environment variables."
        return
    }

    Write-Host "    Loading .env" -ForegroundColor DarkGray
    foreach ($line in Get-Content $envFile) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith("#") -or -not $trimmed.Contains("=")) { continue }
        $parts = $trimmed -split "=", 2
        $key = $parts[0].Trim()
        $value = $parts[1].Trim()
        if ($key -notmatch "^[A-Za-z_][A-Za-z0-9_]*$") {
            Write-Warn "Skipping invalid env key: $key"
            continue
        }
        if ($value.Length -ge 2 -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

function Get-PortProcessIds([int]$Port) {
    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return @($connections | Select-Object -ExpandProperty OwningProcess -Unique)
}

function Free-Port([int]$Port, [string]$Name) {
    $processIds = Get-PortProcessIds $Port
    if ($processIds.Count -eq 0) { return }

    Write-Warn "Port $Port ($Name) is in use by:"
    foreach ($processId in $processIds) {
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        if ($process) { Write-Host "      PID $processId : $($process.ProcessName)" }
        else { Write-Host "      PID $processId" }
    }
    $answer = Read-Host "  Stop the process(es) above to free port $Port? [y/N]"
    if ($answer -notmatch "^(y|yes)$") {
        throw "Port $Port is already in use."
    }
    foreach ($processId in $processIds) {
        # /T also stops child processes, e.g. the Python process started through cmd.exe.
        & taskkill /PID $processId /T /F | Out-Null
    }
    Start-Sleep -Seconds 1
    if ((Get-PortProcessIds $Port).Count -gt 0) { throw "Could not free port $Port." }
    Write-Ok "Port $Port is free"
}

function Get-JdbcEndpoint([string]$JdbcUrl) {
    if ($JdbcUrl -notmatch "^(?:jdbc:)?postgres(?:ql)?://(?:[^/:?@]+@)?([^/:?]+)(?::([0-9]+))?(?:/|\?|$)") {
        throw "DB_URL must be a PostgreSQL URL (jdbc:postgresql://... or postgresql://...)."
    }
    return @{ Host = $Matches[1]; Port = if ($Matches[2]) { [int]$Matches[2] } else { 5432 } }
}

function Invoke-Quiet([string]$Exe, [string[]]$Arguments) {
    # Runs a native command for its exit code only. Windows PowerShell 5.1 turns a native command's stderr into a terminating
    # error under "Stop", so the preference is relaxed for the call.
    $previous = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try { & $Exe @Arguments 2>$null | Out-Null; return ($LASTEXITCODE -eq 0) }
    catch { return $false }
    finally { $ErrorActionPreference = $previous }
}

function Invoke-Visible([string]$Exe, [string[]]$Arguments) {
    # Runs a native command with its output in this console; throws when it fails.
    $previous = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try { & $Exe @Arguments | Out-Host; $code = $LASTEXITCODE }
    finally { $ErrorActionPreference = $previous }
    if ($code -ne 0) { throw "Command failed ($code): $Exe $($Arguments -join ' ')" }
}

function Find-SystemPython {
    # A Python 3.11+ installed on this machine, as @(exe, args...). The "py" launcher comes with the python.org installer; the
    # "python" alias of the Microsoft Store that only opens the Store fails the version check and is skipped.
    $candidates = @()
    if (Get-Command py -ErrorAction SilentlyContinue) { $candidates += , @("py", "-3") }
    foreach ($name in "python", "python3") {
        $command = Get-Command $name -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($command) { $candidates += , @($command.Source) }
    }
    foreach ($candidate in $candidates) {
        $arguments = @($candidate | Select-Object -Skip 1) + @("-c", "import sys, venv; sys.exit(0 if sys.version_info >= (3, 11) else 1)")
        if (Invoke-Quiet $candidate[0] $arguments) { return , $candidate }
    }
    return $null
}

function Get-CondaPython {
    # The python of the conda env "neviad-be" (conda env create -f be/environment.yml), or $null.
    if (-not (Get-Command conda -ErrorAction SilentlyContinue)) { return $null }
    foreach ($line in (& conda env list 2>$null)) {
        # "neviad-be   [*]   C:\Users\Some Name\anaconda3\envs\neviad-be": the path may contain spaces, and "*" marks the active env.
        if ($line -match "^neviad-be\s+(?:\*\s+)?(.+?)\s*$") {
            $candidate = Join-Path $Matches[1] "python.exe"
            if (Test-Path $candidate) { return $candidate }
        }
    }
    return $null
}

function Get-VenvPython {
    # be/.venv, created with the machine's Python on first run; the backend is (re)installed into it whenever be/pyproject.toml changes.
    $venvDir = Join-Path $beDir ".venv"
    $python = Join-Path $venvDir "Scripts\python.exe"
    if (-not (Test-Path $python)) {
        $system = Find-SystemPython
        if (-not $system) {
            throw "Python 3.11 or newer is not installed. Install it from https://www.python.org/downloads/ (tick 'Add python.exe to PATH'), open a new terminal, and run this script again."
        }
        Write-Host "    Creating $venvDir with $($system -join ' ')" -ForegroundColor DarkGray
        Invoke-Visible $system[0] (@($system | Select-Object -Skip 1) + @("-m", "venv", $venvDir))
    }
    $stamp = Join-Path $venvDir ".neviad-installed"
    $wanted = (Get-FileHash (Join-Path $beDir "pyproject.toml") -Algorithm SHA256).Hash
    $installed = if (Test-Path $stamp) { (Get-Content $stamp -Raw).Trim() } else { "" }
    if ($installed -ne $wanted -or -not (Invoke-Quiet $python @("-c", "import beneviadsystem"))) {
        Write-Host "    Installing the backend into $venvDir (first run or changed dependencies) ..." -ForegroundColor DarkGray
        Invoke-Visible $python @("-m", "pip", "install", "--disable-pip-version-check", "--quiet", "-e", $beDir)
        Set-Content -Path $stamp -Value $wanted -Encoding ascii
    }
    return $python
}

function Get-BackendPython {
    # NEVIAD_PYTHON wins; else the conda env "neviad-be" if it exists; else be/.venv, made and kept up to date by this script.
    if ($env:NEVIAD_PYTHON) {
        if (-not (Invoke-Quiet $env:NEVIAD_PYTHON @("-c", "import beneviadsystem"))) {
            throw "The backend is not installed for NEVIAD_PYTHON=$($env:NEVIAD_PYTHON). Run: `"$($env:NEVIAD_PYTHON)`" -m pip install -e be"
        }
        return $env:NEVIAD_PYTHON
    }
    $conda = Get-CondaPython
    if ($conda -and (Invoke-Quiet $conda @("-c", "import beneviadsystem"))) { return $conda }
    return Get-VenvPython
}

function Test-TcpPort([string]$HostName, [int]$Port) {
    $client = [System.Net.Sockets.TcpClient]::new()
    try {
        $task = $client.ConnectAsync($HostName, $Port)
        if (-not $task.Wait(5000)) { return $false }
        return $client.Connected
    } catch { return $false }
    finally { $client.Dispose() }
}

function Validate-Database {
    if ($SkipBe) { return }
    Write-Step "Validating Supabase database"
    foreach ($name in "DB_URL", "DB_USERNAME", "DB_PASSWORD") {
        if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name))) {
            throw "$name must be set in .env."
        }
    }
    $endpoint = Get-JdbcEndpoint $env:DB_URL
    if (-not (Test-TcpPort $endpoint.Host $endpoint.Port)) {
        throw "Cannot reach Supabase at $($endpoint.Host):$($endpoint.Port)."
    }
    Write-Ok "Supabase PostgreSQL is reachable ($($endpoint.Host):$($endpoint.Port))"
}

function Wait-ForUrl([string]$Url, [string]$Name, [int]$TimeoutSeconds) {
    Write-Host "    Waiting for $Name ($Url) ..." -ForegroundColor DarkGray
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            Invoke-WebRequest -Uri $Url -TimeoutSec 3 -UseBasicParsing | Out-Null
            Write-Ok "$Name is ready"
            return
        } catch { Start-Sleep -Seconds 2 }
    }
    throw "$Name did not start within $TimeoutSeconds seconds. Logs: $logDir"
}

function Start-ServiceProcess([string]$Name, [string]$WorkingDirectory, [string]$Command, [string]$HealthUrl, [int]$TimeoutSeconds) {
    # Keep child output in this same PowerShell console. Do not spawn a new
    # visible cmd.exe window; python/npm.cmd still run through cmd.exe.
    $process = Start-Process -FilePath "cmd.exe" -ArgumentList "/d", "/s", "/c", $Command -WorkingDirectory $WorkingDirectory -NoNewWindow -PassThru
    $script:startedProcesses += $process
    Wait-ForUrl $HealthUrl $Name $TimeoutSeconds
}

function Stop-StartedProcesses {
    foreach ($process in $startedProcesses) {
        if (-not $process.HasExited) { & taskkill /PID $process.Id /T /F 2>$null | Out-Null }
    }
}

try {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    Load-Env
    if ($env:APP_PORT) { $bePort = [int]$env:APP_PORT }
    if ($env:NEXT_PORT) { $fePort = [int]$env:NEXT_PORT }

    Write-Step "Checking required ports"
    Free-Port $bePort "Backend (FastAPI)"; Free-Port $fePort "Frontend (Next.js)"
    Write-Ok "Required ports are free"
    Validate-Database

    if (-not $SkipBe) {
        Write-Step "Starting Backend - FastAPI (port $bePort)"
        $python = Get-BackendPython
        Write-Host "    Python: $python" -ForegroundColor DarkGray
        Start-ServiceProcess "backend" $beDir "`"$python`" -m beneviadsystem" "http://localhost:$bePort/api/health" 120
    }
    if (-not $SkipFe) {
        Write-Step "Starting Frontend - Next.js dev (port $fePort)"
        Require-Command "npm" "Install Node.js/npm."
        if (-not (Test-Path (Join-Path $feDir "node_modules"))) { Push-Location $feDir; try { npm ci } finally { Pop-Location } }
        Start-ServiceProcess "frontend" $feDir "npm run dev" "http://localhost:$fePort" 90
    }

    Write-Host "`n  All services are running. Press Ctrl+C to stop them." -ForegroundColor Green
    Write-Host "  Logs: $logDir"
    while ($true) { Start-Sleep -Seconds 3 }
} catch {
    Write-Fail $_.Exception.Message
    exit 1
} finally {
    Stop-StartedProcesses
}
