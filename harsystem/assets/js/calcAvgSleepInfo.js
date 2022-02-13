// Include internal or external modules
const mongoose = require('mongoose');
const SleepLog = require('../../models/sleepLog');
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

function referencePointCalc(arr, isMidnight){
    var totalDiff = 0;
    var referencePoint = null;

    for (let el of arr) {
        const hour = el.getHours();
        const minute = el.getMinutes();
        const midnight = ((24 - hour) <= 12) ? 24 : 0;
        const noon = 12;
        const diff = (hour - (isMidnight?midnight:noon))*60 + minute;
        totalDiff += diff;
    }
    const avgDiff = totalDiff/arr.length;

    if (isMidnight) referencePoint = avgDiff < 0 ? 24: 0;
    else referencePoint = 12;

    const avgHour = ("0" + Math.floor((referencePoint*60+avgDiff)/60).toString()).slice(-2);
    const avgMinute = ("0" + Math.floor((referencePoint*60+avgDiff)%60).toString()).slice(-2);
    const avgTime = `${avgHour}:${avgMinute}`

    return avgTime;
}

async function calcAvgSleepInfo(){
    let startTimeArr = [];
    let stopTimeArr = [];
    let totalDuration = 0;
    let avgHumidity = 0;
    let avgTemperature = 0;

    const sleep = await SleepLog.find({
        startTime: {
            $gte: new Date(new Date() - 7 * 60 * 60 * 24 * 1000)
        }
    });

    for (let r of sleep) {
        avgHumidity += await startQuery(generateQuery(r.startTime, r.stopTime, "humidity"));
        avgTemperature += await startQuery(generateQuery(r.startTime, r.stopTime, "temperature"));
        startTimeArr.push(r.startTime);
        stopTimeArr.push(r.stopTime);
        totalDuration += r.duration;
    }

    return {
        startTime: referencePointCalc(startTimeArr, true),
        stopTime: referencePointCalc(stopTimeArr, false),
        duration: (totalDuration/sleep.length/60).toFixed(2),
        temperature: (avgTemperature/sleep.length).toFixed(1),
        humidity: (avgHumidity/sleep.length).toFixed(1)
    }
}

module.exports = {
    calcAvgSleepInfo: calcAvgSleepInfo
}
