#!/bin/sh

# Needs to be called by load.sh

# Checking for duplicate numbers before even attempting to load data.
echo "Looking for duplicates"
if csvcut -c 5 "$2" | sort | uniq -d | grep .; then
	echo '!!! Duplicates found (see numbers above), aborting' >&2
	exit 1
fi

echo 'Loading rabbits'

csvsql  --db "$1" -I \
	--tables m_data \
	--overwrite \
	--insert "$2"

psql --echo-errors --quiet <<-'END_SQL'
	------------------------------------------------------------
	-- Fixup data
	------------------------------------------------------------

	UPDATE m_data SET "Namn" = TRIM("Namn");
	UPDATE m_data SET "Mor" = TRIM("Mor");
	UPDATE m_data SET "Far" = TRIM("Far");
	UPDATE m_data SET "Besättning" = TRIM("Besättning");


	UPDATE m_data SET "Genb" = REPLACE("Genb",'-','');
	ALTER TABLE m_data ALTER "Genb" TYPE NUMERIC USING "Genb"::numeric;
	ALTER TABLE m_data ALTER "Genb" TYPE INTEGER USING "Genb"::integer;
	ALTER TABLE m_data ALTER "Genb" TYPE VARCHAR(9);
	UPDATE m_data SET "Genb" = CONCAT('M', "Genb")
	       WHERE "Genb" IS NOT NULL AND "Genb" NOT LIKE 'M%';

	ALTER TABLE m_data ALTER "Nummer" TYPE VARCHAR(20);
	UPDATE m_data SET "Nummer" = CONCAT('M', "Nummer")
		WHERE "Nummer" IS NOT NULL AND "Nummer" NOT LIKE 'M%';

	ALTER TABLE m_data ALTER "Kull" TYPE NUMERIC USING "Kull"::numeric;
	ALTER TABLE m_data ALTER "Kull" TYPE INTEGER USING "Kull"::integer;

	ALTER TABLE m_data ALTER "Född" TYPE DATE USING "Född"::date;

	ALTER TABLE m_data ALTER "Mor nr" TYPE VARCHAR(20);
	UPDATE m_data SET "Mor nr" = CONCAT('M', "Mor nr")
	WHERE "Mor nr" IS NOT NULL AND "Mor nr" NOT LIKE 'M%';

	ALTER TABLE m_data ALTER "Far nr" TYPE VARCHAR(20);
	UPDATE m_data SET "Far nr" = CONCAT('M', "Far nr")
	WHERE "Far nr" IS NOT NULL AND "Far nr" NOT LIKE 'M%';

	UPDATE m_data SET "Kön" = 'male' WHERE "Kön" = 'Hane';
	UPDATE m_data SET "Kön" = 'female' WHERE "Kön" = 'Hona';

	ALTER TABLE m_data ADD "Färgnr" INTEGER;
	UPDATE m_data SET "Färgnr" = 101 WHERE "Färg" LIKE '%lbino%';
	UPDATE m_data SET "Färgnr" = 100 WHERE "Färgnr" IS NULL AND "Färg" LIKE '%v%';
	UPDATE m_data SET "Färg" = NULL WHERE "Färgnr" IS NULL;

	------------------------------------------------------------
	-- Insert
	------------------------------------------------------------

	-- Dummy herd for individuals sold outside of the genebank
	INSERT INTO herd (genebank_id, herd, herd_name)
	SELECT	DISTINCT gb.genebank_id, 'MX1', 'Externa djur (Mellerud)'
	FROM	genebank gb
	WHERE	gb.name = 'Mellerudskanin';

	-- Stub herd data
	INSERT INTO herd (genebank_id, herd)
	SELECT	DISTINCT gb.genebank_id, d."Genb"
	FROM	genebank gb
	JOIN	m_data d ON (TRUE)
	WHERE	gb.name = 'Mellerudskanin'
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
	JOIN	m_data d ON (d."Genb" = h.herd)
	WHERE	gb.name = 'Mellerudskanin'
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
          FROM m_data d
        GROUP BY (d."Far nr", d."Mor nr", d."Född", d."Genb")
      ) d
      JOIN individual father ON d."Far nr" = father.number
      JOIN individual mother ON d."Mor nr" = mother.number
      JOIN herd h on d."Genb" = h.herd;

  -- Associate individuals and breeding values
  WITH breeding_nums AS (
    SELECT b.breeding_id, b.birth_date, f.number father, m.number mother
      FROM breeding b
      LEFT JOIN individual f ON b.father_id = f.individual_id
      LEFT JOIN individual m ON b.mother_id = m.individual_id
  ) UPDATE individual i SET breeding_id = (
    SELECT b.breeding_id
      FROM breeding_nums b
      JOIN m_data d
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
	UPDATE  breeding
	SET     birth_date = m."Född"
	FROM    m_data m
	JOIN    individual i ON (m."Nummer" = i.number)
	WHERE   i.breeding_id = breeding.breeding_id
	AND     birth_date IS NULL;

	-- Initial herd tracking
	INSERT INTO herd_tracking (herd_id, individual_id, herd_tracking_date)
  SELECT	i.origin_herd_id, i.individual_id, b.birth_date
    FROM	genebank gb
    JOIN	herd h ON (h.genebank_id = gb.genebank_id)
    JOIN	individual i ON (i.origin_herd_id = h.herd_id)
    JOIN  breeding b ON (i.breeding_id = b.breeding_id)
   WHERE	gb.name = 'Mellerudskanin'
   ORDER BY i.individual_id;

END_SQL

# Fix table names for years and clean up fields.

for year in $(seq 2000 2100); do
  cat <<-END_SQL

DO \$\$
BEGIN
  IF EXISTS(SELECT *
    FROM information_schema.columns
    WHERE table_name='m_data' and column_name='${year}.0')
  THEN
      ALTER TABLE "public"."m_data" RENAME COLUMN "${year}.0" TO "$year";
      ALTER TABLE m_data ALTER "$year" TYPE VARCHAR(20);
  END IF;
  IF EXISTS(SELECT *
    FROM information_schema.columns
    WHERE table_name='m_data' and column_name='${year}')
  THEN
      UPDATE m_data SET "$year" = NULL WHERE "$year" is null;

      ALTER TABLE m_data ALTER "$year" TYPE NUMERIC USING "$year"::numeric;
      ALTER TABLE m_data ALTER "$year" TYPE INTEGER USING "$year"::integer;
  END IF;
END \$\$;

END_SQL

done | psql --quiet

# Load tracking data for years 2000 through to 2020
year=2000
while [ "$year" -le 2020 ]; do
	cat <<-END_SQL
		-- Fix column type etc.
		ALTER TABLE m_data ALTER "$year" TYPE VARCHAR(12);
		UPDATE m_data SET "$year" = NULL
		WHERE "$year" LIKE 's%';
		UPDATE m_data SET "$year" = CONCAT('M', "$year")
		WHERE "$year" IS NOT NULL AND "$year" NOT LIKE 'M%';

		-- Add missing herds
		INSERT INTO herd (genebank_id, herd)
		SELECT	DISTINCT gb.genebank_id, d."$year"
		FROM	genebank gb
		JOIN	m_data d ON (TRUE)
		WHERE	gb.name = 'Mellerudskanin'
		AND	d."$year" NOT IN (
			SELECT herd
			FROM	herd
		)
		ORDER BY d."$year";

		-- Load $year data
		INSERT INTO herd_tracking (herd_id, individual_id, herd_tracking_date)
		SELECT	h.herd_id,
			i.individual_id,
			LEAST('$year-12-31', CURRENT_DATE - interval '1 day')
		FROM	genebank gb
		JOIN	herd h ON (h.genebank_id = gb.genebank_id)
		JOIN	m_data d ON (d."$year" = h.herd)
		JOIN	individual i ON (i.number = d."Nummer")
		WHERE	gb.name = 'Mellerudskanin'
		ORDER BY i.individual_id;
	END_SQL

	year=$(( year + 1 ))
done | psql --quiet

# Update the herd table with the herd names
psql --quiet <<-'END_SQL'
	UPDATE herd h
	SET herd_name = (
		SELECT MAX("Besättning")
		FROM	m_data
		WHERE	"Genb" = h.herd
		LIMIT 1
	)
	FROM	genebank gb
	WHERE	gb.genebank_id = h.genebank_id
	AND	gb.name = 'Mellerudskanin'
	AND	h.herd_name IS NULL;
END_SQL

# Fix herd-tracking dates.  This moves the latest herd tracking event
# to the birth date, plus 8 weeks, for each individual whose latest
# herd tracking event happened on the year of birth.
# See issue #423:
#       https://github.com/NBISweden/theherdbook/issues/423
psql --quiet <<-'END_SQL'
	WITH	ht_tmp AS (
		-- Temporary table containing the latest herd tracking
		-- event for each individual in the current genebank.
		SELECT	individual_id, herd_tracking_id
		FROM	herd_tracking ht_inner
		JOIN	herd h ON (ht_inner.herd_id = h.herd_id)
		JOIN	genebank gb ON (h.genebank_id = gb.genebank_id)
		WHERE	gb.name = 'Mellerudskanin'
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

if [ ! -f "$3" ]; then 
    # No herd info
    exit 0
fi

# read the csv into a temprary table called 'm_data2'
csvsql  --db "$1" -I \
	--tables m_data2 \
	--overwrite \
	--insert "$3"

psql --echo-errors --quiet <<-'END_SQL'
	UPDATE m_data2 SET "Genbanknr." = REPLACE("Genbanknr.",'-','');
	ALTER TABLE m_data2 ALTER "Genbanknr." TYPE NUMERIC USING "Genbanknr."::numeric;
	ALTER TABLE m_data2 ALTER "Genbanknr." TYPE INTEGER USING "Genbanknr."::integer;
	ALTER TABLE m_data2 ALTER "Genbanknr." TYPE VARCHAR(9);

	UPDATE m_data2 SET "Genbanknr." = CONCAT('M', "Genbanknr.")
	       WHERE "Genbanknr." IS NOT NULL AND "Genbanknr." NOT LIKE 'M%';

	UPDATE	m_data2
	SET	"Start" = CONCAT("Start", '-01-01')
	WHERE	"Start" LIKE ('____');

	ALTER TABLE m_data2 ALTER "Start" TYPE DATE USING "Start"::date;

	UPDATE herd h
	SET herd_name = (
		SELECT MAX("Gårdsnamn")
		FROM	m_data2
		WHERE	"Genbanknr." = h.herd
		LIMIT 1
	)
	FROM	genebank gb
	WHERE	gb.genebank_id = h.genebank_id
	AND	gb.name = 'Mellerudskanin'
	AND	h.herd_name IS NULL;

	UPDATE herd h
	SET name = (
		SELECT MAX("Namn")
		FROM	m_data2
		WHERE	"Genbanknr." = h.herd
		LIMIT 1
	)
	FROM	genebank gb
	WHERE	gb.genebank_id = h.genebank_id
	AND	gb.name = 'Mellerudskanin'
	AND	h.name IS NULL;

	UPDATE herd h
	SET is_active = (
		SELECT "status" = 'A'
		FROM	m_data2
		WHERE	"Genbanknr." = h.herd
		LIMIT 1
	)
	FROM	genebank gb
	WHERE	gb.genebank_id = h.genebank_id
	AND	gb.name = 'Mellerudskanin'
	AND	h.is_active IS NULL;

	UPDATE herd h
	SET is_active = FALSE
	FROM	genebank gb
	WHERE	gb.genebank_id = h.genebank_id
	AND	gb.name = 'Mellerudskanin'
	AND	h.is_active IS NULL;

	UPDATE	herd h
	SET	start_date = (
		SELECT "Start"
		FROM	m_data2
		WHERE	"Genbanknr." = h.herd
		LIMIT	1
	)
	FROM	genebank gb
	WHERE	gb.genebank_id = h.genebank_id
	AND	gb.name = 'Mellerudskanin'
	AND	h.start_date IS NULL;
END_SQL
