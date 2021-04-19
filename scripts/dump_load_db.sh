#!/usr/bin/env bash

set -e

scriptdir=$( dirname "$0" )

ENV_FILE="$scriptdir/../.docker/database-variables.env"
CONTAINER='herdbook-db'

realpath () {
	if command -v realpath >/dev/null; then
		command realpath --relative-to="$PWD" "$1"
	else
		printf '%s\n' "$1"
	fi
}

usage () {
	cat <<-HELP
	USAGE: $0 load [--clean] filename | dump [directory]

	Sub-commands include

	        load [--clean] filename
	                                Load database dump from "filename".
	                                The optional option "--clean" will drop
	                                database objects before recreating them.

	        dump [directory]
	                                Create a dump file in "directory".
	                                If no directory is given as an argument,
	                                the dump file will be placed in
	                                "$(realpath "$scriptdir/../db_dumps/")".

	         help
	                                Show this help text.
	HELP
}

if [ "$( docker container inspect -f '{{.State.Status}}' ${CONTAINER} )" != "running" ]
then
	echo 'Database container need to be running to perform backup operations' >&2
	exit 1
fi

# load database variables
if [ ! -e "$ENV_FILE" ]; then
	printf 'Could not find env file "%s"\n' "$ENV_FILE" >&2
	exit 1
fi

source "$scriptdir/../.docker/database-variables.env"

if [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_DB" ]; then
	echo 'env file should contain variables POSTGRES_USER and POSTGRES_DB'
	exit 1
fi

FLAGS=(-U "$POSTGRES_USER" -d "$POSTGRES_DB")
unset DUMP_FILE

case $1 in
	load)
		shift
		for arg do
			case $arg in
				--clean)
					FLAGS+=(--clean)
					;;
				*)
					DUMP_FILE=$arg
			esac
		done

		if [ -z "$DUMP_FILE" ]; then
			echo 'Please specify database dump' >&2
			exit 1
		fi

		if [ ! -e "$DUMP_FILE" ]; then
			printf 'Could not find database dump "%s"\n' "$DUMP_FILE" >&2
			exit 1
		fi

		printf 'Restoring database from dump "%s"\n' "$DUMP_FILE"
		docker exec -i "$CONTAINER" \
			pg_restore "${FLAGS[@]}" <"$DUMP_FILE"
		;;
	dump)
		OUTPUT_DIR="$(realpath "${2:-"$scriptdir/../db_dumps"}")"
		BASE='db-dump'
		printf -v TIMESTAMP '%(%Y-%m-%d_%H%M)T' -1
		DUMP_FORMAT='tar'

		printf -v DUMP_FILE '%s/%s_%s.sql.%s' \
			"$OUTPUT_DIR" "$BASE" "$TIMESTAMP" "$DUMP_FORMAT"

		mkdir -p "$OUTPUT_DIR"

		printf 'Creating database dump "%s"\n' "$DUMP_FILE"
		docker exec -i "$CONTAINER" \
			pg_dump "${FLAGS[@]}" --format="$DUMP_FORMAT" >"$DUMP_FILE"
		;;
	''|help)
		usage
		;;
	*)
		printf 'Unknown sub-command "%s"\n' "$1" >&2
		usage >&2
		exit 1
esac
