FROM node:11
WORKDIR /frontend
COPY package.json yarn.lock ./
RUN yarn install
RUN mkdir -p /frontend/.cache /frontend/.parcel-cache
VOLUME /frontend/node_modules
VOLUME /frontend/.cache
VOLUME /frontend/.parcel-cache
RUN yarn run parcel --version
CMD sh -c 'if [ -z "$(ls -A /frontend/.parcel-cache)" ]; then yarn start; else echo "parcel cache not empty, run docker-compose up with -V (--renew-anon-volumes)"; fi'
