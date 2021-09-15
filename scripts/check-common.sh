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
# corresponds to the last two digits of the year of birth.
# Or, "XXXX-YZZZ" where "Y" corresponds to the last digit
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

echo 'Impossible births (all genebanks):'
echo '(females giving birth to children from more than a single male on the same date)'
psql --quiet <<-'END_SQL'
	WITH    b_tmp AS (
		SELECT  mother_id, birth_date
		FROM    breeding
		WHERE   mother_id IS NOT NULL
		GROUP BY        mother_id, birth_date
		HAVING  count(*) > 1
		)
	SELECT  b.birth_date, mother.number, father.number
	FROM    breeding b
	JOIN    b_tmp ON (
			b.mother_id = b_tmp.mother_id
		AND     b.birth_date = b_tmp.birth_date
		)
	JOIN    individual mother ON (b.mother_id = mother.individual_id)
	JOIN    individual father ON (b.father_id = father.individual_id)
	ORDER BY        b.birth_date, mother.number;
END_SQL
