$url = "https://test1800.github.io/index.html?v=5"


# ---------------------------------
# پیدا کردن Chrome
# ---------------------------------

$chromePaths = @(
    "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)

$chrome = $chromePaths | Where-Object {
    Test-Path $_
} | Select-Object -First 1


if (!$chrome) {

    Write-Host "Chrome پیدا نشد"
    Read-Host "Enter"
    exit

}



# ---------------------------------
# اندازه ویجت
# ---------------------------------

$width = 295
$height = 95



# ---------------------------------
# پروفایل اختصاصی ثابت
# ---------------------------------

$profile = "$env:LOCALAPPDATA\FinancialDashboardChrome"



# ---------------------------------
# بستن ویجت قبلی
# ---------------------------------

Get-Process chrome -ErrorAction SilentlyContinue |
Where-Object {

    $_.CommandLine -like "*FinancialDashboardChrome*"

} |
Stop-Process -Force -ErrorAction SilentlyContinue


Start-Sleep -Milliseconds 200



# ---------------------------------
# ساخت پروفایل فقط بار اول
# ---------------------------------

if (!(Test-Path $profile)) {

    New-Item `
        -ItemType Directory `
        -Path $profile `
        -Force | Out-Null

}



# ---------------------------------
# موقعیت ویجت
# ---------------------------------

Add-Type -AssemblyName System.Windows.Forms


$screen = [System.Windows.Forms.Screen]::PrimaryScreen


$screenHeight = $screen.WorkingArea.Height


$x = 1
$y = $screenHeight - $height - 1



# ---------------------------------
# اجرای Chrome
# ---------------------------------

$arguments = @(

    "--user-data-dir=$profile"

    "--app=$url"

    "--window-size=$width,$height"

    "--window-position=$x,$y"

    "--no-first-run"

    "--no-default-browser-check"

    "--disable-sync"

    "--disk-cache-size=524288000"

    "--media-cache-size=524288000"

)



$chromeProcess = Start-Process `
    -FilePath $chrome `
    -ArgumentList $arguments `
    -PassThru



# ---------------------------------
# پیدا کردن پنجره
# ---------------------------------

$hwnd = [IntPtr]::Zero


for ($i = 0; $i -lt 60; $i++) {

    Start-Sleep -Milliseconds 50

    $chromeProcess.Refresh()

    $hwnd = $chromeProcess.MainWindowHandle


    if ($hwnd -ne [IntPtr]::Zero) {

        break

    }

}



if ($hwnd -eq [IntPtr]::Zero) {

    Write-Host "پنجره Chrome پیدا نشد"
    Read-Host "Enter"
    exit

}



# ---------------------------------
# API ویندوز
# ---------------------------------

Add-Type @"

using System;
using System.Runtime.InteropServices;

public class WindowHelper {

    [DllImport("user32.dll")]

    public static extern bool SetWindowPos(

        IntPtr hWnd,

        IntPtr hWndInsertAfter,

        int X,

        int Y,

        int cx,

        int cy,

        uint uFlags

    );


    public static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);


    public const UInt32 SWP_SHOWWINDOW = 0x0040;

}

"@



# ---------------------------------
# تنظیم نهایی پنجره
# ---------------------------------

[WindowHelper]::SetWindowPos(

    $hwnd,

    [WindowHelper]::HWND_TOPMOST,

    $x,

    $y,

    $width,

    $height,

    [WindowHelper]::SWP_SHOWWINDOW

)