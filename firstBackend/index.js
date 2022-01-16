const express = require("express");
const app = express();

// app.use((req, res) => {
//     res.send("Hello, we got your request!");
// })

app.get('/', (req, res) => {
    res.send("This is the home page!");
})

app.get('/r/:subreddits', (req, res) => {
    res.send("This is a subreddits: " + req.params.subreddits);
})

app.get('/search', (req, res) => {
    const {color} = req.query;
    res.send("This is the searching page for: " + color);
})

app.get('/cats', (req, res) => {
    res.send("Meow!!");
})

app.get('/dogs', (req, res) => {
    res.send("Bark!!");
})

app.get('*', (req, res) => {
    res.send("OOPS, I don't know what it is!!");
})

app.listen(3000, () => {
    console.log("local server is listening on 3000 port!");
})

