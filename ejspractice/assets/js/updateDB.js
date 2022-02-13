// Include internal or external modules
const mongoose = require('mongoose');
const UpdateLog = require('../../models/updateLog');
const BathroomUsageLog = require('../../models/bathroomUsageLog');
const ShowerLog = require('../../models/showerLog');
const SleepLog = require('../../models/sleepLog');
const {InfluxDB} = require('@influxdata/influxdb-client');

// You can generate an API token from the "API Tokens Tab" in the UI
const token = 'Smrm037Xfq6s4RzcMRkik81q9S6zO8LY8u6mDxPUyOoFmvlrz9C12P63a2eF_xrrrPR8YoIbEBmavRM1yszdaw=='
const org = 'yuanjen.hung@student.supsi.ch'
const bucket = 'HAR_system'
const client = new InfluxDB({url: 'https://eu-central-1-1.aws.cloud2.influxdata.com', token: token})
const queryApi = client.getQueryApi(org)


// Variables
let lastestUpdatePoint = null;
let lastUpdateTime = null;
let startingPoint = null;
let lastValue = null;

// Create MongoDB connections
mongoose.connect('mongodb://localhost:27017/har_system')
    .then(()=>{
        console.log("connection to db is successful!");
    })
    .catch((error)=>{
        console.log("something went wrong with db connection");
        console.log(error);
    });

// Analysis Algorithm
const checkPeak = {
    isStart: checkIsAboveThreshold,
    isStop: checkIsBelowThreshold
};
const checkBasin = {
    isStart: checkIsBelowThreshold,
    isStop: checkIsAboveThreshold
};;

function checkIsAboveThreshold(value, lastValue, threshold){
    return value >= threshold && lastValue <= threshold;
}

function checkIsBelowThreshold(value, lastValue, threshold){
    return value <= threshold && lastValue >= threshold;
}

// Convert to Local Timezone
function convertTimezone(date, tzString) {
    return new Date((typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", {timeZone: tzString}));   
}

// Convert Dateformate to Timestamp
function convertDateToTimestamp(date) {
    return Math.floor(date.getTime()/1000);
}

function startQuery(query, threshold, checkAlgorithm, usage) {
    let arr = [];
    let myPromise = new Promise((resolve, reject) => {
        queryApi.queryRows(query, {
            next(row, tableMeta) {
                const o = tableMeta.toObject(row);
                const dateFormat = convertTimezone(o._time, "Europe/Zurich");
        
                if (lastValue !== null) {
                    if (checkAlgorithm.isStart(o._value, lastValue, threshold)) {
                        if (usage == "sleep" && dateFormat.getHours() < 20 && dateFormat.getHours() > 4) {}
                        else {
                            startingPoint = dateFormat;
                            // console.log("------------start-------------");
                        }
                    } else if (startingPoint !== null && checkAlgorithm.isStop(o._value, lastValue, threshold)) {
                        const duration = (dateFormat.getTime() - startingPoint.getTime())/1000/60;
                        if (usage == "sleep" && duration < 270) {}
                        else arr.push({
                            startTime: startingPoint,
                            stopTime: dateFormat
                        });
                        // console.log("------------stop-------------");
                        startingPoint = null;
                    }
                }

                // console.log(`${dateFormat} ${o._measurement}: ${o._field}=${o._value.toFixed(2)}`);   
                lastValue = o._value; 
                lastestUpdatePoint = dateFormat;
            },
            error(error) {
                console.error(error)
                console.log('Finished ERROR');
            },
            complete() {
                console.log('Finished SUCCESS');
                const u = new UpdateLog({
                    date: lastestUpdatePoint,
                    startedPoint: startingPoint,
                    lastValue: lastValue,
                    usage: usage
                });
                console.log(u);
                u.save();
                saveResultToDB(usage, arr);
                resolve("RESOLVED");
            },
        })    
    });

    return myPromise;    
}

async function saveResultToDB(usage, arr){
    switch (usage) {
        case "bathroom":
            for(let el of arr) {
                const r = new BathroomUsageLog({
                    startTime: el.startTime,
                    stopTime: el.stopTime
                })
                await r.save();
            }
            break;
        case "shower":
            for(let el of arr) {
                const r = new ShowerLog({
                    startTime: el.startTime,
                    stopTime: el.stopTime
                })
                await r.save();
            }
            break;
        case "sleep":
            for(let el of arr) {
                const r = new SleepLog({
                    startTime: el.startTime,
                    stopTime: el.stopTime
                })
                await r.save();
            }
            break;
    }   
}

async function checkUpdateAndQuery(usage, initRange, measurement, host, aggregateWindow){
    const lastUpdateInfo = await UpdateLog.find({usage: usage}).sort({"date": -1}).limit(1);
    if (lastUpdateInfo.length != 0) {
        lastUpdateTime = lastUpdateInfo[0].date;
        startingPoint = lastUpdateInfo[0].startedPoint;
        lastValue = lastUpdateInfo[0].lastValue;
    }
    const rangeString = (lastUpdateInfo.length != 0) ? `range(start: ${convertDateToTimestamp(lastUpdateTime)})` : `range(start: ${initRange})`;
    const query = `from(bucket: "HAR_system") |> ${rangeString} |> filter(fn: (r) => r["_measurement"] == "${measurement}") |> filter(fn: (r) => r["_field"] == "value") |> filter(fn: (r) => r["host"] == "${host}") |> aggregateWindow(every: ${aggregateWindow}, fn: mean, createEmpty: false)`;
    return query;
}

async function updateDB(){
    query = await checkUpdateAndQuery("bathroom", "-1d", "light", "arduino_bathroom", "4m");
    await startQuery(query, 30, checkPeak, "bathroom");

    query = await checkUpdateAndQuery("shower", "-1d", "humidity", "arduino_bathroom", "4m");
    await startQuery(query, 40, checkPeak, "shower");

    query = await checkUpdateAndQuery("sleep", "-7d", "light", "arduino_bedroom", "15m");
    await startQuery(query, 5, checkBasin, "sleep");

    return "ALL progress are FINISH!";
}

module.exports = {
    updateDB: updateDB
}