#!/bin/sh

# Usage example:
#	./load.sh -g kanindata-gotland-v9.xlsx \
#	          -G herd-registry-gotland.xlsx \
#	          -m kanindata-mellerud-v4.xlsx \
#	          -M herd-registry-mellerud.xlsx

usage () {
	cat <<-USAGE_END
	Usage:
	    $0	\\
	    	-g kanindata-gotland.xlsx -G herd-registry-gotland.xlsx \\
	    	-m kanindata-mellerud.xlsx -M herd-registry-mellerud.xlsx

	Options:

	    -g file	Load Gotland rabbit data from "file"
	    -G file	Load Gotland herd data from "file"
	    -m file	Load Mellerud rabbit data from "file"
	    -M file	Load Mellerud herd data from "file"

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
if "$load_gotland" && { [ -z "$Gfile" ] || [ ! -f "$Gfile" ] ;}; then
	echo 'Missing or unusable Gotland herd registry file (-G file)'
	echo 'Will not load Gotland herd data'
fi >&2
if [ -z "$mfile" ] || [ ! -f "$mfile" ]; then
	echo 'Missing or unusable Mellerud data file (-m file)'
	echo 'Will not load Mellerud data'
	load_mellerud=false
fi >&2
if "$load_mellerud" && { [ -z "$Mfile" ] || [ ! -f "$Mfile" ] ;}; then
	echo 'Missing or unusable Mellerud data file (-M file)'
	echo 'Will not load Mellerud herd data'
fi >&2

for name in "$gfile" "$Gfile" "$mfile" "$Mfile"; do
	[ ! -f "$name" ] && continue

	case $name in
		*.xlsx)
			csvname=${name%.xlsx}.csv

			# Convert to CSV if CSV is missing or old
			# shellcheck disable=SC2039,SC3013
			if [ ! -s "$csvname" ] || [ ! -e "$csvname" ] || [ "$csvname" -ot "$name" ]
			then
				printf 'Converting "%s" to "%s"\n' "$name" "$csvname" >&2
				in2csv "$name" |
				grep -v -x '[[:blank:],]\{1,\}' >"$csvname"
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
Mfile=${Mfile%.*}.csv


export PGDATABASE="${POSTGRES_DB:?}"
export PGUSER="${POSTGRES_USER:?}"
export PGPORT="${POSTGRES_PORT?}"
export PGHOST="${POSTGRES_HOST?}"
password="${POSTGRES_PASSWORD?}"
export PGPASS="${POSTGRES_PASSWORD?}"

echo "$PGHOST:$PGPORT:$PGDATABASE:$PGUSER:$PGPASS" > "$HOME/.pgpass"
echo "$PGHOST:$PGPORT:postgres:$PGUSER:$PGPASS" >> "$HOME/.pgpass"

chmod og-rwx "$HOME/.pgpass"

# Assume that we're connecting through a socket if $PGHOST is localhost
# (use 127.0.0.1 if this is not the case).
if [ -z "$PGHOST" ] || [ "$PGHOST" = localhost ]; then
	unset PGHOST PGPORT
fi
connstr="postgresql+psycopg2://$PGUSER:$password@${PGPORT:+$PGHOST:$PGPORT}/$PGDATABASE"

echo '## Initializing database'
psql -d postgres -c  "DROP DATABASE $PGDATABASE;"
createdb "$PGDATABASE"

cd /code || exit 1
python3 -c 'import utils.database as db; db.init()'
cd /scripts || exit 1


echo '## Loading colors'
#Load colors, first add Genebanks
psql --quiet <<-'END_SQL'
	-- Genebanks
	INSERT INTO genebank (genebank_id,name) VALUES (1,'Gotlandskanin'),(2,'Mellerudskanin');
END_SQL
csvsql  --db "$connstr" -I --tables color --insert --no-create herdbookcolors.csv


if "$load_gotland"; then
	echo '## Loading Gotlandskanin'
	./load-gotland.sh "$connstr" "$gfile" "$Gfile"
	echo '## Running Gotlandskanin healthchecks'
	./check-gotland.sh
fi

if "$load_mellerud"; then
	echo '## Loading Mellerudskanin'
	./load-mellerud.sh "$connstr" "$mfile" "$Mfile"
	echo '## Running Mellerudskanin healthchecks'
	./check-mellerud.sh
fi

echo '## Running common healthchecks'
./check-common.sh

echo '## Dumping database to file'
# Find next free dump number for today
prefix=$(date +'%Y%m%d')
d=1
dumpfile=$( printf '%s-%.2d.dump' "$prefix" "$d" )
while [ -f "$dumpfile" ]; do
	d=$(( d + 1 ))
	dumpfile=$( printf '%s-%.2d.dump' "$prefix" "$d" )
done

# Dump complete database in text format, but avoid the CSV tables.
pg_dump --clean \
	--if-exists \
	--no-privileges \
	--no-owner \
	--file="$dumpfile" \
	-T '[gm]_data' -T '[gm]_data2' \
	"$PGDATABASE"
