# PrioTask - Automated Mobile Transfer Script for Windows
$shell = New-Object -ComObject Shell.Application
$pc = $shell.Namespace(17) # This PC

$phone = $null
foreach ($item in $pc.Items()) {
    if ($item.Name -like "*motorola*" -or $item.Type -eq "Mobile Phone") {
        $phone = $item
        break
    }
}

if (-not $phone) {
    Write-Host "Error: No connected mobile phone detected." -ForegroundColor Red
    Write-Host "Please ensure your phone is connected via USB and unlocked." -ForegroundColor Yellow
    exit 1
}

Write-Host "Connected Device: $($phone.Name)" -ForegroundColor Cyan

$storage = $null
foreach ($sub in $phone.GetFolder().Items()) {
    if ($sub.Name -like "*storage*" -or $sub.Name -like "*Internal*") {
        $storage = $sub
        break
    }
}

if (-not $storage) {
    Write-Host "Error: Phone storage is not accessible." -ForegroundColor Red
    Write-Host "Please unlock your phone screen and tap the USB notification to choose 'File Transfer / MTP'." -ForegroundColor Yellow
    exit 2
}

$download = $null
foreach ($sub in $storage.GetFolder().Items()) {
    if ($sub.Name -eq "Download" -or $sub.Name -eq "Downloads") {
        $download = $sub
        break
    }
}

if (-not $download) {
    $download = $storage
}

Write-Host "Target Folder on Phone: $($download.Name)" -ForegroundColor Green

$apkPath = "D:\DS_Minifinal\PrioTask.apk"
$targetFolder = $download.GetFolder()

if (Test-Path $apkPath) {
    Write-Host "  -> Transferring PrioTask.apk to phone..." -ForegroundColor White
    $targetFolder.CopyHere($apkPath, 16) # 16 = Yes to all
    Write-Host "`nSUCCESS! PrioTask.apk has been transferred to your phone's Download folder!" -ForegroundColor Green
    Write-Host "Open the 'Files' app on your phone, go to 'Downloads', and tap 'PrioTask.apk' to install!" -ForegroundColor Cyan
} else {
    Write-Host "APK not found at $apkPath" -ForegroundColor Red
}
