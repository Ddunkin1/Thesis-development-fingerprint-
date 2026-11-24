# Makes the Fingerprint Bridge start by itself every time this Windows user signs in.
# Run it once on the gym PC, from the folder that contains ChaqBridge.exe (the "publish" folder):
#     powershell -ExecutionPolicy Bypass -File .\install-startup.ps1
# To undo: delete "CHAQ GYM Bridge.lnk" from the folder opened by  Win+R -> shell:startup
$exe = Join-Path $PSScriptRoot "ChaqBridge.exe"
if (-not (Test-Path $exe)) { Write-Error "ChaqBridge.exe was not found next to this script ($PSScriptRoot)."; exit 1 }

$startup = [Environment]::GetFolderPath("Startup")
$link = Join-Path $startup "CHAQ GYM Bridge.lnk"
$shell = New-Object -ComObject WScript.Shell
$sc = $shell.CreateShortcut($link)
$sc.TargetPath = $exe
$sc.WorkingDirectory = $PSScriptRoot
$sc.Description = "CHAQ GYM Fingerprint Bridge (restarts itself if it ever stops)"
$sc.Save()
Write-Host "Done. The bridge will start automatically at sign-in: $link"
