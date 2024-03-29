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

You can also use the script `run-with-prebuilt-images.sh`, that uses the precompiled images generated
in the production server. This option is much faster and therefore more recommended.

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
./register_user.sh 'username' 'userpassword' 'user@example.com'
```

All branches that are pushed to github has prebuilt images. To use the prebuilt images instead of building locally, use:

```console
./run-with-prebuilt-images.sh
```

### R-api services

You also need to configure a user for the R server. This is done by providing an `Authorized` header to use as `API_AUTH`
in `.docker/r-api-variables.env`. This header must provide credentials to see all individuals for which the R service
will be used.

You typically create a specific user for this:

```console
./register_user.sh 'rapiuser' 'rapipassword' 'r-api@example.com'
```

You can then create the corresponding header as `Authorization: Basic $(echo -n rapiuser:rapipassword |base64)`
so the line in `.docker/r-api-variables.env` might look something like:

```console
API_AUTH=Authorization: Basic dGVzdDp0ZXN0
```

The default file contains the credentials for the user `test`, password `test`.

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
If you want to support automatic account creation, you also need to select ".../auth/userinfo.email"

Once done, select save and continue to finish configuration of the consent screen.

As you now have the consent screen, you can again select Credentials and use Create new credential -> OAuth client ID.

When asked for the application type, select "Web application".

You will be asked for URLs. Under "Authorized redirect URI" you should provide

[https://YOURSITE/api/login/google/back/google/authorized](https://YOURSITE/api/login/google/back/google/authorized)

where YOURSITE is any address your service can be accessed at.

Once you've added all such URIs, you can select "Create".

You will be presented with a box with "Your client ID" and "Your client secret", copy these.

Create/edit `config/auth.ini` and add a `[google]` section where you provide your client ID as `key` and your secret as `secret`, e.g.

```lang-ini
[google]
key=YourIDHereLikelyEndsWith.apps.googleusercontent.com
secret=YourClientSecretGoesHere
```

and restart the server, once this is done - you should see the option to login with Google.

If you want to support automatic creation of accounts from Google, also include

```lang-ini
autocreate = yes
```

in the `[google]` section.

In short, you need to set up OAuth 2.0 with the `openid` scope (and optionally the `.../userinfo.email` scope to allow automatic creation). Once you've done that, provide the `Client secret` as `secret` and `Client ID` as `key` in the `[google]` section in `auth.ini`.

#### Automatic herd ownerships

The google authenticator driver also supports automatically creating herd
ownership links at the time of account creation. This requires using a custom
domain / Google workspace.

To use that, you need to enable the `Admin SDK API` in the google developer
console. Next, create a service account under "Credentials" in your project and
create and download keys for the service account in JSON format.

Note the `Unique ID` for the service account. Head over to the
[workspace console](https://admin.google.com/) and add a domain wide delegation
(under Security -> API controls).

Create a domain wide delegation for the unique id from the service account with
the scope `https://www.googleapis.com/auth/admin.directory.user.readonly`.

Once this is done, you can add the key JSON file to the `config` directory.
Also modify the `auth.ini` in the `[google]` section, adding `herdattribute`
describing what attribute to be used for tying the user to herd(s). Other keys
needed are `credentialsfile` which should be the name of the key file for the
servicea count as well as `lookupuser` which should be set to the e-mail of an
administrative user for the domain.
