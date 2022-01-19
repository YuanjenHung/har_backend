// import latest release from npm repository 
import {InfluxDB, Point} from 'https://unpkg.com/@influxdata/influxdb-client/dist/index.browser.mjs';
      
const url = 'https://eu-central-1-1.aws.cloud2.influxdata.com/'
const token = 'Smrm037Xfq6s4RzcMRkik81q9S6zO8LY8u6mDxPUyOoFmvlrz9C12P63a2eF_xrrrPR8YoIbEBmavRM1yszdaw=='
const org = 'yuanjen.hung@student.supsi.ch'
const bucket = 'HAR_system'

const client = new InfluxDB({ url, token });

const queryApi = client.getQueryApi(org);

function queryString(range, measurement, host, aggregateWindow){
    const query = `from(bucket: "HAR_system") |> range(start: ${range}) |> filter(fn: (r) => r["_measurement"] == "${measurement}") |> filter(fn: (r) => r["_field"] == "value") |> filter(fn: (r) => r["host"] == "${host}") |> aggregateWindow(every: ${aggregateWindow}, fn: mean, createEmpty: false)`;
    return query;
}

function startAnalysis(query, threshold, thresholdType, usage) {
    var timestampsArr = [];
    var lastValue = 0;
    var start = null;
    var duration = 0;

    queryApi.queryRows(query, {
        next(row, tableMeta) {
            const o = tableMeta.toObject(row);
            const date = o._time.slice(0, o._time.indexOf("T"));
            const timeFormat = o._time.slice(o._time.indexOf("T")+1, o._time.indexOf("Z"));
            const timeBuffer = timeFormat.split(":");
            var hour = ("0"+(+timeBuffer[0] + 1) % 24).slice(-2);
            var minute = ("0"+timeBuffer[1]).slice(-2);
            var second = ("0"+timeBuffer[2]).slice(-2);
            
            if (thresholdType) {
                if (o._value > threshold && lastValue < threshold) {
                    start = {
                        date: date,
                        hour: hour,
                        minute: minute,
                        second: second
                    };
                } else if (start !== null && o._value < threshold && lastValue > threshold) {
                    duration = (parseInt(hour)+ (hour < start.hour ? 24 : 0) - parseInt(start.hour))*60 + parseInt(minute) - parseInt(start.minute);
                    timestampsArr.push({
                        date: start.date,
                        time: {hour: start.hour, minute: start.minute, second: start.second},
                        duration: duration 
                    });
                    start = null;
                }
            } else {
                if (o._value < threshold && lastValue > threshold) {
                    start = {
                        date: date,
                        hour: hour,
                        minute: minute,
                        second: second
                    };
                } else if (start !== null && o._value > threshold && lastValue < threshold) {
                    duration = (parseInt(hour)+ (hour < start.hour ? 24 : 0) - parseInt(start.hour))*60 + parseInt(minute) - parseInt(start.minute);
                    
                    if (duration > 270) {
                        timestampsArr.push({
                            startDate: start.date,
                            startTime: {hour: start.hour, minute: start.minute, second: start.second},
                            duration: duration,
                            stopDate: date,
                            stopTime: {hour: hour, minute: minute, second: second}
                        });
                        console.log(start.hour, start.minute, duration);
                    }
                    start = null
                }
            }
            console.log(`${date} ${hour}:${minute}:${second}\t${o._measurement}(${o._field}) = ${o._value.toFixed(1)}`);
            lastValue = o._value;
        },
        error(error) {
            console.error(error)
            console.log('Finished ERROR')
        },
        complete() {
            console.log('Finished SUCCESS');
            for(let timeStamp of timestampsArr) {
                if (usage == "bathroom") {
                    document.getElementById("times_using_bathroom").innerHTML = timestampsArr.length;
                    document.getElementById("usingBathroomTimeList").innerHTML += `<li class="list-group-item">${timeStamp.date} ${timeStamp.time.hour}:${timeStamp.time.minute}:${timeStamp.time.second} for ${timeStamp.duration}\tmin</li>`
                } else if (usage == "shower"){
                    document.getElementById("times_using_shower").innerHTML = timestampsArr.length;
                    document.getElementById("usingShowerTimeList").innerHTML += `<li class="list-group-item">${timeStamp.date} ${timeStamp.time.hour}:${timeStamp.time.minute}:${timeStamp.time.second}</li>`
                } else {
                    document.getElementById("bedTimeList").innerHTML += `<li class="list-group-item">${timeStamp.startDate} ${timeStamp.startTime.hour}:${timeStamp.startTime.minute}:${timeStamp.startTime.second}</li>`
                    document.getElementById("wakeupTimeList").innerHTML += `<li class="list-group-item">${timeStamp.stopDate} ${timeStamp.stopTime.hour}:${timeStamp.stopTime.minute}:${timeStamp.stopTime.second}</li>`
                    document.getElementById("durationSleepList").innerHTML += `<li class="list-group-item">${timeStamp.startDate} ${timeStamp.startTime.hour}:${timeStamp.startTime.minute}:${timeStamp.startTime.second} (${timeStamp.duration / 60} hours)</li>`
                }
            }
            if (usage == "sleep") {
                const avg = avgTime(timestampsArr);
                document.getElementById("time_bed").innerHTML = `${avg.avgStartTime}`;
                document.getElementById("time_wakeup").innerHTML = `${avg.avgStopTime}`;
                document.getElementById("duration_sleep").innerHTML = `${avg.avgDuration} hours`;
            }
        },
    })
}

function avgTime(timeArr) {
    var startArr = [];
    var stopArr = [];
    var totalDuration = 0;

    for (let time of timeArr) {
        startArr.push(time.startTime);
        stopArr.push(time.stopTime);
        totalDuration += time.duration;
    }
    return {
        avgStartTime: referencePointCalc(startArr, true),
        avgStopTime: referencePointCalc(stopArr, false),
        avgDuration: totalDuration/timeArr.length/60
    }
}

function referencePointCalc(arr, isMidnight){
    var totalDiff = 0;
    var referencePoint;

    for (let timestamp of arr) {
        const hour = parseInt(timestamp.hour);
        const minute = parseInt(timestamp.minute);
        const midnight = ((24 - hour) <= 12) ? 24 : 0;
        const noon = 12;
        const diff = (hour - (isMidnight?midnight:noon))*60 + minute;
        totalDiff += diff;
    }
    const avgDiff = totalDiff/arr.length

    if (isMidnight) {
        referencePoint = totalDiff < 0 ? 24: 0;
    } else {
        referencePoint = 12;
    }

    const avgHour = ("0" + Math.floor((referencePoint*60+avgDiff)/60).toString()).slice(-2);
    const avgMinute = ("0" + Math.floor((referencePoint*60+avgDiff)%60).toString()).slice(-2);
    const avg = `${avgHour}:${avgMinute}`

    return avg;
}

var query;

query = queryString("-1d", "light", "arduino_bathroom", "4m");
startAnalysis(query, 30, true, "bathroom");
query = queryString("-1d", "humidity", "arduino_bathroom", "4m");
startAnalysis(query, 40, true, "shower");
query = queryString("-5d", "light", "arduino_bedroom", "15m");
startAnalysis(query, 10, false, "sleep");