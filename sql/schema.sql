--	Schema for "The Herd Book".
--	Written for PostgreSQL.

-- Note: Loading this file into a PostgreSQL database will replace any
-- existing tables with the same names.

DROP TABLE IF EXISTS herd;
CREATE TABLE herd (
	herd_id		SERIAL PRIMARY KEY,
	name		VARCHAR(100) NOT NULL
);

DROP TABLE IF EXISTS individual;
CREATE TABLE individual (
	individual_id	SERIAL PRIMARY KEY,
	herd_id		INTEGER NOT NULL,
	-- "name"
	name		VARCHAR(50) NOT NULL,
	-- "genb"
	genbank_nr	INTEGER NOT NULL,
	-- "intyg"
	certificate	INTEGER UNIQUE NOT NULL,
	-- "kön"
	sex		ENUM ('male', 'female', 'eunuch', 'unknown') DEFAULT 'unknown',
	-- "år" / "född"
	birth_date	DATE DEFAULT now(),
	-- "mor" ("mor nr" is not included explicitly)
	mother_id	INTEGER DEFAULT NULL,
	-- "far" ("far nr" is not included explicitly)
	father_id	INTEGER DEFAULT NULL,
	-- "färgnr" (reference to separate table)
	colour_id	INTEGER DEFAULT NULL,
	-- "färg"
	colour_note	VARCHAR(50) DEFAULT NULL,
	-- "ny G" (NULL = "none", 0 == unknown or N/A)
	new_genebank_nr	INTEGER DEFAULT NULL,
	-- "död" (only the date/year from the field)
	death_date	DATE DEFAULT NULL,
	-- "död" (the rest of the field)
	death_note	VARCHAR(50) DEFAULT NULL,

	UNIQUE (genbank_nr)
	FOREIGN KEY (mother_id) REFERENCES individual(individual_id),
	FOREIGN KEY (father_id) REFERENCES individual(individual_id)
);

DROP TABLE IF EXISTS weight;
CREATE TABLE weight (
	weight_id	SERIAL PRIMARY KEY,
	individual_id	INTEGER NOT NULL,
	weight		REAL NOT NULL,
	weight_date	DATE NOT NULL,

	FOREIGN KEY (individual_id) REFERENCES individual(individual_id)
);

DROP TABLE IF EXISTS bodyfat;
CREATE TABLE bodyfat (
	bodyfat_id	SERIAL PRIMARY KEY,
	individual_id	INTEGER NOT NULL,
	fat		ENUM ('low', 'normal', 'high'),

	FOREIGN KEY (individual_id) REFERENCES individual(individual_id)
);
