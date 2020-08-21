#!/bin/sh
#
# This script inserts a new user into the database given a username and password
# combination.
#

if [ "$#" -lt 2 ]
then
	cat <<-'END_ERROR' >&2
	Please provide an email and password to insert into the user database
	USAGE: ./register_user.sh <user> <pass>
	END_ERROR
	exit 1
fi

user="$1"
pass="$2"

cd "$( dirname "$0" )" || { echo 'cd error' >&2; exit 1; }

if docker-compose ps | grep -q 'main.*\sUp\s.*'; then
    # Alll good here
    : 
else
    # Start containers and wait a little to give it time to start 
    echo "System is not up, bringing upp before registering user"
    echo
    docker-compose up -d
    sleep 10
fi

docker-compose exec -T main python3 -c "from utils.data_access import register_user; register_user('${user}', '${pass}', privileges=[{'level': 'admin'}])"

echo Registered user
