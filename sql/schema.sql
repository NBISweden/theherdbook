--	Schema for "The Herd Book".
--	Written for PostgreSQL.

-- Note: Loading this file into a PostgreSQL database will replace any
-- existing tables with the same names.

DROP TYPE IF EXISTS sex_type CASCADE;
DROP TYPE IF EXISTS bodyfat_type CASCADE;
DROP TYPE IF EXISTS auth_type CASCADE;
DROP TYPE IF EXISTS privacy_type CASCADE;

CREATE TYPE sex_type AS ENUM ('male', 'female', 'eunuch');
CREATE TYPE bodyfat_type AS ENUM ('low', 'normal', 'high');
CREATE TYPE auth_type AS ENUM ('federated', 'password', 'totp');
CREATE TYPE privacy_type AS ENUM ('private', 'authenticated', 'public');

-- "Genbank".
-- The initial genebanks are "Gottlandskanin" and "Mellerudskanin".
DROP TABLE IF EXISTS genebank CASCADE;
CREATE TABLE genebank (
	genebank_id	SERIAL PRIMARY KEY,
	name		VARCHAR(100) NOT NULL,

	UNIQUE (name)
);

-- This is a static table of colour codes.
DROP TABLE IF EXISTS colour CASCADE;
CREATE TABLE colour (
	colour_id	INTEGER PRIMARY KEY,
	name		VARCHAR(50) NOT NULL,
	comment		VARCHAR(50) DEFAULT NULL,

	UNIQUE (name)
);

-- Data for a single individual.
DROP TABLE IF EXISTS individual CASCADE;
CREATE TABLE individual (
	individual_id	SERIAL PRIMARY KEY,
	genebank_id	INTEGER NOT NULL,
	-- "name"
	name		VARCHAR(50) DEFAULT NULL,
	-- "intyg"
	certificate	VARCHAR(20),
	-- "nummer"
	number		VARCHAR(20) NOT NULL,
	-- "kön"
	sex		sex_type DEFAULT NULL,
	-- "år" / "född"
	birth_date	DATE DEFAULT now(),
	-- "mor" ("mor nr" is not included explicitly)
	mother_id	INTEGER DEFAULT NULL,
	-- "far" ("far nr" is not included explicitly)
	father_id	INTEGER DEFAULT NULL,
	-- "färgnr" (reference to separate table)
	colour_id	INTEGER DEFAULT NULL,
	-- "färg"
	colour_note	VARCHAR(100) DEFAULT NULL,
	-- "död" (only the date/year from the field)
	death_date	DATE DEFAULT NULL,
	-- "död" (the rest of the field)
	death_note	VARCHAR(50) DEFAULT NULL,
	-- "vikt u"
	weight_young	REAL DEFAULT NULL,
	-- "kull"
	litter		INTEGER DEFAULT NULL,
	-- "övrigt" (general notes)
	notes		VARCHAR(100) DEFAULT NULL,

        -- FIXME: Can't be unique while there are duplicated
        --        certificates in the data set.  Related to
        --        Github issue #12.
	-- UNIQUE (certificate),

	UNIQUE (number),
	FOREIGN KEY (genebank_id)	REFERENCES genebank(genebank_id),
	FOREIGN KEY (colour_id)		REFERENCES colour(colour_id),
	FOREIGN KEY (mother_id)		REFERENCES individual(individual_id),
	FOREIGN KEY (father_id)		REFERENCES individual(individual_id)
);

DROP TABLE IF EXISTS weight;
CREATE TABLE weight (
	weight_id	SERIAL PRIMARY KEY,
	individual_id	INTEGER NOT NULL,
	weight		REAL NOT NULL,
	weight_date	DATE NOT NULL,

	FOREIGN KEY (individual_id)	REFERENCES individual(individual_id)
);

DROP TABLE IF EXISTS bodyfat;
CREATE TABLE bodyfat (
	bodyfat_id	SERIAL PRIMARY KEY,
	individual_id	INTEGER NOT NULL,
	bodyfat		bodyfat_type DEFAULT NULL,
	bodyfat_date	DATE NOT NULL,

	FOREIGN KEY (individual_id)	REFERENCES individual(individual_id)
);

-- "Besättning"
-- The herd table only holds herd information.
-- Tracking of individuals over time is done in
-- the herd_tracking table.
--
-- Latitude/longitude in WGS84.
-- Location should be a place name.

DROP TABLE IF EXISTS herd CASCADE;
CREATE TABLE herd (
	herd_id				SERIAL PRIMARY KEY,
	herd				INTEGER NOT NULL,
	name				TEXT,
	name_privacy			privacy_type,
	physical_address		TEXT,
	physical_address_privacy	privacy_type,
	location			TEXT,
	location_privacy		privacy_type,
	email				TEXT,
	email_privacy			privacy_type,
	www				TEXT,
	www_privacy			privacy_type,
	mobile_phone			TEXT,
	mobile_phone_privacy		privacy_type,
	wire_phone			TEXT,
	wire_phone_privacy		privacy_type,
	latitude			REAL,
	longitude			REAL,
	coordinates_privacy		privacy_type,

	UNIQUE (herd)
);

-- The herd_tracking table represents documented instances of an
-- individual belonging to a particular herd.  It connects the two
-- tables individual and herd in a N:M fashion.

DROP TABLE IF EXISTS herd_tracking;
CREATE TABLE herd_tracking (
	herd_tracking_id	SERIAL PRIMARY KEY,
	herd_id			INTEGER NOT NULL,
	individual_id		INTEGER NOT NULL,

	-- FIXME: When individuals "1185-1921" and "1185-1951" have
	-- birth dates, the following column may be set to "NOT NULL".
	-- Related to issue #9.
	herd_tracking_date	DATE,

	FOREIGN KEY (herd_id)		REFERENCES herd(herd_id),
	FOREIGN KEY (individual_id)	REFERENCES individual(individual_id)
);

-- Data for the colour table.
INSERT INTO colour (colour_id, name, comment) VALUES
	(11,'Svart','Kaninen ska vara helsvart'),
	(12,'Vit albino','Ska ha röda ögon'),
	(13,'Brun','Kan ha svarta inslag'),
	(14,'Blå','Även buken ska vara blå'),
	(15,'Gulbrun med blågrå mask (Isabella)','Även gul siames räknas hit'),
	(16,'Brun med mörk mask (Madagaskar)','Även Thyringer räknas hit'),
	(17,'Ljusbeige med mörk mask (Sallander)','Även siames räkans hit'),
	(18,'Vit med blå eller bruna ögon','Kan ha mörkare öron'),
	(19,'Svartbrun med vita stänk',NULL),
	(21,'Järngrå','Även järnblå och grafitgrå räknas hit'),
	(22,'Hargrå / viltfärgad','Varierar, kan vara ljus till mörk'),
	(23,'Snöhare','Vit med svart slöja'),
	(24,'Rödgul eller orange','Inte klart åtskild från 25'),
	(25,'Gul (äv. gul mage) och viltgul (ljus mage)','Inte klart åtskild från 24'),
	(26,'Viltblå (blå med ljus mage) och Pearl egern','Gråbrun med blått skimmer'),
	(27,'Gråmelerad (Chinchilla)','Även grå och blå chinchilla räknas hit'),
	(31,'Svartbrokig (vit med svarta tecken)','Även med järngrå tecken räknas hit'),
	(32,'Blåbrokig (vit med blå tecken)',NULL),
	(33,'Viltbrokig (vit med hargrå tecken)',NULL),
	(34,'Gulbrokig (vit med gula tecken)','Även orange eller röda tecken'),
	(35,'Madagaskarbrokig','Alltså madagaskartecknad bottenfärg'),
	(36,'Trefärgad (Tricolor)','Oftast vit med svarta och gula tecken'),
	(37,'Chinchillabrokig (vit med chinchillatecken)','Även blå chinchilla eller grå färg'),
	(38,'Brunbrokig (vit med (mörk)bruna tecken)',NULL),
	(39,'Färgad med enstaka vita tecken (Wiener)','Ofta vit bläs eller vit tass'),
	(41,'Gul-blå tigrerad (Japan)',NULL),
	(42,'Gul-svart tigrerad (Japan)',NULL),
	(43,'Vit-svart tigrerad (Japan)',NULL),
	(44,'Svart med vita stickelhår (Svensk päls)','Även med grå eller ljusbruna s-hår'),
	(45,'Blå med vi buk på särskilt sätt','Blue & White, även otter'),
	(46,'Vit-blå tigrerad (Japan)',NULL),
	(49,'Japanteckning av annat slag','Även Japanteckning av okänt slag'),
	(51,'Rexpälsade att alla färger och teckningar',NULL),
	(52,'Svart med brun buk på särskilt sätt','Black & tan, även otter'),
	(53,'Svart med vit buk på särskilt sätt','Black & White, även otter'),
	(99,'Allt annat',NULL);

--
--

DROP TABLE IF EXISTS hbuser CASCADE;
CREATE TABLE hbuser (
	user_id		SERIAL PRIMARY KEY,
	email		TEXT NOT NULL,
	privileges	TEXT
);

--
--

DROP TABLE IF EXISTS authenticators;
CREATE TABLE authenticators (
	auth_id		SERIAL PRIMARY KEY,
	user_id		INTEGER NOT NULL,
	auth		auth_type NOT NULL,
	auth_data	TEXT,

	FOREIGN KEY (user_id) references hbuser(user_id)
);
