#!/bin/env bash

# Build script for WallRizz

## Fetch the QuickJS source code, then build and install the compiler and interpreter in the system.
echo -e "\e[1;4;33mFetching source code...\e[0m" &&
  git clone --depth 1 https://github.com/bellard/quickjs.git &&
  cd quickjs &&
  make &&
  sudo make install &&
  cd .. &&

  ## Fetch the required library.
  curl -L -o out.zip https://github.com/ctn-malone/qjs-ext-lib/archive/refs/tags/0.12.4.zip &&
  unzip out.zip &&
  mv qjs-ext-lib-0.12.4 qjs-ext-lib &&
  rm out.zip &&

  ## Fetch helper scripts
  git clone --depth 1 https://github.com/5hubham5ingh/justjs.git &&

  ## Clone the WallRizz project
  git clone --depth 1 https://github.com/5hubham5ingh/WallRizz.git &&

  ## Build WallRizz then install it.
  cd WallRizz/src &&
  echo -e "\e[1;4;33mBuilding WallRizz...\e[0m" &&
  qjsc -flto -D extensionHandlerWorker.js -o WallRizz main.js &&
  echo -e "\e[1;4;33mInstalling WallRizz...\e[0m" &&
  sudo cp WallRizz /usr/bin/ &&
  echo -e "\e[1;32mWallRizz installation completed successfully.\e[0m"
