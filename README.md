# Guess it's Berlin

## Production

```bash 
docker-compose up -d
# serves at localhost:8080
```

To **update** app service run:

```bash
docker-compose build --no-cache app
```

## Development

```bash
# install dependencies
npm install
# start a mongodb instance
docker run --rm -p 27017:27017 -d mongo:4
# start the node application
npm start
# serves at localhost:8080
```

## Data

See `./data` on how to update/replace street data.
