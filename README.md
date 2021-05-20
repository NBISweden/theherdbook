# The Herdbook

The Herd Book Is a NBIS project Supporting the Swedish Board of Agriculture (Jordbruksverket) Action Plan for the Long-term
Sustainable Management of Swedish Animal Genetic Resources 2010–2020.

Mainly measure 5 “Keeping herd books and planning genetic conservation breeding”. Found in [this report](https://www2.jordbruksverket.se/webdav/files/SJV/trycksaker/Pdf_rapporter/ra09_15kort.pdf)

The aim here is to set up a online web-service for keeping a herd
book and spreading admin task to all local genebank holders.

## Terminology

### Herd = Besättning/Genbanksbesättning

A site participating in the preservation program. These will typically
have signed an agreement and have efforts in place to make sure there
is no accidental breeding with other races. Have a local pool of animals that is the actual
_in situ_ genebank.

### Genebank = Genbank (Herdbook)

Several different Herds of the same race will form a Genebank

### Herd owner = Besättningägare /Genbanksbesättningägare

A user tied to one or more herds. The owner or owners of a herd of animals

### Genebank Manager = Genbanksansvarig

A user tasked with overall maintenance of the herd book and managing the
breeding/preservation effort for a genebank. Usually responsible for a specific animal breed.

## Development setup

First set up your secure environment variables by
copy or rename the default `.env` files found in the `.docker` folder so there are files without the
`.default` suffix.

Remember to update your secrets before going into production.

The following files should exist:

```console
.docker/database-variables.env
.docker/r-api-variables.env
```

It is also recommended to speed up startup by generating persistent forward-secrecy
parameters:

```console

openssl dhparam -out config/dhparam.pem 2048

```

To set up the developer environment, you should be able to run

```console

docker-compose build
docker-compose up
```

After a few minutes you should have your services up and running. If you run `docker ps` you will see an output similiar to this one:

```console
CONTAINER ID        IMAGE                      COMMAND                  CREATED             STATUS              PORTS                                                                    NAMES
f62cebbc2e43        herdbook_main              "/bin/sh -c /entrypo…"   3 hours ago         Up 3 hours          0.0.0.0:2345->2345/tcp, 0.0.0.0:4200->8080/tcp, 0.0.0.0:4443->8443/tcp   herdbook-main
7385113e91c0        postgres:12                "docker-entrypoint.s…"   3 hours ago         Up 3 hours          0.0.0.0:5432->5432/tcp                                                   herdbook-db
5c9193fc774c        herdbook_frontend:latest   "docker-entrypoint.s…"   20 hours ago        Up 3 hours                                                                                   theherdbook_herdbook-frontend-devel_1

```

To access the local server deployed open the [encryption-enabled interface](https://localhost:8443) in your browser. You will need to
configure the browser to allow self-signed localhost certificates. In Chrome, this can be done by accessing
this property from the browser: `chrome://flags/#allow-insecure-localhost` and setting its vale to Enabled.
In Firefox, when loading the url you can click on Advanced and add the exception suggested from the browser.
You can also use [the interface without encryption](http://localhost:8080) to access the frontend.

To be able to login in the website and play with it you will need to create an user with admin privileges. This can be done by executing register_user.sh, providing your email and password:

```console
./register_user.sh 'user@domain.com', 'userpassword'
```

All branches that are pushed to github has prebuilt images. To use the prebuilt images instead of building locally, use:

```console
./run-with-prebuilt-images.sh
```

## Loading data

Data files are delivered out of band. Instructions for inital importing of data are available in `scripts/README.docker`.

## Testing

There are a number of tests written, which can be run using `./run_tests.sh`.
Currently the test coverage is lacking, and frontend testing is missing. Given
time, this will be resolved before version 1.0 is finished.

The tests will also run through `pytest` using github actions when pushing new
code to github.

## External authenticators

### Google

To set up Google authentication, visit the [developer console](https://console.cloud.google.com/) and select/create a project (dropdown next to the Google cloud platform in the upper left corner).

When you have a project, you can select "Credentials" and use the "Create credentials" to create an OAuth client ID.

Once selected, you will be told you need to configure the consent screen. You can choose "Internal" to only provide login for users within your organization or external, potentially allowing for access from any google account (but which may require verification).

Once selected, you'll need to supply an application name (e.g. Herdbook) and a support contact. You also need to supply a developer contact (for Google) at the bottom.

Once filled in, you can save and continue.

Next, you'll need to select the scopes provided. Select "Add and remove scopes" and pick `openid`.

Once done, select save and continue to finish configuration of the consent screen.

As you now have the consent screen, you can again select Credentials and use Create new credential -> OAuth client ID.

When asked for the application type, select "Web application".

You will be asked for URLs. Under "Authorized redirect URI" you should provide

https://YOURSITE/api/login/google/back/google/authorized

where YOURSITE is any address your service can be accessed at.

Once you've added all such URIs, you can select "Create".

You will be presented with a box with "Your client ID" and "Your client secret", copy these.

Create/edit `config/auth.ini` and add a `[google]` section where you provide your client ID as `key` and your secret as `secret`, e.g.

```
[google]
key=YourIDHereLikelyEndsWith.apps.googleusercontent.com
secret=YourClientSecretGoesHere
```

and restart the server, once this is done - you should see the option to login with Google.
