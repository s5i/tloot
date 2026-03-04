#!/bin/bash
cd $(dirname $(readlink -f $0))
go test github.com/s5i/tloot/process/... --update
