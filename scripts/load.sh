#!/bin/sh

# Usage example:
#	./load.sh -g kanindata-gotland-v9.xlsx \
#	          -G herd-registry-gotland.xlsx \
#	          -m kanindata-mellerud-v4.xlsx

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

if [ ! -e ../app/config.ini ]; then
	echo 'Expected to find ../app/config.ini' >&2
	exit 1
fi

while getopts 'g:G:hm:' opt; do
	case $opt in
		g)	gfile=$OPTARG ;;
		G)	Gfile=$OPTARG ;;
		h)	usage; exit ;;
		m)	mfile=$OPTARG ;;
		*)
			echo 'Error in command line parsing' >&2
			usage >&2
			exit 1
	esac
done
shift "$(( OPTIND - 1 ))"

if [ -z "$gfile" ] || [ ! -f "$gfile" ]; then
	echo 'Missing or unusable Gotland data file (-g file)' >&2
	err=1
fi
if [ -z "$Gfile" ] || [ ! -f "$Gfile" ]; then
	echo 'Missing or unusable Gotland herd registry file (-G file)' >&2
	err=1
fi
if [ -z "$mfile" ] || [ ! -f "$mfile" ]; then
	echo 'Missing or unusable Mellerud data file (-m file)' >&2
	err=1
fi
if [ "$err" -eq 1 ]; then
	usage >&2
	exit 1
fi

for name in "$gfile" "$Gfile" "$mfile"; do
	case $name in
		*.xlsx)
			csvname=${name%.xlsx}.csv

			# Convert to CSV if CSV is missing or old
			if [ ! -e "$csvname" ] || [ "$csvname" -ot "$name" ]
			then
				printf 'Converting "%s" to "%s"\n' "$name" "$csvname" >&2
				in2csv "$name" >"$csvname"
			fi
			;;
		*.csv)	# all good
			;;
		*)
			printf 'Expecting *.xlsx or *.csv files, got "%s"\n' "$name" >&2
			exit 1
	esac
done

gfile=${gfile%.*}.csv
Gfile=${Gfile%.*}.csv
mfile=${mfile%.*}.csv

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

./load-gotland.sh "$connstr" "$gfile" "$Gfile"
./load-mellerud.sh "$connstr" "$mfile"

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
