#!/bin/sh

# Needs to be called by load.sh
# ... or at least with the correct environment variables set for
# connecting to the database with psql.

echo 'Bad herd numbers (all genebanks):'
psql --quiet <<-'END_SQL'
	SELECT  herd
	FROM    herd
	WHERE   herd NOT SIMILAR TO '[GM][0-9]+';
END_SQL
