#!/bin/bash -e

cd $(dirname $0)

# some config variables
OUTPUT_DIR="$(realpath ${2:-../db_dumps})"
BASE="db-dump"
TIMESTAMP=$(date +"%Y-%m-%d_%H%M")
ENV_FILE=../.docker/database-variables.env
CONTAINER="herdbook-db"
DUMP_FORMAT="tar"

if [[ ! "$1" =~ ^(load|dump)$ ]]
then
  cat << HELP
USAGE: ./dump_load_db.sh [load [filename] | dump [directory]]

Viable options are:

      load <file> --clean       load database dump <file>. Optional flag --clean
                                will drop database objects before recreating them

      dump <directory>          create a dump file. If a directory is given as an
                                argument the dump file will be placed there, else
                                in projectroot/db_dumps/

HELP
  exit 0
fi

if [ "$( docker container inspect -f '{{.State.Status}}' ${CONTAINER} )" != "running" ]
then
  echo "Database container need to be running to perform backup operations"
  exit 1
fi

# load database variables
if [ ! -e "${ENV_FILE}" ]
  then
    echo "Couldn't find env file '$ENV_FILE'." >&2
    exit 1
  fi
source ../.docker/database-variables.env
if [[ -z "$POSTGRES_USER" || -z "$POSTGRES_DB" ]]
then
  echo "env file should contain variables POSTGRES_USER and POSTGRES_DB"
  exit 1
fi

FLAGS="-U $POSTGRES_USER -d $POSTGRES_DB"

if [[ "$1" == "load" ]]
then
  if [[ -z "$2" ]]
  then
    echo "Please specify database dump file"
    exit 1
  fi
  DUMP_FILE=$(realpath $2)
  if [ ! -e "${DUMP_FILE}" ]
  then
    echo "Couldn't find database dump file '$DUMP_FILE'." >&2
    exit 1
  fi
  if [[ "$3" == "--clean" ]]
  then
    FLAGS="--clean $FLAGS"
    fi
  echo "Restoring database from dump file: ${DUMP_FILE}"
  cat "$DUMP_FILE" | docker exec -i "${CONTAINER}" pg_restore $FLAGS

else
  if [[ "$1" == "dump" ]]
  then
    mkdir -p $OUTPUT_DIR
    FILE="$OUTPUT_DIR/${BASE}_${TIMESTAMP}.sql.$DUMP_FORMAT"
    echo "Creating database dump ${FILE}"
    docker exec -i "${CONTAINER}" pg_dump \
    $FLAGS \
    --format="$DUMP_FORMAT" \
    > "$FILE"
  fi
fi
