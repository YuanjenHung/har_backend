// Include internal or external modules
const mongoose = require('mongoose');
const Activity = require('../../models/activity');
const {InfluxDB} = require('@influxdata/influxdb-client');

// You can generate an API token from the "API Tokens Tab" in the UI
const token = 'Smrm037Xfq6s4RzcMRkik81q9S6zO8LY8u6mDxPUyOoFmvlrz9C12P63a2eF_xrrrPR8YoIbEBmavRM1yszdaw=='
const org = 'yuanjen.hung@student.supsi.ch'
const bucket = 'HAR_system'
const client = new InfluxDB({url: 'https://eu-central-1-1.aws.cloud2.influxdata.com', token: token})
const queryApi = client.getQueryApi(org)

// Create MongoDB connections
mongoose.connect('mongodb://localhost:27017/har_system')
    .then(()=>{
        console.log("connection to db is successful!");
    })
    .catch((error)=>{
        console.log("something went wrong with db connection");
        console.log(error);
    });

// Convert Dateformate to Timestamp
function convertDateToTimestamp(date) {
    return Math.floor(date.getTime()/1000);
}    

function generateQuery(start, stop, measurement){
    const query = `from(bucket: "HAR_system")|> range(start: ${convertDateToTimestamp(start)}, stop: ${convertDateToTimestamp(stop)})|> filter(fn: (r) => r["_measurement"] == "${measurement}")|> filter(fn: (r) => r["_field"] == "value")|> filter(fn: (r) => r["host"] == "arduino_bedroom")|> aggregateWindow(every: 1h, fn: mean, createEmpty: false)`;
    return query;
}

function startQuery(query) {
    let total = 0;
    let length = 0;
    let myPromise = new Promise((resolve, reject) => {
        queryApi.queryRows(query, {
            next(row, tableMeta) {
                const o = tableMeta.toObject(row);
                total += o._value;
                length++;
            },
            error(error) {
                console.error(error)
                console.log('Finished ERROR');
            },
            complete() {
                console.log('Finished SUCCESS');
                resolve(total/length);
            },
        })    
    });

    return myPromise;    
}

async function generateSleepInfo(){
    let totalDuration = 0;
    let totalStartTime = 0;
    let totalStopTime = 0;
    let allAvgHumidity = 0;
    let allAvgTemperature = 0;

    const sleep = await Activity.find({
        startTime: {
            $gte: new Date(new Date() - 7 * 60 * 60 * 24 * 1000)
        },
        type: 'sleep'
    });

    for (let r of sleep) {
        allAvgHumidity += await startQuery(generateQuery(r.startTime, r.stopTime, "humidity"));
        allAvgTemperature += await startQuery(generateQuery(r.startTime, r.stopTime, "temperature"));
        totalDuration += r.duration;
        totalStartTime += r.startTime.getTime();
        totalStopTime += r.stopTime.getTime();
    }

    return {
        startTime: new Date(Math.round(totalStartTime/sleep.length)),
        stopTime: new Date(Math.round(totalStopTime/sleep.length)),
        duration: (totalDuration/sleep.length/60).toFixed(2),
        temperature: (allAvgTemperature/sleep.length).toFixed(1),
        humidity: (allAvgHumidity/sleep.length).toFixed(1)
    }
}

module.exports = {
    generateSleepInfo: generateSleepInfo
}
