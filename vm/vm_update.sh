#!/bin/bash

USER_HOME="/home/$(logname)"
SHARED_DIRECTORY="$USER_HOME/Documents/Willow/Shared"
SERVER_DIRECTORY="$SHARED_DIRECTORY/../Server"

rsync -av --delete --exclude-from="$SHARED_DIRECTORY/vm/rsync_exclude.txt" --delete-excluded $SHARED_DIRECTORY $SERVER_DIRECTORY

source $SHARED_DIRECTORY/vm/vm_start.sh
