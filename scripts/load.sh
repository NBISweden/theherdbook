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
export PGPORT="$(	sed -n 's/^port=//p' ../app/config.ini )"
export PGHOST="$(	sed -n 's/^host=//p' ../app/config.ini )"
password="$(		sed -n 's/^password=//p' ../app/config.ini )"

# Assume that we're connecting through a socket if $PGHOST is localhost
# (use 127.0.0.1 if this is not the case).
if [ "$PGHOST" = localhost ]; then
	unset PGHOST PGPORT
fi
connstr="postgresql+psycopg2://$PGUSER:$password@${PGPORT:+$PGHOST:$PGPORT}/$PGDATABASE"

dropdb "$PGDATABASE"
createdb "$PGDATABASE"
../init_db.sh

./load-gotland.sh "$connstr" "$1"
./load-mellerud.sh "$connstr" "$2"

# Find next free dump number for today
prefix=$(date +'%Y%m%d')
d=1
dumpfile=$( printf '%s-%.2d.dump' "$prefix" "$d" )
while [ -f "$dumpfile" ]; do
	d=$(( d + 1 ))
	dumpfile=$( printf '%s-%.2d.dump' "$prefix" "$d" )
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
	"$PGDATABASE" >"$dumpfile"
