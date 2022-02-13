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

function startQuery(query) {
    let myPromise = new Promise((resolve, reject) => {
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
                resolve("RESOLVED");
            },
        })    
    });

    return myPromise;    
}

async function startAnalysis(){
    query = queryString("-1d", "light", "arduino_bedroom", "15m");
    await startQuery(query);
    query = queryString("-1d", "humidity", "arduino_bathroom", "4m");
    await startQuery(query);
    return "ALL progress is finish!";
}


module.exports = {
    startAnalysis: startAnalysis
}