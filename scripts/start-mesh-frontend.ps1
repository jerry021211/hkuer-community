param([switch]$Restart)
$ErrorActionPreference='Stop'
$workspace=Split-Path $PSScriptRoot -Parent
$runtime=Join-Path $workspace '.local/mesh'
New-Item -ItemType Directory -Path $runtime -Force | Out-Null
if(Test-Path "$runtime/frontend.pid"){
    $existingPid=[int](Get-Content "$runtime/frontend.pid")
    $existing=Get-CimInstance Win32_Process -Filter "ProcessId=$existingPid" -ErrorAction SilentlyContinue
    if($existing -and $existing.Name -eq 'node.exe' -and $existing.CommandLine -like '*vite*--mode*mesh*'){
        if(!$Restart){Write-Output "Mesh frontend already running: http://127.0.0.1:5174 (PID $existingPid).";return}
        Stop-Process -Id $existingPid
        Wait-Process -Id $existingPid -ErrorAction SilentlyContinue
    }
}
$process=Start-Process -FilePath (Get-Command node -ErrorAction Stop).Source -ArgumentList @('node_modules/vite/bin/vite.js','--mode','mesh','--host','127.0.0.1','--port','5174','--strictPort') -WorkingDirectory "$workspace/hkuer" -WindowStyle Hidden -RedirectStandardOutput "$runtime/frontend.log" -RedirectStandardError "$runtime/frontend-error.log" -PassThru
$process.Id | Set-Content "$runtime/frontend.pid"
Write-Output "Mesh frontend: http://127.0.0.1:5174 (PID $($process.Id))."
