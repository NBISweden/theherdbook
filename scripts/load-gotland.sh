#!/bin/sh

# Needs to be called by load.sh

echo "Loading rabbits"

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

	UPDATE g_data SET "Intyg" = NULL where "Intyg" = '0';


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

	-- Genebank
	INSERT INTO genebank (name) VALUES ('Gotlandskanin');

	-- Gotland colours
	WITH genebank AS (
		SELECT	genebank_id
			FROM	genebank
     WHERE	name = 'Gotlandskanin'
	), colour_data (c_id, name, comment) AS (
			VALUES  (11, 'Svart', 'Kaninen ska vara helsvart'),
              (12, 'Vit albino', 'Ska ha röda ögon'),
              (13, 'Brun', 'Kan ha svarta inslag'),
              (14, 'Blå', 'Även buken ska vara blå'),
              (15, 'Gulbrun med blågrå mask (Isabella)', 'Även gul siames räknas hit'),
              (16, 'Brun med mörk mask (Madagaskar)', 'Även Thyringer räknas hit'),
              (17, 'Ljusbeige med mörk mask (Sallander)', 'Även siames räkans hit'),
              (18, 'Vit med blå eller bruna ögon', 'Kan ha mörkare öron'),
              (19, 'Svartbrun med vita stänk', NULL),
              (21, 'Järngrå', 'Även järnblå och grafitgrå räknas hit'),
              (22, 'Hargrå / viltfärgad', 'Varierar, kan vara ljus till mörk'),
              (23, 'Snöhare', 'Vit med svart slöja'),
              (24, 'Rödgul eller orange', 'Inte klart åtskild från 25'),
              (25, 'Gul (äv. gul mage) och viltgul (ljus mage)', 'Inte klart åtskild från 24'),
              (26, 'Viltblå (blå med ljus mage) och Pearl egern', 'Gråbrun med blått skimmer'),
              (27, 'Gråmelerad (Chinchilla)', 'Även grå och blå chinchilla räknas hit'),
              (31, 'Svartbrokig (vit med svarta tecken)', 'Även med järngrå tecken räknas hit'),
              (32, 'Blåbrokig (vit med blå tecken)', NULL),
              (33, 'Viltbrokig (vit med hargrå tecken)', NULL),
              (34, 'Gulbrokig (vit med gula tecken)', 'Även orange eller röda tecken'),
              (35, 'Madagaskarbrokig', 'Alltså madagaskartecknad bottenfärg'),
              (36, 'Trefärgad (Tricolor)', 'Oftast vit med svarta och gula tecken'),
              (37, 'Chinchillabrokig (vit med chinchillatecken)', 'Även blå chinchilla eller grå färg'),
              (38, 'Brunbrokig (vit med (mörk-)bruna tecken)', NULL),
              (39, 'Färgad med enstaka vita tecken (Wiener)', 'Ofta vit bläs eller vit tass'),
              (41, 'Gul-blå tigrerad (Japan)', NULL),
              (42, 'Gul-svart tigrerad (Japan)', NULL),
              (43, 'Vit-svart tigrerad (Japan)', NULL),
              (44, 'Svart med vita stickelhår (Svensk päls)', 'Även med grå eller ljusbruna s-hår'),
              (45, 'Blå med vi buk på särskilt sätt', 'Blue & White, även otter'),
              (46, 'Vit-blå tigrerad (Japan)', NULL),
              (49, 'Japanteckning av annat slag', 'Även Japanteckning av okänt slag'),
              (51, 'Rexpälsade att alla färger och teckningar', NULL),
              (52, 'Svart med brun buk på särskilt sätt', 'Black & tan, även otter'),
              (53, 'Svart med vit buk på särskilt sätt', 'Black & White, även otter'),
              (99, 'Allt annat', NULL)
	)
	INSERT INTO colour (colour_id, name, comment, genebank_id)
		SELECT c.c_id, c.name, c.comment, g.genebank_id
			FROM genebank g, colour_data c;

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
		colour_id, colour_note, death_note, notes)
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
    litter_size
  ) SELECT
        father.individual_id,
        mother.individual_id,
        d.birth_date,
        d.litter_size
      FROM (
        SELECT
          d."Far nr",
          d."Mor nr",
          d."Född" birth_date,
          MAX(d."Kull") litter_size
          FROM g_data d
        GROUP BY (d."Far nr", d."Mor nr", d."Född")
      ) d
      JOIN individual father ON d."Far nr" = father.number
      JOIN individual mother ON d."Mor nr" = mother.number;

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
  );

	-- Initial herd tracking
	INSERT INTO herd_tracking (herd_id, individual_id, herd_tracking_date)
	SELECT	i.origin_herd_id, i.individual_id, b.birth_date
    FROM	genebank gb
    JOIN	herd h ON (h.genebank_id = gb.genebank_id)
    JOIN	individual i ON (i.origin_herd_id = h.herd_id)
    JOIN  breeding b ON (i.breeding_id = b.breeding_id)
   WHERE	gb.name = 'Gotlandskanin'
   ORDER BY i.individual_id;
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
	    
# Load tracking data for years 2000 through to 2020
year=2000
while [ "$year" -le 2020 ]; do
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
		SELECT	h.herd_id, i.individual_id, '$year-12-31'
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
# the "GX1" herd at the last of December of the year of that date.
psql --quiet <<-'END_SQL'
	INSERT INTO herd_tracking (herd_id, individual_id, herd_tracking_date)
	SELECT	h.herd_id,
		i.individual_id,
		MAKE_DATE(DATE_PART('year', ht.herd_tracking_date)::integer, 12, 31)
	FROM	herd h
	JOIN	individual i ON (true)
	JOIN	herd_tracking ht ON (ht.individual_id = i.individual_id)
	JOIN	g_data d ON (d."Nummer" = i.number)
	WHERE	h.herd = 'GX1'
	AND	ht.herd_tracking_date = (
		SELECT	MAX(herd_tracking_date)
		FROM	herd_tracking
		WHERE	individual_id = i.individual_id
	)
	AND	d."ny G" = '0'
	ORDER BY	i.individual_id;
END_SQL

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
		SELECT	d."$column", i.individual_id, '$year-12-31'
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

# Load body fat data for years 2012 through to 2018
year=2012
while [ "$year" -le 2018 ]; do
	column="hull $year"

	cat <<-END_SQL
		-- Load $column data
		INSERT INTO bodyfat (bodyfat, individual_id, bodyfat_date)
		SELECT	d."$column", i.individual_id, '$year-12-31'
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
	AND	gb.name = 'Gotlandskanin';

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
	AND	gb.name = 'Gotlandskanin';

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
	AND	gb.name = 'Gotlandskanin';
END_SQL
