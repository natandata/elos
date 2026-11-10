#!/bin/sh
# uso: put.sh <folha> "<tokens separados por espaço>"
echo "$2" > design/sprites-pilot/labels/s$1.txt
echo "s$1: $(echo $2 | wc -w) rótulos"
