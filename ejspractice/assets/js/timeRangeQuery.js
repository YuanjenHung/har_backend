const {InfluxDB} = require('@influxdata/influxdb-client')

// You can generate an API token from the "API Tokens Tab" in the UI
const token = 'Smrm037Xfq6s4RzcMRkik81q9S6zO8LY8u6mDxPUyOoFmvlrz9C12P63a2eF_xrrrPR8YoIbEBmavRM1yszdaw=='
const org = 'yuanjen.hung@student.supsi.ch'
const bucket = 'HAR_system'
const client = new InfluxDB({url: 'https://eu-central-1-1.aws.cloud2.influxdata.com', token: token})

const queryApi = client.getQueryApi(org)

function queryString(range, measurement, host, aggregateWindow){
    const rangeString = (typeof range == "object") ? `range(start: ${range.startTimestamp}, stop: ${range.stopTimestamp})` : `range(start: ${range})`;
    const query = `from(bucket: "HAR_system") |> ${rangeString} |> filter(fn: (r) => r["_measurement"] == "${measurement}") |> filter(fn: (r) => r["_field"] == "value") |> filter(fn: (r) => r["host"] == "${host}") |> aggregateWindow(every: ${aggregateWindow}, fn: mean, createEmpty: false)`;
    return query;
}

const range = {
    startDate: "2022-01-19",
    startTime: {hour: "23", minute: "00", second: "00"},
    stopDate: "2022-01-20",
    stopTime: {hour: "09", minute: "00", second: "00"}
}

function generateTimestamp(range) {
    const startFormat = `${range.startDate}T${range.startTime.hour}:${range.startTime.minute}:${range.startTime.second}`;
    const stopFormat = `${range.stopDate}T${range.stopTime.hour}:${range.stopTime.minute}:${range.stopTime.second}`;
    return {
        startTimestamp: Math.floor(new Date(startFormat).getTime()/1000),
        stopTimestamp: Math.floor(new Date(stopFormat).getTime()/1000)
    }
}

function startQuery(query) {
    queryApi.queryRows(query, {
        next(row, tableMeta) {
            const o = tableMeta.toObject(row);
            console.log(`${o._time} ${o._measurement}: ${o._field}=${o._value}`);    
        },
        error(error) {
            console.error(error)
            console.log('Finished ERROR');
        },
        complete() {
            console.log('Finished SUCCESS');
            return;
        },
    })
}

query = queryString(generateTimestamp(range), "light", "arduino_bedroom", "15m");
startQuery(query)