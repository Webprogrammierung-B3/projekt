const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const hbs = require('hbs');
const streets = require('./data/dist/result.min.json');
const haversine = require('haversine-distance');
const {uuid} = require('uuidv4');
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

    block.push(context.fn(this)); // for older versions of handlebars, use block.push(context(this));
});

hbs.registerHelper('block', function(name) {
    const val = (blocks[name] || []).join('\n');

    // clear the block
    blocks[name] = [];
    return val;
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});

app.get('*.html', function(req, res, next) {
    console.log(req.session.username)
    if (req.session.username) {
        next();
    } else {
        req.session.username = Math.random();
        next();
    }
});

app.get('/index.html', function(req, res, next) {
    res.render('index', { username: req.session.username, layout: 'layout.hbs' })
});

app.get('/highscore.html', function(req, res, next) {
    res.render('highscore', { username: req.session.username, layout: 'layout.hbs' })
});

app.get('/howto.html', function(req, res, next) {
    res.render('howto', { username: req.session.username, layout: 'layout.hbs' })
});

app.get('/register.html', function(req, res, next) {
    res.render('register', { username: req.session.username, layout: 'layout.hbs' })
});

app.get('/game.html', function(req, res, next) {
    res.render('game', { username: req.session.username, layout: 'layout.hbs' })
});

app.get('/api/game', function(req, res, next) {
    const streetName = getRandomStreet();
    if (req.session.currentGame === undefined) {
        req.session.currentGame = {
            rounds: [],
        }
    }
    let currentPoints = 0;
    for (const round of req.session.currentGame.rounds) {
        currentPoints += round.points;
    }
    req.session.currentGame.rounds.push({streetName});
    const responseJson = {
        streetName,
        currentPoints,
        round: req.session.currentGame.rounds.length,
        totalRounds: MAX_ROUNDS
    };
    res.send(responseJson)
});

app.post('/api/game', function(req, res, next) {
    console.log(req.body, 1);
    const currentGame = req.session.currentGame;
    const currentGuess = req.body;
    const currentRoundIndex = currentGame.rounds.length - 1;
    currentGame.rounds[currentRoundIndex].guess = currentGuess;
    const streetPolygons = streets[currentGame.rounds[currentRoundIndex].streetName];

    let shortestDistance;
    let closestCoordinate;
    for (const polygon of streetPolygons) {
        for (const coordinate of polygon.coordinates) {
            const distance = haversine(currentGuess, coordinate);
            console.log(distance);
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
    }
    console.log("shortest Distance: ",shortestDistance);
    currentGame.rounds[currentRoundIndex].distance = shortestDistance;
    currentGame.rounds[currentRoundIndex].points = shortestDistance;
    let currentPoints = 0;
    for (const round of currentGame.rounds) {
        currentPoints += round.points;
    }
    const responseJson = {
        streetName: currentGame.rounds[currentRoundIndex].streetName,
        streetPolygons,
        closestCoordinate,
        newPoints: currentGame.rounds[currentRoundIndex].points,
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
    console.log(req.body);
});

app.use(express.static('public'));
