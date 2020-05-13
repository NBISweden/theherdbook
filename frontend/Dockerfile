FROM node:11
WORKDIR /frontend
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
VOLUME /frontend/node_modules
VOLUME /frontend/.cache
VOLUME /frontend/.parcel-cache
RUN yarn run parcel --version
CMD yarn start
