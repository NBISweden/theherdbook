# The Herdbook
The Herd Book Is a NBIS project Supporting the Swedish Board of Agriculture (Jordbruksverket) Action Plan for the Long-term
Sustainable Management of Swedish Animal Genetic Resources 2010–2020.

Mainly measure 5 “Keeping herd books and planning genetic conservation breeding”. Found in https://www2.jordbruksverket.se/webdav/files/SJV/trycksaker/Pdf_rapporter/ra09_15kort.pdf

The aim here is to set up a online web-service for keeping a herd
book and spreading admin task to all local genebank holders.

## Termology

### Genebank

A site participating in the preservation program. These will typically
have signed an agreement and have efforts in place to make sure there
is no accidental breeding with other races.

### Genebank owner

A user tied to one or more genebanks.

### Herd book owner

A user tasked with overall maintenance of the herd book and managing the
breeding/preservation effort for a race.

# Development setup

To set up the developer environment, you should be able to run

```console

docker-compose build
docker-compose up
```

After a few minutes  you should have your services up and running. If you run `docker ps` you will see  an output similiar to this one:

```
CONTAINER ID        IMAGE                      COMMAND                  CREATED             STATUS              PORTS                                                                    NAMES
f62cebbc2e43        herdbook_main              "/bin/sh -c /entrypo…"   3 hours ago         Up 3 hours          0.0.0.0:2345->2345/tcp, 0.0.0.0:4200->8080/tcp, 0.0.0.0:4443->8443/tcp   herdbook-main
7385113e91c0        postgres:12                "docker-entrypoint.s…"   3 hours ago         Up 3 hours          0.0.0.0:5432->5432/tcp                                                   herdbook-db
5c9193fc774c        herdbook_frontend:latest   "docker-entrypoint.s…"   20 hours ago        Up 3 hours                                                                                   theherdbook_herdbook-frontend-devel_1

```

To access the local server deployed open this url https://localhost:8443 in your browser. You will need to 
configure the browser to allow self-signed localhost certificates. In Chrome, this can be done by accessing 
this property from the browser: `chrome://flags/#allow-insecure-localhost` and setting its vale to Enabled. 
In Firefox, when loading the url you can click on Advanced and  add the exception suggested from the browser. 
You can also use http://localhost:8080 to access the frontend. 

To be able to login in the website and play with it you will need to create an user with admin privileges. This can be done by executing register_user.sh, providing your email and password:

```
./register_user.sh 'user@domain.com', 'userpassword'
```

