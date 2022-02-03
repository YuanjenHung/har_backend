// import latest release from npm repository 
import {InfluxDB, Point} from 'https://unpkg.com/@influxdata/influxdb-client/dist/index.browser.mjs';
      
const url = 'https://eu-central-1-1.aws.cloud2.influxdata.com/'
const token = 'Smrm037Xfq6s4RzcMRkik81q9S6zO8LY8u6mDxPUyOoFmvlrz9C12P63a2eF_xrrrPR8YoIbEBmavRM1yszdaw=='
const org = 'yuanjen.hung@student.supsi.ch'
const bucket = 'HAR_system'

const client = new InfluxDB({ url, token });
const queryApi = client.getQueryApi(org);

//analysis needs
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

function queryString(range, measurement, host, aggregateWindow){
    const rangeString = (typeof range == "object") ? `range(start: ${range.startTimestamp}, stop: ${range.stopTimestamp})` : `range(start: ${range})`;
    const query = `from(bucket: "HAR_system") |> ${rangeString} |> filter(fn: (r) => r["_measurement"] == "${measurement}") |> filter(fn: (r) => r["_field"] == "value") |> filter(fn: (r) => r["host"] == "${host}") |> aggregateWindow(every: ${aggregateWindow}, fn: mean, createEmpty: false)`;
    return query;
}


function convertTZ(date, tzString) {
    return new Date((typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", {timeZone: tzString}));   
}

function startAnalysis(query, threshold, checkAlgorithm, usage) {
    var lastValue = null;
    var startingPoint = null;
    var recordArr = [];

    queryApi.queryRows(query, {
        next(row, tableMeta) {
            const o = tableMeta.toObject(row);
            const dateFormat = convertTZ(o._time, "Europe/Paris");
            const year = dateFormat.getFullYear();
            const month = ("0"+(dateFormat.getMonth()+1)).slice(-2);
            const day = ("0"+dateFormat.getDate()).slice(-2);
            const hour = ("0"+dateFormat.getHours()).slice(-2);
            const minute = ("0"+dateFormat.getMinutes()).slice(-2);
            const second = ("0"+dateFormat.getSeconds()).slice(-2);
            const date = `${year}-${month}-${day}`;
            if (lastValue !== null) {
                if (checkAlgorithm.isStart(o._value, lastValue, threshold)) {
                    // console.log(o._value, lastValue, threshold);
                    if (usage == "sleep" && parseInt(hour) < 22 && parseInt(hour) > 16) {}
                    else {
                        startingPoint = {
                            date: date,
                            hour: hour,
                            minute: minute,
                            second: second
                        };
                        console.log("------------start-------------");
                    }
                } else if (startingPoint !== null && checkAlgorithm.isStop(o._value, lastValue, threshold)) {
                    const duration = (parseInt(hour)+ (hour < startingPoint.hour ? 24 : 0) - parseInt(startingPoint.hour))*60 + parseInt(minute) - parseInt(startingPoint.minute);
                    if (usage == "sleep" && duration < 270) {}
                    else recordArr.push({
                        startDate: startingPoint.date,
                        startTime: {hour: startingPoint.hour, minute: startingPoint.minute, second: startingPoint.second},
                        duration: duration,
                        stopDate: date,
                        stopTime: {hour: hour, minute: minute, second: second}
                    });
                    console.log("------------stop-------------");
                    startingPoint = null;
                }
            }
            console.log(date, hour, minute, o._value);
            lastValue = o._value;
        },
        error(error) {
            console.error(error)
            console.log('Finished ERROR')
        },
        complete() {
            console.log('Finished SUCCESS');
            displayResult(usage, recordArr);
        },
    })
}

function displayResult(usage, recordArr){
    switch (usage) {
        case "bathroom":
            for(let record of recordArr) {
                document.getElementById("times_using_bathroom").innerHTML = recordArr.length;
                document.getElementById("usingBathroomTimeList").innerHTML += `<li class="list-group-item"><span style="display: inline-block; width: 110px;">${record.startDate}</span> <span style="display: inline-block; width: 45px;">${record.startTime.hour}:${record.startTime.minute}</span> <span style="display: inline-block; width: 75px;">(${record.duration} min)</span></li>`
            }
            break;
        case "shower":
            if (recordArr !== null) {
                for(let record of recordArr) {
                    document.getElementById("times_using_shower").innerHTML = recordArr.length;
                    document.getElementById("usingShowerTimeList").innerHTML += `<li class="list-group-item"><span style="display: inline-block; width: 110px;">${record.startDate}</span> ${record.startTime.hour}:${record.startTime.minute}</li>`
                }
            } else {
                document.getElementById("times_using_shower").innerHTML = 0;
                document.getElementById("usingShowerTimeList").innerHTML = `<li class="list-group-item">No shower time detected!</li>`
            }
            break;
        case "sleep":
            const avgTime = getAverageTime(recordArr);
            document.getElementById("time_bed").innerHTML = `${avgTime.avgStartTime}`;
            document.getElementById("time_wakeup").innerHTML = `${avgTime.avgStopTime}`;
            document.getElementById("duration_sleep").innerHTML = `${avgTime.avgDuration} hours`;
            for(let record of recordArr) {
                document.getElementById("bedTimeList").innerHTML += `<li class="list-group-item"><span style="display: inline-block; width: 110px;">${record.startDate}</span> ${record.startTime.hour}:${record.startTime.minute}</li>`
                document.getElementById("wakeupTimeList").innerHTML += `<li class="list-group-item"><span style="display: inline-block; width: 110px;">${record.stopDate}</span> ${record.stopTime.hour}:${record.stopTime.minute}</li>`
                document.getElementById("durationSleepList").innerHTML += `<li class="list-group-item"><span style="display: inline-block; width: 110px;">${record.startDate}</span> <span style="display: inline-block; width: 46px;">${record.startTime.hour}:${record.startTime.minute}</span> <span style="display: inline-block; width: 100px;">(${(record.duration / 60).toFixed(2)} hours)</span></li>`
            }
            break;
    }   
}

function getAverageTime(recordArr) {
    var startTimeArr = [];
    var stopTimeArr = [];
    var totalDuration = 0;

    for (let record of recordArr) {
        startTimeArr.push(record.startTime);
        stopTimeArr.push(record.stopTime);
        totalDuration += record.duration;
    }
    return {
        avgStartTime: referencePointCalc(startTimeArr, true),
        avgStopTime: referencePointCalc(stopTimeArr, false),
        avgDuration: (totalDuration/recordArr.length/60).toFixed(2)
    }
}

function referencePointCalc(arr, isMidnight){
    var totalDiff = 0;
    var referencePoint = null;

    for (let timestamp of arr) {
        const hour = parseInt(timestamp.hour);
        const minute = parseInt(timestamp.minute);
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

var query;

query = queryString("-1d", "light", "arduino_bathroom", "4m");
startAnalysis(query, 30, checkPeak, "bathroom");
query = queryString("-1d", "humidity", "arduino_bathroom", "4m");
startAnalysis(query, 40, checkPeak, "shower");
query = queryString("-5d", "light", "arduino_bedroom", "15m");
startAnalysis(query, 8, checkBasin, "sleep");