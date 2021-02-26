const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const app = express();
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
const port = 8080;

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});

app.get('/index.html', function(req, res){
    console.log(req.cookies['APP'], req.cookies)
    if (req.cookies['APP'] === undefined) {
        res.redirect('/register.html');
    }
});

app.post('/api/login', function(req, res){
    console.log(req.body)
    res.cookie('session', req.body.password, { maxAge: 5 * 60 * 1000 });
    res.send('logged in.');
});

app.use(express.static('src'));
