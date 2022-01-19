const {InfluxDB} = require('@influxdata/influxdb-client')

// You can generate an API token from the "API Tokens Tab" in the UI
const token = 'Smrm037Xfq6s4RzcMRkik81q9S6zO8LY8u6mDxPUyOoFmvlrz9C12P63a2eF_xrrrPR8YoIbEBmavRM1yszdaw=='
const org = 'yuanjen.hung@student.supsi.ch'
const bucket = 'HAR_system'
const client = new InfluxDB({url: 'https://eu-central-1-1.aws.cloud2.influxdata.com', token: token})

const queryApi = client.getQueryApi(org)

var usingBathroomTimeArr = [];
var usingShowerTimeArr = [];

function queryString(range, measurement, host, aggregateWindow){
    const query = `from(bucket: "HAR_system") |> range(start: ${range}) |> filter(fn: (r) => r["_measurement"] == "${measurement}") |> filter(fn: (r) => r["_field"] == "value") |> filter(fn: (r) => r["host"] == "${host}") |> aggregateWindow(every: ${aggregateWindow}, fn: mean, createEmpty: false)`;
    return query;
}

function queryStringWithDate(measurement, host, aggregateWindow){
    const timeRangeStart = 1642509120;
    const timeRangeStop = 1642587573;
    console.log(timeRangeStart + ", " + timeRangeStop + ", " + typeof timeRangeStart);
    const query = `from(bucket: "HAR_system") |> range(start: ${timeRangeStart}, stop: now()) |> filter(fn: (r) => r["_measurement"] == "${measurement}") |> filter(fn: (r) => r["_field"] == "value") |> filter(fn: (r) => r["host"] == "${host}") |> aggregateWindow(every: ${aggregateWindow}, fn: mean, createEmpty: false)`;
    return query;
}

var query = queryString("-1d", "light", "arduino_bathroom", "4m");
// const query = queryStringWithDate("light", "arduino_bathroom", "4m");

var lastValueBathroom = 0;
var bathroomStart;

queryApi.queryRows(query, {
    next(row, tableMeta) {
        const o = tableMeta.toObject(row);
        // console.log(`${o._time} ${o._measurement}: ${o._field}=${o._value}`);
        // console.log(new Date(o._time).getTime());
        const date = o._time.slice(0, o._time.indexOf("T"));
        const timeFormat = o._time.slice(o._time.indexOf("T")+1, o._time.indexOf("Z"));
        const timeBuffer = timeFormat.split(":");
        var hour = (+timeBuffer[0] + 1) % 24;
        var minute = timeBuffer[1];
        var second = timeBuffer[2];

        if(o._value > 50 && lastValueBathroom < 50) {
            bathroomStart = {
                date: date,
                time: timeFormat,
                hour: hour,
                minute: minute,
                second: second
            };
            // console.log("--------------------------------");
        } else if(o._value < 50 && lastValueBathroom > 50) {
            if (hour == 0 && bathroomStart.hour !== 0) hour = 24;
            usingBathroomTimeArr.push({
                date: bathroomStart.date,
                time: bathroomStart.time,
                duration: (parseInt(hour) - parseInt(bathroomStart.hour))*60 + parseInt(minute) - parseInt(bathroomStart.minute) 
            });
            // console.log("--------------------------------");
        }

        lastValueBathroom = o._value;

        // console.log(`${hour}:${minute}:${second}\t${o._measurement}(${o._field}) = ${o._value.toFixed(1)}`);
    },
    error(error) {
        console.error(error)
        console.log('Finished ERROR')
    },
    complete() {
        console.log('Finished SUCCESS');
        console.log('-----------Bathroom Using Time analyze------------')
        for(let timeStamp of usingBathroomTimeArr) {
            console.log(`${timeStamp.date} ${timeStamp.time} for ${timeStamp.duration} min`);
        }
    },
})

query = queryString("-1d", "humidity", "arduino_bathroom", "4m");

var lastValueShower = 0;
var showerStart;

queryApi.queryRows(query, {
    next(row, tableMeta) {
        const o = tableMeta.toObject(row);
        // console.log(`${o._time} ${o._measurement}: ${o._field}=${o._value}`);
        // console.log(new Date(o._time).getTime());
        const date = o._time.slice(0, o._time.indexOf("T"));
        const timeFormat = o._time.slice(o._time.indexOf("T")+1, o._time.indexOf("Z"));
        const timeBuffer = timeFormat.split(":");
        var hour = (+timeBuffer[0] + 1) % 24;
        var minute = timeBuffer[1];
        var second = timeBuffer[2];

        if(o._value > 38 && lastValueShower < 38) {
            showerStart = {
                date: date,
                time: timeFormat,
                hour: hour,
                minute: minute,
                second: second
            };
            // console.log("--------------------------------");
        } else if(o._value < 38 && lastValueShower > 38) {
            if (hour == 0 && showerStart.hour !== 0) hour = 24;
            usingShowerTimeArr.push({
                date: showerStart.date,
                time: showerStart.time,
                duration: (parseInt(hour) - parseInt(showerStart.hour))*60 + parseInt(minute) - parseInt(showerStart.minute) 
            });
            // console.log("--------------------------------");
        }

        lastValueShower = o._value;

        // console.log(`${hour}:${minute}:${second}\t${o._measurement}(${o._field}) = ${o._value.toFixed(1)}`);
    },
    error(error) {
        console.error(error)
        console.log('Finished ERROR')
    },
    complete() {
        console.log('Finished SUCCESS');
        console.log('-----------Shower Time analyze------------')
        for(let timeStamp of usingShowerTimeArr) {
            console.log(`${timeStamp.date} ${timeStamp.time} for ${timeStamp.duration} min`);
        }
    },
})

// module.exports = {
//     startQuery: startQuery
// }