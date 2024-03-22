#!/bin/bash

USER_HOME="/home/$(logname)"
SHARED_DIRECTORY="$USER_HOME/Documents/Willow/Shared"
SERVER_DIRECTORY="$SHARED_DIRECTORY/../Server"

# Allowing shared folder on boot.
echo vboxsf >> /etc/modules
echo "Willow $SHARED_DIRECTORY vboxsf defaults      0       0" >> /etc/fstab
# Used for just this session.
mount -t vboxsf Willow $SHARED_DIRECTORY

# # Actual directory server is run on.
cp -R $SHARED_DIRECTORY $SERVER_DIRECTORY

cd $SERVER_DIRECTORY

# Set up dependencies
npm ci

# Install server
sudo -iu postgres psql <<-EOF
    CREATE ROLE willow_user WITH LOGIN PASSWORD 'willowy';
    CREATE DATABASE willow WITH OWNER willow_user;
    \connect willow;
    CREATE EXTENSION pgcrypto;
EOF

# Set up password file
echo "127.0.0.1:*:willow:willow_user:willowy" > $USER_HOME/.pgpass
chmod 600 $USER_HOME/.pgpass

# Load server tables
psql -U willow_user -h 127.0.0.1 willow < setup.sql

# Allow login of main linux user into server
cd /etc/postgresql/*/main/
sed -i '101 ahost willow willow_user 127.0.0.1/32 md' pg_hba.conf

# Set up testing suite
npx ts-jest config:init

source $SHARED_DIRECTORY/vm/vm_start.sh