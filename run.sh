#!/bin/bash
cd $(dirname $(readlink -f $0))
cp $(go env GOROOT)/lib/wasm/wasm_exec.js wasm/wasm_exec.js
GOOS=js GOARCH=wasm go build -C wasm -o main.wasm && mv wasm/main.wasm static/ && go build . && ./tloot
