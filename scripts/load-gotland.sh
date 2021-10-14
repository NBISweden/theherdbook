#!/bin/sh

# Needs to be called by load.sh

# Checking for duplicate numbers before even attempting to load data.
echo "Looking for duplicates"
if csvcut -c 4 "$2" | sort | uniq -d | grep .; then
	echo '!!! Duplicates found (see numbers above), aborting' >&2
	exit 1
fi

echo 'Loading rabbits'

csvsql  --db "$1" -I \
	--tables g_data \
	--overwrite \
	--insert "$2"

psql --echo-errors --quiet <<-'END_SQL'
	------------------------------------------------------------
	-- Fixup data
	------------------------------------------------------------

	UPDATE g_data SET "Namn" = TRIM("Namn");
	UPDATE g_data SET "Mor" = TRIM("Mor");
	UPDATE g_data SET "Far" = TRIM("Far");

	UPDATE g_data SET "Intyg" = NULL where "Intyg" = '0' or "Intyg" = '?';

	UPDATE g_data SET "ny G" = NULL WHERE "ny G" = 'u';
	UPDATE g_data SET "ny G" = NULL WHERE "ny G" = '0' AND "2021" IS NOT NULL;

	ALTER TABLE g_data ALTER "ny G" TYPE NUMERIC USING "ny G"::numeric;
	ALTER TABLE g_data ALTER "ny G" TYPE INTEGER USING "ny G"::integer;

	ALTER TABLE g_data ALTER "Genb" TYPE NUMERIC USING "Genb"::numeric;
	ALTER TABLE g_data ALTER "Genb" TYPE INTEGER USING "Genb"::integer;
	ALTER TABLE g_data ALTER "Genb" TYPE VARCHAR(10);
	UPDATE g_data SET "Genb" = CONCAT('G', "Genb")
	       WHERE "Genb" IS NOT NULL AND "Genb" NOT LIKE 'G%';

	UPDATE g_data SET "Nummer" = CONCAT('G', "Nummer")
	       WHERE "Nummer" IS NOT NULL AND "Nummer" NOT LIKE 'G%';

	ALTER TABLE g_data ALTER "Mor nr" TYPE VARCHAR(20);
	UPDATE g_data SET "Mor nr" = CONCAT('G', "Mor nr")
	       WHERE "Mor nr" IS NOT NULL AND "Mor nr" NOT LIKE 'G%';

	ALTER TABLE g_data ALTER "Far nr" TYPE VARCHAR(20);
	UPDATE g_data SET "Far nr" = CONCAT('G', "Far nr")
	       WHERE "Far nr" IS NOT NULL AND "Far nr" NOT LIKE 'G%';

	UPDATE g_data SET "Kön" = 'male' WHERE "Kön" = 'hane';
	UPDATE g_data SET "Kön" = 'female' WHERE "Kön" = 'hona';

	UPDATE g_data SET "Färgnr" = NULL WHERE "Färgnr" = '?';
	UPDATE g_data SET "Färgnr" = NULL WHERE "Färgnr" = '0';

	ALTER TABLE g_data ALTER "Färgnr" TYPE NUMERIC USING "Färgnr"::numeric;
	ALTER TABLE g_data ALTER "Färgnr" TYPE INTEGER USING "Färgnr"::integer;

	ALTER TABLE g_data ALTER "Född" TYPE DATE USING "Född"::date;

	ALTER TABLE g_data ALTER "Kull" TYPE NUMERIC USING "Kull"::numeric;
	ALTER TABLE g_data ALTER "Kull" TYPE INTEGER USING "Kull"::integer;

	-- TODO: Use these columns to hold g_data temporarily, then move
	-- that g_data into the breeding table.
	-- Add "mother_id", "father_id", "birth_date", "litter"
	-- to the "individual" table, temporarily.
	-- ALTER TABLE individual
	-- ADD COLUMN mother_id INTEGER,
	-- ADD COLUMN father_id INTEGER,
	-- ADD COLUMN birth_date DATE,
	-- ADD COLUMN litter INTEGER;

	------------------------------------------------------------
	-- Insert
	------------------------------------------------------------

	-- Dummy herd for individuals sold outside of the genebank
	INSERT INTO herd (genebank_id, herd, herd_name)
	SELECT	DISTINCT gb.genebank_id, 'GX1', 'Externa djur (Gotland)'
	FROM	genebank gb
	WHERE	gb.name = 'Gotlandskanin';

	-- Stub herd data
	INSERT INTO herd (genebank_id, herd)
	SELECT	DISTINCT gb.genebank_id, d."Genb"
	FROM	genebank gb
	JOIN	g_data d ON (TRUE)
	WHERE	gb.name = 'Gotlandskanin'
	ORDER BY d."Genb";

	-- Stub individual data
	INSERT INTO individual (origin_herd_id,
		name, certificate, number, sex,
		color_id, color_note, death_note, notes)
	SELECT	h.herd_id,
		d."Namn", d."Intyg", d."Nummer", d."Kön",
		d."Färgnr", d."Färg", d."Död", d."Övrigt"
	FROM	genebank gb
	JOIN	herd h ON (h.genebank_id = gb.genebank_id)
	JOIN	g_data d ON (d."Genb" = h.herd)
	WHERE	gb.name = 'Gotlandskanin'
	ORDER BY d."Nummer";

  -- Create breeding values
  INSERT INTO breeding (
    father_id,
    mother_id,
    birth_date,
    litter_size,
    breeding_herd_id
  ) SELECT
        father.individual_id,
        mother.individual_id,
        d.birth_date,
        d.litter_size,
        h.herd_id
      FROM (
        SELECT
          d."Far nr",
          d."Mor nr",
          d."Född" birth_date,
          MAX(d."Kull") litter_size,
          d."Genb"
		  FROM g_data d
          GROUP BY (d."Far nr", d."Mor nr", d."Född", d."Genb")
      ) d
      JOIN individual father ON d."Far nr" = father.number
      JOIN individual mother ON d."Mor nr" = mother.number
      JOIN herd h ON d."Genb" = h.herd;

  -- Associate individuals and breeding values
  WITH breeding_nums AS (
    SELECT b.breeding_id, b.birth_date, f.number father, m.number mother
      FROM breeding b
      LEFT JOIN individual f ON b.father_id = f.individual_id
      LEFT JOIN individual m ON b.mother_id = m.individual_id
  ) UPDATE individual i SET breeding_id = (
    SELECT b.breeding_id
      FROM breeding_nums b
      JOIN g_data d
        ON d."Nummer" = i.number
       AND d."Far nr" = b.father
       AND d."Mor nr" = b.mother
       AND d."Född" = b.birth_date
  ) WHERE i.breeding_id IS NULL;


   ---
   --- Create empty breeding events for any remaining individuals
   ---
   DO $$
   DECLARE iid INTEGER;
   BEGIN
     FOR iid IN SELECT individual_id FROM individual WHERE breeding_id is NULL
     LOOP
        WITH b AS (
           INSERT INTO breeding(breed_date, breeding_herd_id)
	   SELECT NULL, i.origin_herd_id
	   FROM individual i
           WHERE i.individual_id = iid
           RETURNING breeding_id)
        UPDATE individual
          SET breeding_id = b.breeding_id
          FROM b
          WHERE individual_id=iid;
     END LOOP;
   END;
   $$;

	-- Fix missing breeding birth_date entries
	UPDATE	breeding
	SET	birth_date = g."Född"
	FROM	g_data g
	JOIN	individual i ON (g."Nummer" = i.number)
	WHERE	i.breeding_id = breeding.breeding_id
	AND	birth_date IS NULL;

	-- Initial herd tracking
	INSERT	INTO herd_tracking (herd_id, individual_id, herd_tracking_date)
	SELECT	i.origin_herd_id, i.individual_id, b.birth_date
	FROM	genebank gb
	JOIN	herd h ON (h.genebank_id = gb.genebank_id)
	JOIN	individual i ON (i.origin_herd_id = h.herd_id)
	JOIN	breeding b ON (i.breeding_id = b.breeding_id)
	WHERE	gb.name = 'Gotlandskanin'
	ORDER BY	i.individual_id;

END_SQL

# Fix table names for years.

for year in $(seq 2000 2100); do
  cat <<-END_SQL

DO \$\$
BEGIN
  IF EXISTS(SELECT *
    FROM information_schema.columns
    WHERE table_name='g_data' and column_name='${year}.0')
  THEN
      ALTER TABLE "public"."g_data" RENAME COLUMN "${year}.0" TO "$year";
      ALTER TABLE g_data ALTER "$year" TYPE VARCHAR(20);
  END IF;
  IF EXISTS(SELECT *
    FROM information_schema.columns
    WHERE table_name='g_data' and column_name='${year}')
  THEN
      UPDATE g_data SET "$year" = NULL WHERE "$year" is null;

      ALTER TABLE g_data ALTER "$year" TYPE NUMERIC USING "$year"::numeric;
      ALTER TABLE g_data ALTER "$year" TYPE INTEGER USING "$year"::integer;
  END IF;
END \$\$;

END_SQL

done | psql  --quiet

# Load tracking data for years 2000 through to 2021
year=2000
while [ "$year" -le 2021 ]; do
	column=$year

	cat <<-END_SQL
		-- Fix column type etc.
		ALTER TABLE g_data ALTER "$column" TYPE VARCHAR(10);
		UPDATE g_data SET "$column" = CONCAT('G', "$column")
		WHERE "$column" IS NOT NULL AND "$column" NOT LIKE 'G%';

		-- Add missing herds
		INSERT INTO herd (genebank_id, herd)
		SELECT	DISTINCT gb.genebank_id, d."$column"
		FROM	genebank gb
		JOIN	g_data d ON (TRUE)
		WHERE	gb.name = 'Gotlandskanin'
		AND	d."$column" NOT IN (
			SELECT herd
			FROM	herd
		)
		ORDER BY d."$column";

		-- Load $column data
		INSERT INTO herd_tracking (herd_id, individual_id, herd_tracking_date)
		SELECT	h.herd_id,
			i.individual_id,
			LEAST('$year-12-31', CURRENT_DATE - interval '1 day')
		FROM	genebank gb
		JOIN	herd h ON (h.genebank_id = gb.genebank_id)
		JOIN	g_data d ON (d."$column" = h.herd)
		JOIN	individual i ON (i.number = d."Nummer")
		WHERE	gb.name = 'Gotlandskanin'
		ORDER BY i.individual_id;
	END_SQL

	year=$(( year + 1 ))
done | psql --quiet

# Handle individuals that have disappeared from this genebank (animals
# sold to external herds).  For each individual with "ny G" equal to
# "0", figure out the most recent tracking date.  Add tracking info to
# the "GX1" herd at the last of December of the year *after* the year of
# that date.
#
# Note that we don't touch animals that have no data in any of the
# yearly columns (this is the "> 1" condition below).  These are handled
# separately just afterwards.

psql --quiet <<-'END_SQL'
	INSERT INTO herd_tracking (herd_id, individual_id, herd_tracking_date)
	SELECT	h.herd_id,
		i.individual_id,
		LEAST(
			CURRENT_DATE - interval '1 day',
			MAKE_DATE(
				EXTRACT(YEAR FROM ht.herd_tracking_date)::integer + 1,
				12, 31
			)
		)
	FROM	herd h
	JOIN	individual i ON (true)
	JOIN	herd_tracking ht ON (ht.individual_id = i.individual_id)
	JOIN	g_data d ON (d."Nummer" = i.number)
	WHERE	h.herd = 'GX1'
	AND	(
		SELECT	COUNT(*)
		FROM	herd_tracking
		WHERE	individual_id = i.individual_id
		) > 1
	AND	ht.herd_tracking_date = (
		SELECT	MAX(herd_tracking_date)
		FROM	herd_tracking
		WHERE	individual_id = i.individual_id
		)
	AND	d."ny G" = '0'
	ORDER BY	i.individual_id;
END_SQL

# Handle the animals we skipped in the previous step.  These gets a
# tracking date of their birth date plus 8 weeks.

psql --quiet <<-'END_SQL'
	INSERT INTO herd_tracking (herd_id, individual_id, herd_tracking_date)
	SELECT	h.herd_id,
		i.individual_id,
		b.birth_date + interval '8 weeks'
	FROM	herd h
	JOIN	individual i ON (true)
	JOIN	breeding b ON (i.breeding_id = b.breeding_id)
	JOIN	herd_tracking ht ON (ht.individual_id = i.individual_id)
	JOIN	g_data d ON (d."Nummer" = i.number)
	WHERE	h.herd = 'GX1'
	AND	(
		SELECT	COUNT(*)
		FROM	herd_tracking
		WHERE	individual_id = i.individual_id
		) = 1
	AND	d."ny G" = '0'
	ORDER BY	i.individual_id;
END_SQL

# Fix herd-tracking dates.  This moves the latest herd tracking event
# to the birth date, plus 8 weeks, for each individual whose latest
# herd tracking event happened on the year of birth.
# See issue #423:
#	https://github.com/NBISweden/theherdbook/issues/423
psql --quiet <<-'END_SQL'
	WITH	ht_tmp AS (
		-- Temporary table containing the latest herd tracking
		-- event for each individual in the current genebank.
		SELECT	individual_id, herd_tracking_id
		FROM	herd_tracking ht_inner
		JOIN	herd h ON (ht_inner.herd_id = h.herd_id)
		JOIN	genebank gb ON (h.genebank_id = gb.genebank_id)
		WHERE	gb.name = 'Gotlandskanin'
		AND	ht_inner.herd_tracking_date = (
			SELECT	MAX(herd_tracking_date)
			FROM	herd_tracking
			WHERE	individual_id = ht_inner.individual_id
			)
		)
	UPDATE	herd_tracking ht
	SET	herd_tracking_date = b.birth_date + interval '8 weeks'
	FROM	individual i
	JOIN	breeding b ON (i.breeding_id = b.breeding_id)
	JOIN	ht_tmp ON (i.individual_id = ht_tmp.individual_id)
	WHERE	ht.herd_tracking_id = ht_tmp.herd_tracking_id
	AND	EXTRACT(YEAR FROM b.birth_date) =
		EXTRACT(YEAR FROM ht.herd_tracking_date)
END_SQL

# jscpd:ignore-start

# For the weight and body fat data, we run similar SQL as above, but
# with different values for $column, and different ranges of values for
# $year (etc.)

# Load weight data for years 2012 through to 2019
year=2012
while [ "$year" -le 2019 ]; do
	column="vikt $year"

	cat <<-END_SQL
		-- Fix column type
		ALTER TABLE g_data ALTER "$column" TYPE NUMERIC USING "$column"::numeric;
		ALTER TABLE g_data ALTER "$column" TYPE REAL;

		-- Load $column data
		INSERT INTO weight (weight, individual_id, weight_date)
		SELECT	d."$column",
			i.individual_id,
			LEAST('$year-12-31', CURRENT_DATE - interval '1 day')
		FROM	genebank gb
		JOIN	herd h ON (h.genebank_id = h.genebank_id)
		JOIN	individual i ON (i.origin_herd_id = h.herd_id)
		JOIN	g_data d ON (d."Nummer" = i.number)
		WHERE	gb.name = 'Gotlandskanin'
		AND	d."$column" IS NOT NULL
		ORDER BY i.individual_id;
	END_SQL

	year=$(( year + 1 ))
done | psql --quiet

# Load body fat data for years 2012 through to 2019
year=2012
while [ "$year" -le 2019 ]; do
	column="hull $year"

	cat <<-END_SQL
		-- Load $column data
		INSERT INTO bodyfat (bodyfat, individual_id, bodyfat_date)
		SELECT	d."$column",
			i.individual_id,
			LEAST('$year-12-31', CURRENT_DATE - interval '1 day')
		FROM	genebank gb
		JOIN	herd h ON (h.genebank_id = h.genebank_id)
		JOIN	individual i ON (i.origin_herd_id = h.herd_id)
		JOIN	g_data d ON (d."Nummer" = i.number)
		WHERE	gb.name = 'Gotlandskanin'
		AND	d."$column" IS NOT NULL
		ORDER BY i.individual_id;
	END_SQL

	year=$(( year + 1 ))
done | psql --quiet

# Fix up the body fat data
psql --quiet<<-'END_SQL'
	UPDATE	bodyfat
	SET	bodyfat = 'low'
	WHERE	bodyfat = 'm';

	UPDATE	bodyfat
	SET	bodyfat = 'normal'
	WHERE	bodyfat = 'n';

	UPDATE	bodyfat
	SET	bodyfat = 'high'
	WHERE	bodyfat = 'f';

	DELETE FROM 	bodyfat
	WHERE	bodyfat NOT IN ('low', 'normal', 'high');
END_SQL


if [ ! -f "$3" ]; then
	# No herd info
	exit 0
fi

# jscpd:ignore-end

# The Gotland data set has herd names etc. in a separate Excel file.
# Load that file separately.

echo "Loading herds"

csvsql	--db "$1" \
	--tables g_data2 \
	--overwrite \
	--insert \
	--skip-lines 5 "$3"

psql --quiet <<-'END_SQL'
	-- Fixup data somewhat
	ALTER TABLE g_data2 ALTER "Nr" TYPE NUMERIC USING "Nr"::numeric;
	ALTER TABLE g_data2 ALTER "Nr" TYPE INTEGER USING "Nr"::integer;
	ALTER TABLE g_data2 ALTER "Nr" TYPE VARCHAR(10);

	UPDATE g_data2 SET "Nr" = CONCAT('G', "Nr")
	WHERE "Nr" IS NOT NULL AND "Nr" NOT LIKE 'G%';

	UPDATE	g_data2 SET "Start" = NULL
	WHERE	"Start" NOT LIKE '____-__-__';

	ALTER TABLE g_data2 ALTER "Start" TYPE DATE USING "Start"::date;

	-- Add herd names
	UPDATE herd h
	SET herd_name = (
		SELECT MAX("Gårdsnamn")
		FROM	g_data2
		WHERE	"Nr" = h.herd
		LIMIT 1
	)
	FROM	genebank gb
	WHERE	gb.genebank_id = h.genebank_id
	AND	gb.name = 'Gotlandskanin'
	AND	h.herd_name IS NULL;

	-- Add herd active status
	UPDATE herd h
	SET is_active = (
		SELECT "Status" = 'A'
		FROM	g_data2
		WHERE	"Nr" = h.herd
		LIMIT 1
	)
	FROM	genebank gb
	WHERE	gb.genebank_id = h.genebank_id
	AND	gb.name = 'Gotlandskanin'
	AND	h.is_active IS NULL;

	-- All active is null should be false 
	UPDATE herd h
	SET is_active = FALSE
	FROM	genebank gb
	WHERE	gb.genebank_id = h.genebank_id
	AND	gb.name = 'Gotlandskanin'
	AND	h.is_active IS NULL;

	-- Add names of people responsible for the herd
	UPDATE herd h
	SET name = (
		SELECT "Namn"
		FROM	g_data2
		WHERE	"Nr" = h.herd
		LIMIT	1
	)
	FROM	genebank gb
	WHERE	gb.genebank_id = h.genebank_id
	AND	gb.name = 'Gotlandskanin'
	AND	h.name IS NULL;

	-- Add start date
	UPDATE herd h
	SET start_date = (
		SELECT	"Start"
		FROM	g_data2
		WHERE	"Nr" = h.herd
		LIMIT	1
	)
	FROM	genebank gb
	WHERE	gb.genebank_id = h.genebank_id
	AND	gb.name = 'Gotlandskanin'
	AND	h.start_date IS NULL;
END_SQL
