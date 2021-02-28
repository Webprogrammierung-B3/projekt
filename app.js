const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session')
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

app.use(express.static('public'));
