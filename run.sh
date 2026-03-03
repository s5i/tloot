#!/bin/bash
cd $(dirname $(readlink -f $0))
GOOS=js GOARCH=wasm go build -C wasm -o main.wasm && mv wasm/main.wasm static/ && go build . && ./tloot
