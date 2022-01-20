// const analyResult = require("./assets/js/analyData")
const express = require("express");
const app = express();

app.set('view engine', 'ejs');
app.use(express.static('assets'));

app.get('/', (req, res) => {
    res.render('dashboard');
})

app.get('/data', (req, res) => {
    res.render('data');
})

app.get('/report', (req, res) => {
    res.render('report');
})

app.get('/random', (req, res) => {
    const random = Math.floor(Math.random()*10)+1;
    res.render('random', {rand: random});
})

app.get('/cats', (req, res) => {
    const cats = ['Molly', 'Rocket', 'Bubble'];
    res.render('cats', {cats});
})

app.get('/r/:subreddits', (req, res) => {
    res.render('subreddits', {name: req.params.subreddits});
})

app.listen('3000', () => {
    console.log("Local server is listening on port 3000!");
})