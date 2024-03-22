#!/bin/bash

SHARED_DIRECTORY="/home/$(logname)/Documents/Willow/Shared"
SERVER_DIRECTORY="$SHARED_DIRECTORY/../Server"

cd $SERVER_DIRECTORY

# Copy configuration
cp .env.template .env
sed -i "s/PGPASSWORD=null/PGPASSWORD=willowy/1" .env
sed -i "s/SESSION_SECRET=/SESSION_SECRET=buffalo/1" .env
cp "$SERVER_DIRECTORY/config.yml.template" config.yml

npm run debug
