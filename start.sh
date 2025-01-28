#!/bin/bash

function cleanup {
  docker compose -f ./setup/db/docker-compose.yml stop
}

cd "$(dirname "$0")"

trap cleanup EXIT

docker compose -f ./setup/db/docker-compose.yml start

yarn dev
