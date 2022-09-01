#!/bin/sh

# Needs to be called by load.sh
# ... or at least with the correct environment variables set for
# connecting to the database with psql.

# Load the soundex() function
psql --quiet <./soundex.sql

echo 'Inconsistent mothers (Gotland):'
psql --quiet <<-'END_SQL'
	-- Inconsistent mothers
	-- Assumes that the CSV is loaded into the "g_data" table
	SELECT	DISTINCT m."Nummer", m."Namn",
		d."Mor"
	FROM	g_data i
	JOIN	g_data m ON (m."Nummer" = i."Mor nr")
	JOIN	g_data d ON (d."Nummer" = i."Nummer" AND d."Mor nr" = m."Nummer")
	WHERE	soundex(LOWER(m."Namn")) <> soundex(LOWER(d."Mor"));
END_SQL

echo 'Inconsistent fathers (Gotland):'
psql --quiet <<-'END_SQL'
	SELECT	DISTINCT f."Nummer", f."Namn",
		d."Far"
	FROM	g_data i
	JOIN	g_data f ON (f."Nummer" = i."Far nr")
	JOIN	g_data d ON (d."Nummer" = i."Nummer" AND d."Far nr" = f."Nummer")
	WHERE	soundex(LOWER(f."Namn")) <> soundex(LOWER(d."Far"));
END_SQL

echo 'Missing mothers (Gotland):'
psql --quiet <<-'END_SQL'
	-- Missing mothers
	-- Assumes that the CSV is loaded into the "g_data" table
	SELECT	DISTINCT i."Nummer", i."Mor nr", i."Mor"
	FROM	g_data i
	LEFT JOIN	g_data p ON (p."Nummer" = i."Mor nr")
	WHERE	p."Nummer" IS NULL AND i."Mor nr" IS NOT NULL;
END_SQL

echo 'Missing fathers (Gotland):'
psql --quiet <<-'END_SQL'
	-- Missing fathers
	-- Assumes that the CSV is loaded into the "g_data" table
	SELECT	DISTINCT i."Nummer", i."Far nr", i."Far"
	FROM	g_data i
	LEFT JOIN	g_data p ON (p."Nummer" = i."Far nr")
	WHERE	p."Nummer" IS NULL AND i."Far nr" IS NOT NULL;
END_SQL

echo 'Duplicated certificates (Gotland):'
psql --quiet <<-'END_SQL'
	-- Duplicated certificates (Gotland)
	SELECT	COUNT(*), i.certificate
	FROM	genebank gb
	JOIN	herd h ON (h.genebank_id = gb.genebank_id)
	JOIN	individual i ON (i.origin_herd_id = h.herd_id)
	WHERE	gb.name = 'Gotlandskanin'
	AND	i.certificate IS NOT NULL
	GROUP BY	i.certificate
	HAVING	COUNT(*) > 1;
END_SQL

echo 'Tracking data innan kaninen är född '
psql -U herdbook --quiet <<-'END_SQL'
SELECT       i.number, b.birth_date, h.herd, herd_tracking_date
                FROM    herd_tracking ht_inner
                JOIN herd h ON (ht_inner.herd_id = h.herd_id)
                JOIN    individual i ON (ht_inner.individual_id = i.individual_id)
                JOIN    breeding b ON (i.breeding_id = b.breeding_id)
                JOIN    genebank gb ON (h.genebank_id = gb.genebank_id)
                WHERE   gb.name = 'Gotlandskanin'
                AND     ht_inner.herd_tracking_date = (
                        SELECT  MIN(herd_tracking_date)
                        FROM    herd_tracking
                        WHERE   individual_id = ht_inner.individual_id
                        )
                  AND
                  b.birth_date > herd_tracking_date;
END_SQL
