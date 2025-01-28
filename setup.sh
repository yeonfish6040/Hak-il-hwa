#!/bin/bash

cd "$(dirname "$0")"

git clone git@github.com:yeonfish6040/Hak-il-hwa.git .

docker compose -f ./setup/db/docker-compose.yml up -d
docker compose -f ./setup/db/docker-compose.yml stop

cp ./.env.example ./.env

npm install -g nodemon

yarn install