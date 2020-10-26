#!/bin/sh

# This script reads the configuration file in
# .docker/database-variables.env to access an existing PostgreSQL
# database and create the tables for the herdbook schema.
#
# Note that this script only needs to be run if you wish to initialize
# the database without using the herdbook application, as the app will
# initialize the database on startup.
#

cd "$( dirname "$0" )" || { echo 'cd error' >&2; exit 1; }

if [ ! -e .docker/database-variables.env ]
then
	cat <<-'END_ERROR' >&2
	Couldn't find config file '.docker/database-variables.env'
	Create this file from '.docker/database-variables.env.default'
	with the credentials to your database and then run this script
	again.
	END_ERROR
	exit 1
fi

printf 'Installing app dependencies'
pip3 install -r app/requirements.txt >/dev/null

printf 'Initializing database                            '
cd app/
python3 -c 'import utils.database as db; db.init()'
echo DONE
