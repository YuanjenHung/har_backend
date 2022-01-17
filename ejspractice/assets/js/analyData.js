const {InfluxDB} = require('@influxdata/influxdb-client')

// You can generate an API token from the "API Tokens Tab" in the UI
const token = 'Smrm037Xfq6s4RzcMRkik81q9S6zO8LY8u6mDxPUyOoFmvlrz9C12P63a2eF_xrrrPR8YoIbEBmavRM1yszdaw=='
const org = 'yuanjen.hung@student.supsi.ch'
const bucket = 'HAR_system'
const client = new InfluxDB({url: 'https://eu-central-1-1.aws.cloud2.influxdata.com', token: token})

const queryApi = client.getQueryApi(org)

var usingTimeArr = [];

function queryString(range, measurement, host, aggregateWindow){
    const query = `from(bucket: "HAR_system") |> range(start: ${range}) |> filter(fn: (r) => r["_measurement"] == "${measurement}") |> filter(fn: (r) => r["_field"] == "value") |> filter(fn: (r) => r["host"] == "${host}") |> aggregateWindow(every: ${aggregateWindow}, fn: mean, createEmpty: false)`;
    return query;
}

function startQuery(){
    const query = queryString("-1d", "light", "arduino_bathroom", "1m");
    var lastValue = 0;
    var start;
    queryApi.queryRows(query, {
        next(row, tableMeta) {
            const o = tableMeta.toObject(row);
            const date = o._time.slice(0, o._time.indexOf("T"));
            const timeFormat = o._time.slice(o._time.indexOf("T")+1, o._time.indexOf("Z"));
            const timeBuffer = timeFormat.split(":");
            var hour = (+timeBuffer[0] + 1) % 24;
            var minute = timeBuffer[1];
            var second = timeBuffer[2];

            if(o._value > 100 && lastValue < 100) {
                start = {
                    date: date,
                    hour: hour,
                    minute: minute,
                    second: second
                };
                // console.log("--------------------------------");
            } else if(o._value < 100 && lastValue > 100) {
                if (hour == 0) hour = 24;
                usingTimeArr.push({
                    date: start.date,
                    time: `${start.hour}:${start.minute}:${start.second}`,
                    duration: (parseInt(hour) - parseInt(start.hour))*60 + parseInt(minute) - parseInt(start.minute) 
                });
                // console.log("--------------------------------");
            }

            lastValue = o._value;

            // console.log(`${hour}:${minute}:${second}\t${o._measurement}(${o._field}) = ${o._value.toFixed(1)}`);
        },
        error(error) {
            console.error(error)
            console.log('Finished ERROR')
        },
        complete() {
            console.log('Finished SUCCESS');
            console.log('-----------Bathroom Using Time analyze------------')
            for(let timeStamp of usingTimeArr) {
                console.log(`${timeStamp.date} ${timeStamp.time} for ${timeStamp.duration} min`);
            }
        },
      })
}

module.exports = {
    startQuery: startQuery
}