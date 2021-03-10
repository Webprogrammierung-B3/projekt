# Guess it's Berlin

## Production

```bash 
docker-compose up -d
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
```

## Data

See `./data` on how to update/replace street data.
