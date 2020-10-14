#!/bin/sh

# Needs to be called by load.sh
# ... or at least with the correct environment variables set for
# connecting to the database with psql.

# Load the soundex() function
psql --quiet <./soundex.sql

echo 'Inconsistent mothers (Mellerud):'
psql --quiet <<-'END_SQL'
	-- Inconsistent mothers
	-- Assumes that the CSV is loaded into the "data" table
	SELECT	DISTINCT m."Nummer", m."Namn",
		d."Mor"
	FROM	data i
	JOIN	data m ON (m."Nummer" = i."Mor nr")
	JOIN	data d ON (d."Nummer" = i."Nummer" AND d."Mor nr" = m."Nummer")
	WHERE	soundex(LOWER(m."Namn")) <> soundex(LOWER(d."Mor"));
END_SQL

echo 'Inconsistent fathers (Mellerud):'
psql --quiet <<-'END_SQL'
	SELECT	DISTINCT f."Nummer", f."Namn",
		d."Far"
	FROM	data i
	JOIN	data f ON (f."Nummer" = i."Far nr")
	JOIN	data d ON (d."Nummer" = i."Nummer" AND d."Far nr" = f."Nummer")
	WHERE	soundex(LOWER(f."Namn")) <> soundex(LOWER(d."Far"));
END_SQL

echo 'Missing mothers (Mellerud):'
psql --quiet <<-'END_SQL'
	-- Missing mothers
	-- Assumes that the CSV is loaded into the "data" table
	SELECT	DISTINCT i."Nummer", i."Mor nr", i."Mor"
	FROM	data i
	LEFT JOIN	data p ON (p."Nummer" = i."Mor nr")
	WHERE	p."Nummer" IS NULL AND i."Mor nr" IS NOT NULL;
END_SQL

echo 'Missing fathers (Mellerud):'
psql --quiet <<-'END_SQL'
	-- Missing fathers
	-- Assumes that the CSV is loaded into the "data" table
	SELECT	DISTINCT i."Nummer", i."Far nr", i."Far"
	FROM	data i
	LEFT JOIN	data p ON (p."Nummer" = i."Far nr")
	WHERE	p."Nummer" IS NULL AND i."Far nr" IS NOT NULL;
END_SQL

echo 'Duplicated certificates (Mellerud):'
psql --quiet <<-'END_SQL'
	-- Duplicated certificates (Gotland)
	SELECT	COUNT(*), i.certificate
	FROM	genebank gb
	JOIN	herd h ON (h.genebank_id = gb.genebank_id)
	JOIN	individual i ON (i.origin_herd_id = h.herd_id)
	WHERE	gb.name = 'Mellerudskanin'
	AND	i.certificate IS NOT NULL
	GROUP BY	i.certificate
	HAVING	COUNT(*) > 1;
END_SQL
