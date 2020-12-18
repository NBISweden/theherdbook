## npm v7
The project uses npm v7 as package manager since this has useful 
features  such as automatically installing peer dependencies. 

Consider [changing default directory](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally#manually-change-npms-default-directory) before installing npm v7 (and 
when using npm in general) to avoid EACCES permissions errors. To 
get npm v7 run: 
```
npm install -g npm@7
```

You might need to restart your terminal afterwards

## Installing locally

Install the dependencies by running:

```
npm install
```

## Building

There is as script to build and bundle to the dist/ directory:
```
npm run build
```

## Running locally

```
npm run start
```

Note that it is recommended to do frontend development by running 
the Docker containers instead since backend functionality is 
required for a lot of the frontend functionality