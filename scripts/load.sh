#!/bin/sh

# Usage example:
#	./load.sh kanindata-gotland-v9.csv kanindata-mellerud-v4.csv

if [ "$#" -ne 2 ]; then
	cat <<-USAGE_END
	Usage:
	    $0 kanindata-gotland.csv kanindata-mellerud.csv
	USAGE_END
	exit 1
elif [ ! -e ../app/config.ini ]; then
	echo 'Expected to find ../app/config.ini'
	exit 1
fi >&2

export PGDATABASE="$( 	sed -n 's/^name=//p' ../app/config.ini )"
export PGUSER="$(	sed -n 's/^user=//p' ../app/config.ini )"

dropdb "$PGDATABASE"
createdb "$PGDATABASE"
../init_db.sh

./load-gotland.sh "$1"
./load-mellerud.sh "$2"

# Find next free dump number for today
prefix=$(date +'%Y%m%d')
d=1
while [ -f "$prefix-$d.dump" ]; do
	d=$(( d + 1 ))
done

# Only dump the specific tables we're loading, nothing else
pg_dump --clean \
	--if-exists \
	--no-privileges \
	-t genebank \
	-t colour \
	-t individual \
	-t weight \
	-t bodyfat \
	-t herd \
	-t herd_tracking \
	"$PGDATABASE" >"$prefix-$d.dump"
