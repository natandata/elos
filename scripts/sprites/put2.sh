#!/bin/sh
echo "$2" > design/sprites-pilot/labels2/n$1.txt
echo "n$1: $(echo $2 | wc -w)"
