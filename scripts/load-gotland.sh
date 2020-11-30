#!/bin/sh

# Needs to be called by load.sh

csvsql  --db "$1" \
	--tables data \
	--overwrite \
	--insert "$2"

psql --quiet <<-'END_SQL'
	------------------------------------------------------------
	-- Fixup data
	------------------------------------------------------------

	UPDATE data SET "Namn" = TRIM("Namn");
	UPDATE data SET "Mor" = TRIM("Mor");
	UPDATE data SET "Far" = TRIM("Far");

	UPDATE data SET "Intyg" = NULL where "Intyg" = '0';

	ALTER TABLE data ALTER "Genb" TYPE VARCHAR(10);
	UPDATE data SET "Genb" = CONCAT('G', "Genb")
	WHERE "Genb" IS NOT NULL AND "Genb" NOT LIKE 'G%';

	UPDATE data SET "Nummer" = CONCAT('G', "Nummer")
	WHERE "Nummer" IS NOT NULL AND "Nummer" NOT LIKE 'G%';

	ALTER TABLE data ALTER "Mor nr" TYPE VARCHAR(20);
	UPDATE data SET "Mor nr" = CONCAT('G', "Mor nr")
	WHERE "Mor nr" IS NOT NULL AND "Mor nr" NOT LIKE 'G%';

	ALTER TABLE data ALTER "Far nr" TYPE VARCHAR(20);
	UPDATE data SET "Far nr" = CONCAT('G', "Far nr")
	WHERE "Far nr" IS NOT NULL AND "Far nr" NOT LIKE 'G%';

	UPDATE data SET "Kön" = 'male' WHERE "Kön" = 'hane';
	UPDATE data SET "Kön" = 'female' WHERE "Kön" = 'hona';

	UPDATE data SET "Färgnr" = NULL WHERE "Färgnr" = '?';
	UPDATE data SET "Färgnr" = NULL WHERE "Färgnr" = '0';
	ALTER TABLE data ALTER "Färgnr" TYPE INTEGER USING "Färgnr"::integer;

	-- TODO: Use these columns to hold data temporarily, then move
	-- that data into the breeding table.
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

	-- FIXME: The following is broken.
	-- Gotland colours
	WITH id AS (
		SELECT	genebank_id
		FROM	genebank
		WHERE	name = 'Gotlandskanin'
	)
	INSERT INTO colour (colour_id, name, comment, genebank_id) VALUES
		(11, 'Svart', 'Kaninen ska vara helsvart', id),
		(12, 'Vit albino', 'Ska ha röda ögon', id),
		(13, 'Brun', 'Kan ha svarta inslag', id),
		(14, 'Blå', 'Även buken ska vara blå', id),
		(15, 'Gulbrun med blågrå mask (Isabella)', 'Även gul siames räknas hit', id),
		(16, 'Brun med mörk mask (Madagaskar)', 'Även Thyringer räknas hit', id),
		(17, 'Ljusbeige med mörk mask (Sallander)', 'Även siames räkans hit', id),
		(18, 'Vit med blå eller bruna ögon', 'Kan ha mörkare öron', id),
		(19, 'Svartbrun med vita stänk', NULL, id),
		(21, 'Järngrå', 'Även järnblå och grafitgrå räknas hit', id),
		(22, 'Hargrå / viltfärgad', 'Varierar, kan vara ljus till mörk', id),
		(23, 'Snöhare', 'Vit med svart slöja', id),
		(24, 'Rödgul eller orange', 'Inte klart åtskild från 25', id),
		(25, 'Gul (äv. gul mage) och viltgul (ljus mage)', 'Inte klart åtskild från 24', id),
		(26, 'Viltblå (blå med ljus mage) och Pearl egern', 'Gråbrun med blått skimmer', id),
		(27, 'Gråmelerad (Chinchilla)', 'Även grå och blå chinchilla räknas hit', id),
		(31, 'Svartbrokig (vit med svarta tecken)', 'Även med järngrå tecken räknas hit', id),
		(32, 'Blåbrokig (vit med blå tecken)', NULL, id),
		(33, 'Viltbrokig (vit med hargrå tecken)', NULL, id),
		(34, 'Gulbrokig (vit med gula tecken)', 'Även orange eller röda tecken', id),
		(35, 'Madagaskarbrokig', 'Alltså madagaskartecknad bottenfärg', id),
		(36, 'Trefärgad (Tricolor)', 'Oftast vit med svarta och gula tecken', id),
		(37, 'Chinchillabrokig (vit med chinchillatecken)', 'Även blå chinchilla eller grå färg', id),
		(38, 'Brunbrokig (vit med (mörk-)bruna tecken)', NULL, id),
		(39, 'Färgad med enstaka vita tecken (Wiener)', 'Ofta vit bläs eller vit tass', id),
		(41, 'Gul-blå tigrerad (Japan)', NULL, id),
		(42, 'Gul-svart tigrerad (Japan)', NULL, id),
		(43, 'Vit-svart tigrerad (Japan)', NULL, id),
		(44, 'Svart med vita stickelhår (Svensk päls)', 'Även med grå eller ljusbruna s-hår', id),
		(45, 'Blå med vi buk på särskilt sätt', 'Blue & White, även otter', id),
		(46, 'Vit-blå tigrerad (Japan)', NULL, id),
		(49, 'Japanteckning av annat slag', 'Även Japanteckning av okänt slag', id),
		(51, 'Rexpälsade att alla färger och teckningar', NULL, id),
		(52, 'Svart med brun buk på särskilt sätt', 'Black & tan, även otter', id),
		(53, 'Svart med vit buk på särskilt sätt', 'Black & White, även otter', id),
		(99, 'Allt annat', NULL, id);

	-- Dummy herd for individuals sold outside of the genebank
	INSERT INTO herd (genebank_id, herd, herd_name)
	SELECT	DISTINCT gb.genebank_id, 'GX1', 'Externa djur (Gotland)'
	FROM	genebank gb
	WHERE	gb.name = 'Gotlandskanin';

	-- Stub herd data
	INSERT INTO herd (genebank_id, herd)
	SELECT	DISTINCT gb.genebank_id, d."Genb"
	FROM	genebank gb
	JOIN	data d ON (TRUE)
	WHERE	gb.name = 'Gotlandskanin'
	ORDER BY d."Genb";

	-- Stub individual data
	INSERT INTO individual (origin_herd_id,
		name, certificate, number, sex, birth_date,
		colour_id, colour_note, death_note, litter, notes)
	SELECT	h.herd_id,
		d."Namn", d."Intyg", d."Nummer", d."Kön", d."Född",
		d."Färgnr", d."Färg", d."Död", d."Kull", d."Övrigt"
	FROM	genebank gb
	JOIN	herd h ON (h.genebank_id = gb.genebank_id)
	JOIN	data d ON (d."Genb" = h.herd)
	WHERE	gb.name = 'Gotlandskanin'
	ORDER BY d."Nummer";

	-- Set mothers
	-- Assumes that individual.number is unique
	UPDATE individual i
	SET	mother_id = parent.individual_id
	FROM	individual parent
	JOIN	data d ON (d."Mor nr" = parent.number)
	WHERE	d."Nummer" = i.number;

	-- Set fathers
	-- Assumes that individual.number is unique
	UPDATE individual i
	SET	father_id = parent.individual_id
	FROM	individual parent
	JOIN	data d ON (d."Far nr" = parent.number)
	WHERE	d."Nummer" = i.number;

	-- Initial herd tracking
	INSERT INTO herd_tracking (herd_id, individual_id, herd_tracking_date)
	SELECT	i.origin_herd_id, i.individual_id, i.birth_date
	FROM	genebank gb
	JOIN	herd h ON (h.genebank_id = gb.genebank_id)
	JOIN	individual i ON (i.origin_herd_id = h.herd_id)
	WHERE	gb.name = 'Gotlandskanin'
	ORDER BY i.individual_id;
END_SQL

# Load tracking data for years 2000 through to 2020
year=2000
while [ "$year" -le 2020 ]; do
	column=$year

	cat <<-END_SQL
		-- Fix column type etc.
		ALTER TABLE data ALTER "$column" TYPE VARCHAR(10);
		UPDATE data SET "$column" = CONCAT('G', "$column")
		WHERE "$column" IS NOT NULL AND "$column" NOT LIKE 'G%';

		-- Add missing herds
		INSERT INTO herd (genebank_id, herd)
		SELECT	DISTINCT gb.genebank_id, d."$column"
		FROM	genebank gb
		JOIN	data d ON (TRUE)
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
		JOIN	data d ON (d."$column" = h.herd)
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
	JOIN	data d ON (d."Nummer" = i.number)
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
		ALTER TABLE data ALTER "$column" TYPE REAL;

		-- Load $column data
		INSERT INTO weight (weight, individual_id, weight_date)
		SELECT	d."$column", i.individual_id, '$year-12-31'
		FROM	genebank gb
		JOIN	herd h ON (h.genebank_id = h.genebank_id)
		JOIN	individual i ON (i.origin_herd_id = h.herd_id)
		JOIN	data d ON (d."Nummer" = i.number)
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
		JOIN	data d ON (d."Nummer" = i.number)
		WHERE	gb.name = 'Gotlandskanin'
		AND	d."$column" IS NOT NULL
		ORDER BY i.individual_id;
	END_SQL

	year=$(( year + 1 ))
done | psql --quiet

# The Gotland data set has herd names etc. in a separate Excel file.
# Load that file separately.

csvsql	--db "$1" \
	--tables data2 \
	--overwrite \
	--insert \
	--skip-lines 5 "$3"

psql --quiet <<-'END_SQL'
	-- Fixup data somewhat
	ALTER TABLE data2 ALTER "Nr" TYPE VARCHAR(10);
	UPDATE data2 SET "Nr" = CONCAT('G', "Nr")
	WHERE "Nr" IS NOT NULL AND "Nr" NOT LIKE 'G%';

	-- Add herd names
	UPDATE herd h
	SET herd_name = (
		SELECT MAX("Gårdsnamn")
		FROM	data2
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
		FROM	data2
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
		FROM	data2
		WHERE	"Nr" = h.herd
		LIMIT	1
	)
	FROM	genebank gb
	WHERE	gb.genebank_id = h.genebank_id
	AND	gb.name = 'Gotlandskanin';
END_SQL
