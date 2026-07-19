#!/usr/bin/env bash
# Build the Rust FFI and run the C smoke test + C++ supervisor test against it.
# Works on Linux and macOS. (Windows uses scripts/verify-core.ps1.)
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"  # app/
cd "$here"

echo "== building sws-ffi (release) =="
cargo build -p sws-ffi --release --manifest-path rust-server/Cargo.toml

libdir="rust-server/target/release"
inc_ffi="rust-server/ffi/include"
inc_common="native-common"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
mkdir -p "$work/webroot"
printf '<h1>ok</h1>' > "$work/webroot/index.html"

echo "== building + running C smoke test =="
cc rust-server/ffi/test/smoke.c -I "$inc_ffi" -L "$libdir" -lsws_ffi \
   -lpthread -ldl -lm -o "$work/smoke"
LD_LIBRARY_PATH="$libdir" DYLD_LIBRARY_PATH="$libdir" \
  "$work/smoke" "$work/webroot" 18091 | tee "$work/smoke.out"
grep -q "SMOKE PASS" "$work/smoke.out"

echo "== building + running C++ supervisor test =="
c++ -std=c++17 native-common/test/supervisor_test.cpp native-common/SwsSupervisor.cpp \
   -I "$inc_common" -I "$inc_ffi" -L "$libdir" -lsws_ffi \
   -lpthread -ldl -lm -o "$work/sup"
LD_LIBRARY_PATH="$libdir" DYLD_LIBRARY_PATH="$libdir" \
  "$work/sup" "$work/webroot" | tee "$work/sup.out"
grep -q "SUPERVISOR PASS" "$work/sup.out"

echo "ALL CORE CHECKS PASSED"
