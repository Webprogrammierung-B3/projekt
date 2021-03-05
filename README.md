# Guess it's Berlin

## Production Setup

```bash 
# build image
docker build -t webprogrammierung/guess-its-berlin .

# run container
docker run -p 8080:8080 -d webprogrammierung/guess-its-berlin 

# development
docker run --rm -p 27017:27017 -d mongo:4
```
