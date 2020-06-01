FROM node:14.3
WORKDIR /frontend
COPY package.json yarn.lock ./
RUN yarn install
RUN yarn run parcel --version
CMD yarn start
