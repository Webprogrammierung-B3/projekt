# Data

> Street names with coordinates as GeoJSONs

## Setup

```bash
curl https://download.geofabrik.de/europe/germany/berlin-latest.osm.pbf > berlin-latest.osm.pbf
docker build -t osmium/berlin .
```

## Usage

```bash
docker run --rm -v ${PWD}/berlin-latest.osm.pbf:/app/berlin-latest.osm.pbf -v ${PWD}/dist:/app/dist osmium/berlin berlin-latest.osm.pbf
```

## Update dataset

```bash
curl https://download.geofabrik.de/europe/germany/berlin-latest.osm.pbf > berlin-latest.osm.pbf
docker run --rm -v ${PWD}/berlin-latest.osm.pbf:/app/berlin-latest.osm.pbf -v ${PWD}/dist:/app/dist osmium/berlin berlin-latest.osm.pbf
```
