const fs = require('fs');
const osmium = require('osmium');

const fileName = 'city.osm.pbf'

const pbf = new osmium.File(fileName);
const reader = new osmium.Reader(pbf);
const locationHandler = new osmium.LocationHandler();

const streets = {};
const acceptedStreetTypes = ['residential', 'primary', 'secondary', 'tertiary', 'unclassified'];

const wayHandler = new osmium.Handler();
wayHandler.on('way', (way) => {
  const name = way.tags('name');
  const streetType = way.tags('highway');
  if (name !== undefined && streetType !== undefined && acceptedStreetTypes.includes(streetType)) {
    const geoJSON = way.geojson();
    if (streets[name]) {
      streets[name].push(geoJSON);
    } else {
      streets[name] = [geoJSON];
    }
  }
});

wayHandler.on('after_ways', () => {
  console.log(`saving ${Object.keys(streets).length} streets...`)
  fs.writeFile('dist/result.json', JSON.stringify(streets, null, 2), 'utf8', (error) => {
    if (error) {
      throw error;
    }
    console.log(`results saved!`)
  });
  fs.writeFile('dist/result.min.json', JSON.stringify(streets), 'utf8', (error) => {
    if (error) {
      throw error;
    }
    console.log(`minified results saved!`)
  });
});

osmium.apply(reader, locationHandler, wayHandler);
