# Register a Windows Task Scheduler job that runs Laravel's scheduler every minute,
# which in turn runs the daily backup (backup:run) and token clean-up.
#
#   Run once, in PowerShell as Administrator:
#     .\deploy\windows-scheduler.ps1                       # uses php from PATH
#     .\deploy\windows-scheduler.ps1 -Php C:\xampp\php\php.exe
#   Remove:  Unregister-ScheduledTask -TaskName 'VehicleRental Scheduler'
param(
    [string]$Php = (Get-Command php -ErrorAction Stop).Source
)

$ErrorActionPreference = 'Stop'
$backend = Resolve-Path (Join-Path $PSScriptRoot '..\backend')
$name = 'VehicleRental Scheduler'

$action = New-ScheduledTaskAction -Execute $Php -Argument 'artisan schedule:run' -WorkingDirectory $backend
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date -RepetitionInterval (New-TimeSpan -Minutes 1)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 30) -MultipleInstances IgnoreNew
# Runs whether or not anyone is signed in.
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null

Write-Host "Registered '$name': $Php artisan schedule:run (every minute, in $backend)" -ForegroundColor Green
Write-Host 'Check it:   php artisan schedule:list'
Write-Host 'Test now:   php artisan backup:run'
