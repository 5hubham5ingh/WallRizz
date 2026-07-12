#!/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 1. If not already inside the WallRizz repo, clone it with submodules
if [ ! -f "$SCRIPT_DIR/src/main.js" ]; then
  echo "Cloning WallRizz with submodules..."
  git clone --recurse-submodules https://github.com/5hubham5ingh/WallRizz.git
  cd WallRizz
else
  echo "Already in WallRizz repo, updating submodules..."
  cd "$SCRIPT_DIR"
  git submodule update --init --recursive
fi

# 2. Checkout the latest release tag
LATEST_TAG=$(git tag --sort=-v:refname | head -1)
echo "Checking out $LATEST_TAG..."
git checkout "$LATEST_TAG"

# 3. Build and install quickjs if qjsc is not available
if command -v qjsc &>/dev/null; then
  read -p "qjsc is already installed. Rebuild quickjs? [y/N] " -r
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Rebuilding quickjs..."
    cd quickjs && make && sudo make install && cd ..
  else
    echo "Skipping quickjs build."
  fi
else
  echo "Building quickjs..."
  cd quickjs && make && sudo make install && cd ..
fi

# 4. Build and install WallRizz
cd src
echo "Building WallRizz..."
qjsc -flto -D extensions/ExtensionHandlerWorker.js -o WallRizz main.js
echo "Installing WallRizz..."
sudo cp WallRizz /usr/bin/
echo "WallRizz installation completed successfully."
