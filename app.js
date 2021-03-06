const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const hbs = require('hbs');
const streets = require('./data/dist/result.min.json');
const turf = require('@turf/turf');
const { uuid } = require('uuidv4');
const MongoStore = require('connect-mongo').default;
const MongoClient = require('mongodb').MongoClient;
const { uniqueNamesGenerator, adjectives, animals } = require('unique-names-generator');
const TimeAgo = require('javascript-time-ago');
const deLocaleTimeAgo = require('javascript-time-ago/locale/de');
TimeAgo.addLocale(deLocaleTimeAgo);
TimeAgo.setDefaultLocale('de');
const timeAgo = new TimeAgo('de-DE');
const streetNames = Object.keys(streets);
const len = streetNames.length;
const app = express();
const port = 8080;
const insideDocker = Boolean(process.env.INSIDE_DOCKER);
const secureCookie = Boolean(process.env.SECURE_COOKIE);
const appSecret = process.env.APP_SECRET;
const url = insideDocker ? 'mongodb://db:27017/' : 'mongodb://localhost:27017/';
const dbName = 'guess-its';
let db;
let gameCollection;
let userCollection;

if (secureCookie && insideDocker) {
    app.set('trust proxy', 1) // trust first proxy
}

MongoClient.connect(url, { useUnifiedTopology: true }, function(err, client) {
    if (err) {
        throw err
    }
    console.log("Connected successfully to server");

    db = client.db(dbName);
    gameCollection = db.collection('games');
    userCollection = db.collection('users');
});

app.set('view engine', 'hbs');
app.use(session({
    secret: appSecret || 'top secret string which wont be used in production, right?',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: secureCookie,
        maxAge: 1000 * 60 * 60 * 24 * 365, // one year in ms
        sameSite: true,
        httpOnly: true
    },
    store: MongoStore.create({
        mongoUrl: url + dbName
    })
}))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const blocks = {};
const MAX_ROUNDS = 5;

function getRandomStreet() {
    return streetNames[Math.floor(Math.random() * len)];
}

hbs.registerHelper('extend', function(name, context) {
    let block = blocks[name];
    if (!block) {
        block = blocks[name] = [];
    }
    block.push(context.fn(this));
});

hbs.registerHelper('block', function(name) {
    const val = (blocks[name] || []).join('\n');
    blocks[name] = [];
    return val;
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});

app.get('*.html', function(req, res, next) {
    if (req.session.username) {
        next();
    } else {
        const username = getRandomName();
        req.session.username = username;
        userCollection.insertOne({
            username,
            views: {},
            favorites: []
        }, {}, (err, result) => {
            next();
        });
    }
});

app.get('/', function(req, res) {
    res.redirect('/index.html');
})

app.get('/index.html', function(req, res) {
    gameCollection.find({}).sort({ points: -1 }).limit(10).toArray((err, docs) => {
        userCollection.findOne({ username: req.session.username }, (err, userDoc) => {
            const username = req.session.username;
            for (const doc of docs) {
                if (doc.username === username) {
                    doc.me = true;
                }
                doc.relativeDate = timeAgo.format(doc.date);
            }
            for (const game of userDoc.favorites) {
                if (game.username === username) {
                    game.me = true
                }
                game.relativeDate = timeAgo.format(game.date);
            }
            const views = Object.values(userDoc.views).sort((a, b) => b.count - a.count).slice(0, 5);
            for (const game of views) {
                if (game.username === username) {
                    game.me = true
                }
                game.relativeDate = timeAgo.format(game.date);
            }
            const empty = {
                highscores: docs.length < 1,
                favorites: userDoc.favorites.length < 1,
                views: views.length < 1
            }
            res.render('index', { username: req.session.username, back: false, layout: 'layout.hbs', games: docs, favorites: userDoc.favorites, views, empty })
        })
    })
});

app.get('/highscore.html', function(req, res) {
    res.render('highscore', { username: req.session.username, back: true, layout: 'layout.hbs' })
});

app.get('/howto.html', function(req, res) {
    res.render('howto', { username: req.session.username, back: true, layout: 'layout.hbs' })
});

app.get('/register.html', function(req, res) {
    res.render('register', { username: req.session.username, back: true, layout: 'layout.hbs' })
});

app.get('/game.html', function(req, res) {
    const id = req.query.id;
    if (id === undefined) {
        res.redirect('/index.html');
        return;
    }
    gameCollection.find({ id }).toArray((err, docs) => {
        if (err || docs.length !== 1) {
            res.redirect('/index.html');
            return;
        }
        const username = req.session.username;
        userCollection.find({ username }).toArray((err, userDocs) => {
            if (err) throw err;
            const key = `views.${id}`;
            if (userDocs[0].views[id] === undefined) {
               userCollection.updateOne({ username }, {
                   $set: {
                       [key]: {
                           id,
                           count: 1,
                           username: docs[0].username,
                           points: docs[0].points,
                           date: docs[0].date
                       }
                   }
               })
            } else {
               const key = `views.${id}.count`;
               userCollection.updateOne({ username }, {
                   $inc: {
                       [key]: 1
                   }
               })
            }
            const game = docs[0];
            for (const round of game.rounds) {
                round.polygons = streets[round.streetName];
            }
            game.relativeDate = timeAgo.format(game.date);
            for (const comment of game.comments) {
                comment.relativeDate = timeAgo.format(comment.date);
                if (comment.username === username) {
                    comment.me = true;
                }
            }
            if (game.username === username) {
                game.me = true;
            }
            game.comments = game.comments.reverse();
            res.render('gameDetail', {
                game,
                username,
                isFavorite: userDocs[0].favorites.filter(e => e.id === game.id).length > 0,
                roundsJSON: JSON.stringify(game.rounds),
                back: true,
                layout: 'layout.hbs'
            });
        });
    })
});

app.get('/play.html', function(req, res) {
    res.render('game', { username: req.session.username, back: true, layout: 'layout.hbs' })
});

app.get('/api/game', function(req, res) {
    let streetName;
    if (req.session.currentGame === undefined) {
        req.session.currentGame = {
            rounds: [],
        }
    }
    const currentGame = req.session.currentGame;
    const currentPoints = currentGame.rounds.reduce((total, round) => round.points !== undefined ? total + round.points : total, 0);
    const currentRoundIndex = currentGame.rounds.length - 1;
    if (currentRoundIndex >= 0 && currentGame.rounds[currentRoundIndex].guess === undefined) {
        streetName = currentGame.rounds[currentRoundIndex].streetName;
    } else {
        streetName = getRandomStreet();
        currentGame.rounds.push({streetName});
    }
    const responseJson = {
        streetName,
        currentPoints,
        round: currentGame.rounds.length,
        totalRounds: MAX_ROUNDS
    };
    res.send(responseJson);
});

app.post('/api/game', function(req, res) {
    const body = req.body;
    if (Object.keys(body).length !== 2 || typeof body.lat !== 'number' || typeof body.lat !== 'number') {
        res.sendStatus(400);
        return;
    }
    const currentGame = req.session.currentGame;
    const currentRoundIndex = currentGame.rounds.length - 1;
    const currentRound = currentGame.rounds[currentRoundIndex];
    const currentGuess = body;
    currentRound.guess = currentGuess;
    const streetPolygons = streets[currentRound.streetName];
    const closestCoordinate = getShortestCoordinateDistance(currentGuess, streetPolygons);
    currentRound.distance = closestCoordinate.distance;
    currentRound.closestCoordinate = closestCoordinate.lnglat;
    const bounds = calcBounds(currentGuess, streetPolygons);
    currentRound.bounds = bounds;
    const newPoints = calcScore(closestCoordinate.distance);
    currentRound.points = newPoints;
    const currentPoints = currentGame.rounds.reduce((total, round) => total + round.points, 0);
    const line = [[currentGuess.lat, currentGuess.lng], [closestCoordinate.lnglat.lat, closestCoordinate.lnglat.lng]]
    currentRound.guessLine = line;
    const responseJson = {
        streetName: currentRound.streetName,
        streetPolygons,
        closestCoordinate: closestCoordinate.lnglat,
        distance: closestCoordinate.distance,
        newPoints,
        currentPoints,
        round: currentRoundIndex + 1,
        totalRounds: MAX_ROUNDS,
        bounds,
        line
    };

    if (currentRoundIndex + 1 === MAX_ROUNDS) {
        const id = uuid();
        currentGame.id = id;
        currentGame.points = currentPoints;
        currentGame.username = req.session.username;
        currentGame.date = new Date();

        currentGame.comments = [];
        gameCollection.insertOne(currentGame);

        req.session.currentGame = undefined;
        responseJson.newGame = true;
    }

    res.send(responseJson)
});

app.post('/api/fav', (req, res) => {
    const gameId = req.body.id;
    const username = req.session.username;
    userCollection.find({ username }).toArray((err, docs) => {
        if (err) throw err;
        const userElement = docs[0];
        let newArray;
        if (userElement.favorites.find(e => e.id === gameId)) {
            newArray = userElement.favorites.filter(e => e.id !== gameId);
            userCollection.updateOne({ username }, {
                $set: { favorites: newArray }
            })
            res.send({ value: false })
        } else {
            newArray = userElement.favorites;
            gameCollection.findOne({ id: gameId }, (err, doc) => {
                newArray.push({
                    id: gameId,
                    username: doc.username,
                    points: doc.points,
                    date: doc.date
                });
                userCollection.updateOne({ username }, {
                    $set: { favorites: newArray }
                })
                res.send({ value: true })
            })
        }
    });
});

app.post('/game.html', (req, res) => {
    const gameId = req.body.id;
    const content = req.body.content;
    const username = req.session.username;
    const date = new Date();
    gameCollection.updateOne({ id: gameId }, { $push: { comments: { content, username, date } } });
    res.redirect(`/game.html?id=${gameId}`);
});

function getRandomName() {
    return uniqueNamesGenerator({ dictionaries: [adjectives, animals] });
}

function getShortestCoordinateDistance(currentGuess, streetPolygons) {
    const point = turf.point([currentGuess.lng, currentGuess.lat]);
    let shortestDistance;
    let closestCoordinate;
    for (const polygon of streetPolygons) {
        const line = turf.lineString(polygon.coordinates);
        const distance = Math.round(turf.pointToLineDistance(point, line) * 1000);
        const turfCoordinate = turf.nearestPointOnLine(line, point);
        const coordinate = { lng: turfCoordinate.geometry.coordinates[0], lat: turfCoordinate.geometry.coordinates[1] };
        if (shortestDistance !== undefined) {
            if (distance < shortestDistance) {
                shortestDistance = distance;
                closestCoordinate = coordinate;
            }
        } else {
            shortestDistance = distance;
            closestCoordinate = coordinate;
        }
    }
    return {
        distance: shortestDistance,
        lnglat: closestCoordinate
    }
}

function calcScore(distance) {
    let newPoints = 0;
    if (distance < 10025) {
        //newPoints = Math.round(5 * Math.pow(10, -7) * Math.pow(distance, 2) - 0.02 * distance + 200);
        newPoints = Math.round(2 * Math.pow(10, -6) * Math.pow(distance, 2) - 0.04 * distance + 200);
    }
    return newPoints;
}

function calcBounds(currentGuess, streetPolygons) {
    const latValues = []
    for (const element of streetPolygons) {
        latValues.push(...element.coordinates.map(e => e[1]))
    }
    const left = Math.min(...latValues, currentGuess.lat);
    const right = Math.max(...latValues, currentGuess.lat);
    const lngValues = []
    for (const element of streetPolygons) {
        lngValues.push(...element.coordinates.map(e => e[0]))
    }
    const bottom = Math.min(...lngValues, currentGuess.lng);
    const top = Math.max(...lngValues, currentGuess.lng);
    return [[right + 0.001, top + 0.001], [left - 0.001, bottom - 0.001]];
}

app.use('/icons', express.static('node_modules/feather-icons/dist'));
app.use('/map', express.static('node_modules/leaflet/dist'));

app.use(express.static('public'));
