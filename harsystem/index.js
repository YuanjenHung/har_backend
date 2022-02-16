const {analysisAndUpdateDB} = require("./assets/js/analysisAndUpdateDB")
const {generateSleepInfo} = require("./assets/js/generateSleepInfo")
const express = require("express");
const app = express();
const mongoose = require('mongoose');
const Activity = require('./models/activity');

app.set('view engine', 'ejs');
app.use(express.static('assets'));

mongoose.connect('mongodb://localhost:27017/har_system')
    .then(()=>{
        console.log("connection to db is successful!");
    })
    .catch((error)=>{
        console.log("something went wrong with db connection");
        console.log(error);
    });

app.get('/', (req, res) => {
    res.render('dashboard');
})

app.get('/data', (req, res) => {
    res.render('data');
})

app.get('/report', async(req, res) => {
    await analysisAndUpdateDB();
    const bathroom = await Activity.find({
        startTime: {
            $gte: new Date(new Date() - 1 * 60 * 60 * 24 * 1000)
        },
        type: 'bathroom'
    });
    const shower = await Activity.find({
        startTime: {
            $gte: new Date(new Date() - 1 * 60 * 60 * 24 * 1000)
        },
        type: 'shower'
    });
    const sleep = await Activity.find({
        startTime: {
            $gte: new Date(new Date() - 7 * 60 * 60 * 24 * 1000)
        },
        type: 'sleep'
    });
    const sleepInfo = await generateSleepInfo();
    res.render('report', {
        bathroom: bathroom,
        shower: shower,
        sleep: sleep,
        sleepInfo: sleepInfo
    });
})

app.listen('3000', () => {
    console.log("Local server is listening on port 3000!");
})