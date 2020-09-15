#!/bin/sh

# Usage example:
#	./load.sh kanindata-gotland-v9.xlsx kanindata-mellerud-v4.xlsx

if [ "$#" -ne 2 ]; then
	cat <<-USAGE_END
	Usage:
	    $0 kanindata-gotland.xlsx kanindata-mellerud.xlsx
	USAGE_END
	exit 1
elif [ ! -e ../app/config.ini ]; then
	echo 'Expected to find ../app/config.ini'
	exit 1
fi >&2

for name do
	shift
	case $name in
		*.xlsx)
			csvname=${name%.xlsx}.csv

			# Convert to CSV if CSV is missing or old
			if [ ! -e "$csvname" ] || [ "$csvname" -ot "$name" ]
			then
				printf 'Converting "%s" to "%s"\n' "$name" "$csvname"
				in2csv "$name" >"$csvname"
			fi
			set -- "$@" "$csvname"
			;;
		*.csv)
			set -- "$@" "$name"
			;;
		*)
			printf 'Expecting *.xlsx or *.csv files, got "%s"\n' "$name"
			exit 1
	esac
done >&2

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
	-t individual \
	-t weight \
	-t bodyfat \
	-t herd \
	-t herd_tracking \
	"$PGDATABASE" >"$prefix-$d.dump"
