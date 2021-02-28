const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const hbs = require('hbs');
const streets = require('./data/dist/result.min.json')
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
app.use(bodyParser.urlencoded({ extended: true }));

const blocks = {};

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
    const responseJson = {
        streetName: getRandomStreet(),
        currentPoints: 0,
        round: 1,
        totalRounds: 5
    };
    req.session.currentGame = {
        rounds: []
    }
    res.send(responseJson)
});

app.use(express.static('public'));
