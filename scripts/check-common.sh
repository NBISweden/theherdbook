#!/bin/sh

# Needs to be called by load.sh
# ... or at least with the correct environment variables set for
# connecting to the database with psql.

echo 'Bad herd numbers (all genebanks):'
psql --quiet <<-'END_SQL'
	SELECT	herd
	FROM	herd
	WHERE	herd NOT SIMILAR TO '[GM]X?[0-9]+';
END_SQL


echo 'Bad individual numbers (all genebanks):'
echo '(numbers not corresponding to year of birth)'
# Numbers need to be on the form "XXXX-YYZZ" where "YY"
# corresponds to the first two digits of the year of birth.
# Or, "XXXX-YZZZ" where "Y" corresponds to the first digit
# of the year of birth.
psql --quiet <<-'END_SQL'
	SELECT	i.number, b.birth_date
	FROM	individual i
	JOIN	breeding b ON (i.breeding_id = b.breeding_id)
	WHERE	i.number NOT LIKE
		concat('%-',
			substring(
				cast(date_part('year', b.birth_date) as text),
				3, 2),
		'%')
	AND	i.number NOT LIKE
		concat('%-',
			substring(
				cast(date_part('year', b.birth_date) as text),
				4, 1),
		'%');
END_SQL
