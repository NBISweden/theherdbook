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

if	docker-compose -f ../dc-db-load.yml ps |
	[[ $(grep -c -E '^herdbook-(db|main-load-db).*\<Up\>') -ne 2 ]]
then
    # Start containers and wait a little to give it time to start 
    echo "System is not up, bringing up before loading data"
    echo
    docker-compose -f ../dc-db-load.yml up -d
    sleep 10
fi

# Add path "/scripts/" in front of each non-option argument.
for opt do
	case $opt in
		-*) : ;;
		*) opt="/scripts/$opt"
	esac
	set -- "$@" "$opt"
	shift
done

docker-compose -f ../dc-db-load.yml \
	exec main-load-db /scripts/load-in-docker.sh "$@"

cat <<'END'
Done.
You can stop the main-load-db container with
	docker-compose -f ../dc-db-load.yml stop
END
