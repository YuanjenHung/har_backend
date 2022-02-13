// Include internal or external modules
const mongoose = require('mongoose');
const UpdateLog = require('../../models/updateLog');
const BathroomUsageLog = require('../../models/bathroomUsageLog');
const {InfluxDB} = require('@influxdata/influxdb-client')

// You can generate an API token from the "API Tokens Tab" in the UI
const token = 'Smrm037Xfq6s4RzcMRkik81q9S6zO8LY8u6mDxPUyOoFmvlrz9C12P63a2eF_xrrrPR8YoIbEBmavRM1yszdaw=='
const org = 'yuanjen.hung@student.supsi.ch'
const bucket = 'HAR_system'
const client = new InfluxDB({url: 'https://eu-central-1-1.aws.cloud2.influxdata.com', token: token})
const queryApi = client.getQueryApi(org)


// Variables
let lastestUpdatePoint = null;
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
    return value > threshold && lastValue < threshold;
}

function checkIsBelowThreshold(value, lastValue, threshold){
    return value < threshold && lastValue > threshold;
}

// Generate Query String for InfluxDB 
function queryString(range, measurement, host, aggregateWindow){
    const rangeString = (typeof range == "Number") ? `range(start: ${range})` : `range(start: ${range})`;
    const query = `from(bucket: "HAR_system") |> ${rangeString} |> filter(fn: (r) => r["_measurement"] == "${measurement}") |> filter(fn: (r) => r["_field"] == "value") |> filter(fn: (r) => r["host"] == "${host}") |> aggregateWindow(every: ${aggregateWindow}, fn: mean, createEmpty: false)`;
    return query;
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
                // const year = dateFormat.getFullYear();
                // const month = ("0"+(dateFormat.getMonth()+1)).slice(-2);
                // const day = ("0"+dateFormat.getDate()).slice(-2);
                // const hour = ("0"+dateFormat.getHours()).slice(-2);
                // const minute = ("0"+dateFormat.getMinutes()).slice(-2);
                // const second = ("0"+dateFormat.getSeconds()).slice(-2);
                // const date = `${year}-${month}-${day}`;
                // const data = new BedroomLight({
                //     date: o._time,
                //     value: o._value.toFixed(2)
                // });
                // data.save();
                if (lastValue !== null) {
                    if (checkAlgorithm.isStart(o._value, lastValue, threshold)) {
                        if (usage == "sleep" && dateFormat.getHours() < 22 && dateFormat.getHours() > 16) {}
                        else {
                            startingPoint = dateFormat;
                            console.log("------------start-------------");
                        }
                    } else if (startingPoint !== null && checkAlgorithm.isStop(o._value, lastValue, threshold)) {
                        const duration = (dateFormat.getTime() - startingPoint.getTime())/1000/60;
                        if (usage == "sleep" && duration < 270) {}
                        else arr.push({
                            startTime: startingPoint,
                            stopTime: dateFormat
                        });
                        console.log("------------stop-------------");
                        startingPoint = null;
                    }
                }
                console.log(`${dateFormat} ${o._measurement}: ${o._field}=${o._value.toFixed(2)}`);   
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
                    lastValue: lastValue
                });
                u.save();
                displayResult(usage, arr);
                resolve("RESOLVED");
            },
        })    
    });

    return myPromise;    
}

function displayResult(usage, arr){
    console.log("----------Analysis Result---------->");
    switch (usage) {
        case "bathroom":
            for(let el of arr) {
                const r = new BathroomUsageLog({
                    startTime: el.startTime,
                    stopTime: el.stopTime
                })
                r.save();
                console.log("Start Time: \t" + r.startTime);
                console.log("Duration: \t" + r.duration + " min");
            }
            console.log("----> Last Update: " + lastestUpdatePoint);
            break;
        // case "shower":
        //     if (arr !== null) {
        //         for(let record of arr) {
        //             document.getElementById("times_using_shower").innerHTML = arr.length;
        //             document.getElementById("usingShowerTimeList").innerHTML += `<li class="list-group-item"><span style="display: inline-block; width: 100px;">${record.startDate}</span> ${record.startTime.hour}:${record.startTime.minute}</li>`
        //         }
        //     } else {
        //         document.getElementById("times_using_shower").innerHTML = 0;
        //         document.getElementById("usingShowerTimeList").innerHTML = `<li class="list-group-item">No shower time detected!</li>`
        //     }
        //     break;
        // case "sleep":
        //     const avgTime = getAverageTime(arr);
        //     document.getElementById("time_bed").innerHTML = `${avgTime.avgStartTime}`;
        //     document.getElementById("time_wakeup").innerHTML = `${avgTime.avgStopTime}`;
        //     document.getElementById("duration_sleep").innerHTML = `${avgTime.avgDuration} Hours`;
        //     for(let record of arr) {
        //         document.getElementById("bedTimeList").innerHTML += `<li class="list-group-item"><span style="display: inline-block; width: 100px;">${record.startDate}</span> ${record.startTime.hour}:${record.startTime.minute}</li>`
        //         document.getElementById("wakeupTimeList").innerHTML += `<li class="list-group-item"><span style="display: inline-block; width: 100px;">${record.stopDate}</span> ${record.stopTime.hour}:${record.stopTime.minute}</li>`
        //         document.getElementById("durationSleepList").innerHTML += `<li class="list-group-item"><span style="display: inline-block; width: 100px;">${record.startDate}</span> <span style="display: inline-block; width: 50px;">${record.startTime.hour}:${record.startTime.minute}</span> <span style="display: inline-block; width: 75px;">(${(record.duration / 60).toFixed(2)} h)</span></li>`
        //     }
        //     break;
    }   
}

async function updateDB(){
    const lastUpdateInfo = await UpdateLog.find().sort({"date": -1}).limit(1);
    if (lastUpdateInfo.length != 0) {
        const lastUpdateTime = lastUpdateInfo[0].date;
        startingPoint = lastUpdateInfo[0].startedPoint;
        lastValue = lastUpdateInfo[0].lastValue;
        console.log("Latest update -> " + lastUpdateTime);
        query = queryString(convertDateToTimestamp(lastUpdateTime), "light", "arduino_bathroom", "1m");
    } else {
        query = queryString("-1h", "light", "arduino_bathroom", "4m");
    }
    await startQuery(query, 30, checkPeak, "bathroom");

    return "ALL progress are FINISH!";
}

updateDB();