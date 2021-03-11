#!/bin/bash

# This will use docker-compose to load the data
# using a stage built main container and the
# actual Postgres container.

# Any arguments will be passed on to load-in-docker.sh
#
# Usage example:
#	./load-docker-compose.sh -g kanindata-gotland-v9.xlsx \
#	          -G herd-registry-gotland.xlsx \
#	          -m kanindata-mellerud-v4.xlsx \
#	          -M herd-registry-mellerud.xlsx
#

usage () {
	cat <<-USAGE_END
	Usage:
	    $0	\\
	    	-g kanindata-gotland.xlsx -G herd-registry-gotland.xlsx \\
	    	-m kanindata-mellerud.xlsx

	Options:

	    -g file	Load Gotland rabbit data from "file"
	    -G file	Load Gotland herd data from "file"
	    -m file	Load Mellerud rabbit data from "file"

	    -h		Show this help text
	USAGE_END
}


while getopts 'g:G:hm:M:' opt; do
	case $opt in
		g)	gfile=$OPTARG ;;
		G)	Gfile=$OPTARG ;;
		h)	usage; exit ;;
		m)	mfile=$OPTARG ;;
		M)	Mfile=$OPTARG ;;
		*)
			echo 'Error in command line parsing' >&2
			usage >&2
			exit 1
	esac
done
shift "$(( OPTIND - 1 ))"

load_gotland=true
load_mellerud=true
if [ -z "$gfile" ] || [ ! -f "$gfile" ]; then
	echo 'Missing or unusable Gotland data file (-g file)'
	echo 'Will not load Gotland data'
	load_gotland=false
fi >&2
if "$load_gotland" && ( [ -z "$Gfile" ] || [ ! -f "$Gfile" ] ); then
	echo 'Missing or unusable Gotland herd registry file (-G file)'
	echo 'Will not load Gotland data'
	load_gotland=false
fi >&2
if [ -z "$mfile" ] || [ ! -f "$mfile" ]; then
	echo 'Missing or unusable Mellerud data file (-m file)' >&2
	echo 'Will not load Mellerud data'
	load_mellerud=false
fi
if [ -z "Mfile" ] || [ ! -f "$Mfile" ]; then
	echo 'Missing or unusable Mellerud herd file (-M file)' >&2
	echo 'Will not load extra Mellerud herd info'
	load_mellerud_herds=false
else
    herd="-M /scripts/$Mfile"
fi

if docker-compose -f ../dc-db-load.yml ps | grep -q 'main-load-db.*\sUp\s.*'; then
    # Alll good here
    :
else
    # Start containers and wait a little to give it time to start 
    echo "System is not up, bringing up before loading data"
    echo
    docker-compose -f ../dc-db-load.yml up -d
    sleep 10
fi


docker-compose -f ../dc-db-load.yml exec main-load-db /scripts/load-in-docker.sh -g "/scripts/$gfile" -G "/scripts/$Gfile" -m "/scripts/$mfile" $herd

echo "Done you can stop the main-load-db container with docker-compose -f ../dc-db-load.yml stop"
