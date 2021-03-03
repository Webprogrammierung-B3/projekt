const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const hbs = require('hbs');
const streets = require('./data/dist/result.min.json');
const turf = require('@turf/turf');
const { uuid } = require('uuidv4');
const { uniqueNamesGenerator, adjectives, animals } = require('unique-names-generator');
const streetNames = Object.keys(streets);
const len = streetNames.length;
const app = express();
const port = 8080;
app.set('view engine', 'hbs');
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}))
app.use(bodyParser.json());

const blocks = {};
const MAX_ROUNDS = 5;
const GAMES = {};

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
        req.session.username = getRandomName();
        next();
    }
});

app.get('/', function(req, res) {
    res.redirect('/index.html');
})

app.get('/index.html', function(req, res) {
    res.render('index', { username: req.session.username, layout: 'layout.hbs', games: Object.values(GAMES)})
});

app.get('/highscore.html', function(req, res) {
    res.render('highscore', { username: req.session.username, layout: 'layout.hbs' })
});

app.get('/howto.html', function(req, res) {
    res.render('howto', { username: req.session.username, layout: 'layout.hbs' })
});

app.get('/register.html', function(req, res) {
    res.render('register', { username: req.session.username, layout: 'layout.hbs' })
});

app.get('/game.html', function(req, res) {
    res.render('game', { username: req.session.username, layout: 'layout.hbs' })
});

app.get('/api/game', function(req, res) {
    let streetName;
    if (req.session.currentGame === undefined) {
        req.session.currentGame = {
            rounds: [],
        }
    }
    let currentPoints = 0;
    for (const round of req.session.currentGame.rounds) {
        if (round.points !== undefined) {
            currentPoints += round.points;
        }
    }
    const currentRoundIndex = req.session.currentGame.rounds.length - 1;
    if (currentRoundIndex >= 0 && req.session.currentGame.rounds[currentRoundIndex].guess === undefined) {
        streetName = req.session.currentGame.rounds[currentRoundIndex].streetName;
    } else {
        streetName = getRandomStreet();
        req.session.currentGame.rounds.push({streetName});
    }
    const responseJson = {
        streetName,
        currentPoints,
        round: req.session.currentGame.rounds.length,
        totalRounds: MAX_ROUNDS
    };
    res.send(responseJson);
});

app.post('/api/game', function(req, res) {
    const currentGame = req.session.currentGame;
    const currentGuess = req.body;
    const currentRoundIndex = currentGame.rounds.length - 1;
    currentGame.rounds[currentRoundIndex].guess = currentGuess;
    const streetPolygons = streets[currentGame.rounds[currentRoundIndex].streetName];
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
    currentGame.rounds[currentRoundIndex].distance = shortestDistance;
    let newPoints = 0;
    if (shortestDistance < 10025) {
        if (shortestDistance < 25) {
            newPoints = 200;
        } else {
            const temp = shortestDistance - 25;
            const percentage = 1 - temp / 20000;
            newPoints = Math.round(percentage * 200);
        }
    }
    currentGame.rounds[currentRoundIndex].points = newPoints;
    let currentPoints = 0;
    for (const round of currentGame.rounds) {
        currentPoints += round.points;
    }
    const responseJson = {
        streetName: currentGame.rounds[currentRoundIndex].streetName,
        streetPolygons,
        closestCoordinate,
        distance: shortestDistance,
        newPoints,
        currentPoints,
        round: currentRoundIndex + 1,
        totalRounds: MAX_ROUNDS
    };

    if (currentRoundIndex + 1 === MAX_ROUNDS) {
        const id = uuid();
        currentGame.id = id;
        GAMES[id] = currentGame;
        req.session.currentGame = undefined;
        responseJson.newGame = true;
    }

    res.send(responseJson)
});

function getRandomName() {
    return uniqueNamesGenerator({ dictionaries: [adjectives, animals] });
}

app.use('/icons', express.static('node_modules/feather-icons/dist'));
app.use('/map', express.static('node_modules/leaflet/dist'));

app.use(express.static('public'));
