#!/bin/sh

# Needs to be called by load.sh

csvsql  --db "postgresql://$PGUSER:dummy@/$PGDATABASE" \
	--tables data \
	--overwrite \
	--insert "$1"

psql <<-'END_SQL'
	------------------------------------------------------------
	-- Fixup data
	------------------------------------------------------------

	UPDATE data SET "Namn" = TRIM("Namn");
	UPDATE data SET "Mor" = TRIM("Mor");
	UPDATE data SET "Far" = TRIM("Far");

	ALTER TABLE data ALTER "Genb" TYPE VARCHAR(10);
	UPDATE data SET "Genb" = CONCAT('M', "Genb")
	WHERE "Genb" IS NOT NULL AND "Genb" NOT LIKE 'M%';

	ALTER TABLE data ALTER "Nummer" TYPE VARCHAR(20);
	UPDATE data SET "Nummer" = CONCAT('M', "Nummer")
	WHERE "Nummer" IS NOT NULL AND "Nummer" NOT LIKE 'M%';

	ALTER TABLE data ALTER "Mor nr" TYPE VARCHAR(20);
	UPDATE data SET "Mor nr" = CONCAT('M', "Mor nr")
	WHERE "Mor nr" IS NOT NULL AND "Mor nr" NOT LIKE 'M%';

	ALTER TABLE data ALTER "Far nr" TYPE VARCHAR(20);
	UPDATE data SET "Far nr" = CONCAT('M', "Far nr")
	WHERE "Far nr" IS NOT NULL AND "Far nr" NOT LIKE 'M%';

	UPDATE data SET "Kön" = 'male' WHERE "Kön" = 'Hane';
	UPDATE data SET "Kön" = 'female' WHERE "Kön" = 'Hona';

	ALTER TABLE data ADD "Färgnr" INTEGER;
	UPDATE data SET "Färgnr" = 101 WHERE "Färg" LIKE '%lbino%';
	UPDATE data SET "Färgnr" = 100 WHERE "Färgnr" IS NULL AND "Färg" LIKE '%v%';
	UPDATE data SET "Färg" = NULL WHERE "Färgnr" IS NULL;

	------------------------------------------------------------
	-- Insert
	------------------------------------------------------------

	-- TRUNCATE herd_tracking RESTART IDENTITY CASCADE;
	-- TRUNCATE individual RESTART IDENTITY CASCADE;
	-- TRUNCATE herd RESTART IDENTITY CASCADE;
	-- TRUNCATE genebank RESTART IDENTITY CASCADE;

	-- Genebank
	INSERT INTO genebank (name) VALUES ('Mellerudskanin');

	-- Stub herd data
	INSERT INTO herd (genebank_id, herd)
	SELECT	DISTINCT gb.genebank_id, d."Genb"
	FROM	genebank gb
	JOIN	data d ON (TRUE)
	WHERE	gb.name = 'Mellerudskanin'
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
	WHERE	gb.name = 'Mellerudskanin'
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
	WHERE	gb.name = 'Mellerudskanin'
	ORDER BY i.individual_id;
END_SQL

# Load tracking data for years 2000 trough to 2020
year=2000
while [ "$year" -le 2020 ]; do
	cat <<-END_SQL
		-- Fix column type etc.
		ALTER TABLE data ALTER "$year" TYPE VARCHAR(10);
		UPDATE data SET "$year" = NULL
		WHERE "$year" LIKE 's%';
		UPDATE data SET "$year" = CONCAT('M', "$year")
		WHERE "$year" IS NOT NULL AND "$year" NOT LIKE 'M%';

		-- Add missing herds
		INSERT INTO herd (genebank_id, herd)
		SELECT	DISTINCT gb.genebank_id, d."$year"
		FROM	genebank gb
		JOIN	data d ON (TRUE)
		WHERE	gb.name = 'Mellerudskanin'
		AND	d."$year" NOT IN (
			SELECT herd
			FROM	herd
		)
		ORDER BY d."$year";

		-- Load $year data
		INSERT INTO herd_tracking (herd_id, individual_id, herd_tracking_date)
		SELECT	h.herd_id, i.individual_id, '$year-12-31'
		FROM	genebank gb
		JOIN	herd h ON (h.genebank_id = gb.genebank_id)
		JOIN	data d ON (d."$year" = h.herd)
		JOIN	individual i ON (i.number = d."Nummer")
		WHERE	gb.name = 'Mellerudskanin'
		ORDER BY i.individual_id;
	END_SQL

	year=$(( year + 1 ))
done | psql
