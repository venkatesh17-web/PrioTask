# Build PrioTask.apk and transfer directly to connected phone
$ErrorActionPreference = "Stop"

$baseDir = "D:\DS_Minifinal"
$buildDir = "$baseDir\build_apk"
$sdk = "C:\Users\sonta\.bubblewrap\android_sdk"
$buildTools = "$sdk\build-tools\34.0.0"
$androidJar = "$sdk\platforms\android-34\android.jar"
$keystore = "$baseDir\android-app\android.keystore"

Write-Host "=== Building PrioTask Android APK ===" -ForegroundColor Cyan

# 1. Prepare bin directory
$binDir = "$buildDir\bin"
if (Test-Path $binDir) { Remove-Item -Recurse -Force $binDir }
New-Item -ItemType Directory -Path $binDir | Out-Null
New-Item -ItemType Directory -Path "$buildDir\compiled_res" -Force | Out-Null

# 2. Compile Java
Write-Host "[1/6] Compiling Java source..." -ForegroundColor White
& javac -encoding UTF-8 -cp "$androidJar" -d "$binDir" "$buildDir\src\com\priotask\app\MainActivity.java"

# 3. Generate classes.dex with d8
Write-Host "[2/6] Converting bytecode to classes.dex (d8)..." -ForegroundColor White
& "$buildTools\d8.bat" --lib "$androidJar" --output "$binDir" "$binDir\com\priotask\app\MainActivity.class"

# 4. Compile Resources with aapt2
Write-Host "[3/6] Compiling Android resources (aapt2 compile)..." -ForegroundColor White
& "$buildTools\aapt2.exe" compile "$buildDir\res\drawable\icon.png" -o "$buildDir\compiled_res"

# 5. Link APK with aapt2
Write-Host "[4/6] Linking APK package (aapt2 link)..." -ForegroundColor White
$unalignedApk = "$buildDir\unaligned.apk"
if (Test-Path $unalignedApk) { Remove-Item $unalignedApk }
& "$buildTools\aapt2.exe" link -I "$androidJar" --manifest "$buildDir\AndroidManifest.xml" -o "$unalignedApk" "$buildDir\compiled_res\drawable_icon.png.flat"

# 6. Add classes.dex into APK (using jar tool or zip)
Write-Host "[5/6] Injecting classes.dex into APK..." -ForegroundColor White
Push-Location $binDir
& jar uf "$unalignedApk" "classes.dex"
Pop-Location

# 7. ZipAlign & Sign
Write-Host "[6/6] Aligning and signing APK..." -ForegroundColor White
$alignedApk = "$buildDir\aligned.apk"
$finalApk = "$baseDir\PrioTask.apk"

if (Test-Path $alignedApk) { Remove-Item $alignedApk }
if (Test-Path $finalApk) { Remove-Item $finalApk }

& "$buildTools\zipalign.exe" -v -p 4 "$unalignedApk" "$alignedApk" | Out-Null
& "$buildTools\apksigner.bat" sign --ks "$keystore" --ks-pass "pass:priotask123" --out "$finalApk" "$alignedApk"

if (Test-Path $finalApk) {
    $apkSize = (Get-Item $finalApk).Length / 1KB
    Write-Host "`nSUCCESS! Built PrioTask.apk ($([math]::Round($apkSize, 1)) KB)" -ForegroundColor Green
} else {
    Write-Host "Failed to build APK" -ForegroundColor Red
    exit 1
}

# 8. Transfer directly to Motorola phone via MTP
Write-Host "`n=== Transferring PrioTask.apk to Motorola Phone ===" -ForegroundColor Cyan
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
    Write-Host "Notice: No phone detected. APK saved at: $finalApk" -ForegroundColor Yellow
    exit 0
}

$storage = $null
foreach ($sub in $phone.GetFolder().Items()) {
    if ($sub.Name -like "*storage*" -or $sub.Name -like "*Internal*") {
        $storage = $sub
        break
    }
}

if (-not $storage) {
    Write-Host "Notice: Phone is locked or in charging-only mode." -ForegroundColor Yellow
    exit 0
}

$download = $null
foreach ($sub in $storage.GetFolder().Items()) {
    if ($sub.Name -eq "Download" -or $sub.Name -eq "Downloads") {
        $download = $sub
        break
    }
}

if (-not $download) { $download = $storage }

Write-Host "Target: $($phone.Name) -> $($storage.Name) -> $($download.Name)" -ForegroundColor White
$downloadFolder = $download.GetFolder()
$downloadFolder.CopyHere($finalApk, 16)

Write-Host "TRANSFERRED SUCCESSFULLY: PrioTask.apk is now in your phone's Download folder!" -ForegroundColor Green
