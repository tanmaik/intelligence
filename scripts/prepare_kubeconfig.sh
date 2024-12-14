#!/bin/bash

# Check if file is provided
if [ -z "$1" ]; then
    echo "Usage: ./prepare_kubeconfig.sh /path/to/kubeconfig"
    exit 1
fi

# Check if file exists
if [ ! -f "$1" ]; then
    echo "Error: File $1 does not exist"
    exit 1
fi

# Base64 encode the file
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    base64 -i "$1" | tr -d '\n'
else
    # Linux
    base64 -w 0 "$1"
fi

echo -e "\n\nCopy the above string and create a new GitHub secret named KUBECONFIG with this value" 