FROM node:11
WORKDIR /frontend
COPY package.json yarn.lock ./
RUN yarn install
VOLUME /frontend/node_modules
VOLUME /frontend/.cache
VOLUME /frontend/.parcel-cache

# make sure that stale caches aren't used
RUN rm -rf /frontend/node_modules/*
RUN rm -rf /frontend/.cache/*
RUN rm -rf /frontend/.parcel-cache/*

RUN yarn run parcel --version
CMD yarn start
