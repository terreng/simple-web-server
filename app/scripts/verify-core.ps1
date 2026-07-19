# Build the Rust FFI and run the C smoke test + C++ supervisor test against it.
# Windows / MSVC. Run inside an MSVC developer environment (so `cl` is on PATH);
# in CI this is provided by ilammy/msvc-dev-cmd.
$ErrorActionPreference = "Stop"

$app = Split-Path -Parent $PSScriptRoot   # app/
Set-Location $app

Write-Host "== building sws-ffi (release) =="
cargo build -p sws-ffi --release --manifest-path rust-server/Cargo.toml

$libdir  = "rust-server/target/release"
$incFfi  = "rust-server/ffi/include"
$incCmn  = "native-common"
$implib  = "$libdir/sws_ffi.dll.lib"   # cdylib import library

$work = New-Item -ItemType Directory -Force -Path (Join-Path $env:TEMP ("swscore_" + [guid]::NewGuid()))
New-Item -ItemType Directory -Force -Path "$work/webroot" | Out-Null
Set-Content -Path "$work/webroot/index.html" -Value "<h1>ok</h1>"

Write-Host "== building + running C smoke test =="
cl /nologo /I $incFfi rust-server/ffi/test/smoke.c /Fe:"$work/smoke.exe" /link /LIBPATH:$libdir sws_ffi.dll.lib
Copy-Item "$libdir/sws_ffi.dll" "$work/"
$out = & "$work/smoke.exe" "$work/webroot" 18092
$out | Write-Host
if ($out -notmatch "SMOKE PASS") { throw "smoke test did not pass" }

Write-Host "== building + running C++ supervisor test =="
cl /nologo /std:c++17 /EHsc /I $incCmn /I $incFfi `
   native-common/test/supervisor_test.cpp native-common/SwsSupervisor.cpp `
   /Fe:"$work/sup.exe" /link /LIBPATH:$libdir sws_ffi.dll.lib
$out2 = & "$work/sup.exe" "$work/webroot"
$out2 | Write-Host
if ($out2 -notmatch "SUPERVISOR PASS") { throw "supervisor test did not pass" }

Write-Host "ALL CORE CHECKS PASSED"
