// Include internal or external modules
const mongoose = require('mongoose');
const Update = require('../../models/update');
const Activity = require('../../models/activity');
const {InfluxDB} = require('@influxdata/influxdb-client');

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
const detectThePeak = {
    isStart: surpassThresholdFirstTime,
    isStop: belowThresholdFirstTime
};
const detectTheBasin = {
    isStart: belowThresholdFirstTime,
    isStop: surpassThresholdFirstTime
};

function surpassThresholdFirstTime(value, lastValue, threshold){
    return value >= threshold && lastValue <= threshold;
}

function belowThresholdFirstTime(value, lastValue, threshold){
    return value <= threshold && lastValue >= threshold;
}

// Convert to Local Timezone
function convertTimezone(date, tzString) {
    return new Date((typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", {timeZone: tzString}));   
}

// Convert Dataformat to Timestamp
function convertDateToTimestamp(date) {
    return Math.floor(date.getTime()/1000);
}

function startQuery(query, threshold, checkAlgorithm, usage) {
    let myPromise = new Promise((resolve, reject) => {
        queryApi.queryRows(query, {
            next(row, tableMeta) {
                const o = tableMeta.toObject(row);
                const now = convertTimezone(o._time, "Europe/Zurich");
        
                if (lastValue !== null) {
                    if (checkAlgorithm.isStart(o._value, lastValue, threshold)) {
                        if (usage == "sleep" && now.getHours() < 20 && now.getHours() > 4) {}
                        else {
                            startingPoint = now;
                        }
                    } else if (startingPoint !== null && checkAlgorithm.isStop(o._value, lastValue, threshold)) {
                        const duration = (now.getTime() - startingPoint.getTime())/1000/60;
                        if (usage == "sleep" && (duration < 270 || duration > 900)) {}
                        else {
                            const r = new Activity({
                                startTime: startingPoint,
                                stopTime: now,
                                type: usage
                            })
                            r.save();
                        }
                        startingPoint = null;
                    }
                }

                // console.log(`${now} ${o._measurement}: ${o._field}=${o._value.toFixed(2)}`);   
                lastValue = o._value; 
                lastestUpdatePoint = now;
            },
            error(error) {
                console.error(error)
                console.log('Finished ERROR');
            },
            complete() {
                console.log('Finished SUCCESS');
                if (lastestUpdatePoint != null) {
                    const u = new Update({
                        date: lastestUpdatePoint,
                        startedPoint: startingPoint,
                        lastValue: lastValue,
                        usage: usage
                    });
                    u.save();
                }   
                resolve("RESOLVED");
            },
        })    
    });

    return myPromise;    
}

async function checkUpdateAndGetQuery(usage, initRange, measurement, host, aggregateWindow){
    const lastUpdateInfo = await Update.find({usage: usage}).sort({"date": -1}).limit(1);
    if (lastUpdateInfo.length != 0) {
        lastUpdateTime = lastUpdateInfo[0].date;
        startingPoint = lastUpdateInfo[0].startedPoint;
        lastValue = lastUpdateInfo[0].lastValue;
    }
    const rangeString = (lastUpdateInfo.length != 0) ? `range(start: ${convertDateToTimestamp(lastUpdateTime)})` : `range(start: ${initRange})`;
    const query = `from(bucket: "HAR_system") |> ${rangeString} |> filter(fn: (r) => r["_measurement"] == "${measurement}") |> filter(fn: (r) => r["_field"] == "value") |> filter(fn: (r) => r["host"] == "${host}") |> aggregateWindow(every: ${aggregateWindow}, fn: mean, createEmpty: false)`;
    return query;
}

async function analysisAndUpdateDB(){
    query = await checkUpdateAndGetQuery("bathroom", "-1d", "light", "arduino_bathroom", "4m");
    await startQuery(query, 30, detectThePeak, "bathroom");

    query = await checkUpdateAndGetQuery("shower", "-1d", "humidity", "arduino_bathroom", "4m");
    await startQuery(query, 40, detectThePeak, "shower");

    query = await checkUpdateAndGetQuery("sleep", "-7d", "light", "arduino_bedroom", "15m");
    await startQuery(query, 5, detectTheBasin, "sleep");

    return "ALL progress are FINISH!";
}

module.exports = {
    analysisAndUpdateDB: analysisAndUpdateDB
}