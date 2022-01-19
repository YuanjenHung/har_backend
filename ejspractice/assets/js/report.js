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
            var hour = (+timeBuffer[0] + 1) % 24;
            var minute = timeBuffer[1];
            var second = timeBuffer[2];
            
            if (thresholdType) {
                if (o._value > threshold && lastValue < threshold) {
                    start = {
                        date: date,
                        time: `${("0"+hour).slice(-2)}:${("0"+minute).slice(-2)}`,
                        hour: hour,
                        minute: minute,
                        second: second
                    };
                } else if (start !== null && o._value < threshold && lastValue > threshold) {
                    duration = (parseInt(hour)+ (hour < start.hour ? 24 : 0) - parseInt(start.hour))*60 + parseInt(minute) - parseInt(start.minute);
                    timestampsArr.push({
                        date: start.date,
                        time: start.time,
                        duration: duration 
                    });
                    start = null;
                }
            } else {
                if (o._value < threshold && lastValue > threshold) {
                    start = {
                        date: date,
                        time: `${("0"+hour).slice(-2)}:${("0"+minute).slice(-2)}`,
                        hour: hour,
                        minute: minute,
                        second: second
                    };
                } else if (start !== null && o._value > threshold && lastValue < threshold) {
                    duration = (parseInt(hour)+ (hour < start.hour ? 24 : 0) - parseInt(start.hour))*60 + parseInt(minute) - parseInt(start.minute);
                    
                    if (duration > 270) {
                        timestampsArr.push({
                            startDate: start.date,
                            startTime: start.time,
                            duration: duration,
                            stopDate: date,
                            stopTime: `${("0"+hour).slice(-2)}:${("0"+minute).slice(-2)}`
                        });
                        start = null;
                    }
                }
            }
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
                    document.getElementById("usingBathroomTimeList").innerHTML += `<li class="list-group-item">${timeStamp.date} ${timeStamp.time} for ${timeStamp.duration}\tmin</li>`
                } else if (usage == "shower"){
                    document.getElementById("times_using_shower").innerHTML = timestampsArr.length;
                    document.getElementById("usingShowerTimeList").innerHTML += `<li class="list-group-item">${timeStamp.date} ${timeStamp.time}</li>`
                } else {
                    document.getElementById("bedTimeList").innerHTML += `<li class="list-group-item">${timeStamp.startDate} ${timeStamp.startTime}</li>`
                    document.getElementById("wakeupTimeList").innerHTML += `<li class="list-group-item">${timeStamp.stopDate} ${timeStamp.stopTime}</li>`
                    document.getElementById("durationSleepList").innerHTML += `<li class="list-group-item">${timeStamp.startDate} ${timeStamp.startTime} (${timeStamp.duration / 60} hours)</li>`
                }
                
            }
        },
    })
}

var query;

query = queryString("-1d", "light", "arduino_bathroom", "4m");
startAnalysis(query, 30, true, "bathroom");
query = queryString("-1d", "humidity", "arduino_bathroom", "4m");
startAnalysis(query, 40, true, "shower");
query = queryString("-7d", "light", "arduino_bedroom", "15m");
startAnalysis(query, 10, false, "sleep");