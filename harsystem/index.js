const {updateDB} = require("./assets/js/updateDB")
const {calcAvgSleepInfo} = require("./assets/js/calcAvgSleepInfo")
const express = require("express");
const app = express();
const mongoose = require('mongoose');
const BathroomUsageLog = require('./models/bathroomUsageLog');
const ShowerLog = require('./models/showerLog');
const SleepLog = require('./models/sleepLog');

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
    await updateDB();
    const bathroomUsage = await BathroomUsageLog.find({
        startTime: {
            $gte: new Date(new Date() - 1 * 60 * 60 * 24 * 1000)
        }
    });
    const shower = await ShowerLog.find({
        startTime: {
            $gte: new Date(new Date() - 1 * 60 * 60 * 24 * 1000)
        }
    });
    const sleep = await SleepLog.find({
        startTime: {
            $gte: new Date(new Date() - 7 * 60 * 60 * 24 * 1000)
        }
    });
    const avgSleepInfo = await calcAvgSleepInfo();
    res.render('report', {
        bathroomUsage: bathroomUsage,
        shower: shower,
        sleep: sleep,
        avgSleepInfo: avgSleepInfo
    });
})

app.listen('3000', () => {
    console.log("Local server is listening on port 3000!");
})