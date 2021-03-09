FROM node:10-buster

WORKDIR /app

RUN echo deb http://deb.debian.org/debian buster-backports main | tee /etc/apt/sources.list.d/backport.list \
  && apt update \
  && apt install -y \
       libosmium2-dev/buster-backports \
       libprotozero-dev \
       libutfcpp-dev \
       libboost-dev \
       zlib1g-dev \
       libexpat1-dev \
       libsparsehash-dev \
  && rm -rf /var/lib/apt/lists/*

COPY package.json .

RUN npm install

COPY main.js .

RUN curl https://download.geofabrik.de/europe/germany/berlin-latest.osm.pbf > city.osm.pbf

ENTRYPOINT ["node", "main.js"]
