#!/bin/bash

USER_HOME="/home/$(logname)"
SHARED_DIRECTORY="$USER_HOME/Documents/Willow/Shared"
SERVER_DIRECTORY="$SHARED_DIRECTORY/../Server"

# Update server directory with changes from source
rsync -av --delete --exclude-from="$SHARED_DIRECTORY/vm/rsync_exclude.txt" "$SHARED_DIRECTORY/" "$SERVER_DIRECTORY"

# Restart database
service postgresql restart

source $SHARED_DIRECTORY/vm/vm_start.sh
