const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session')
const app = express();
const port = 8080;
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

app.use(express.static('src'));
