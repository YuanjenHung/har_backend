// Include internal or external modules
const mongoose = require('mongoose');
const SleepLog = require('../../models/sleepLog');

// Create MongoDB connections
mongoose.connect('mongodb://localhost:27017/har_system')
    .then(()=>{
        console.log("connection to db is successful!");
    })
    .catch((error)=>{
        console.log("something went wrong with db connection");
        console.log(error);
    });

function referencePointCalc(arr, isMidnight){
    var totalDiff = 0;
    var referencePoint = null;

    for (let el of arr) {
        const hour = el.getHours();
        const minute = el.getMinutes();
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

async function calcAvg(){
    let startTimeArr = [];
    let stopTimeArr = [];
    let totalDuration = 0;

    const sleep = await SleepLog.find({
        startTime: {
            $gte: new Date(new Date() - 7 * 60 * 60 * 24 * 1000)
        }
    });

    for (let r of sleep) {
        startTimeArr.push(r.startTime);
        stopTimeArr.push(r.stopTime);
        totalDuration += r.duration;
    }

    return {
        startTime: referencePointCalc(startTimeArr, true),
        stopTime: referencePointCalc(stopTimeArr, false),
        duration: (totalDuration/sleep.length/60).toFixed(2)
    }
}

module.exports = {
    calcAvg: calcAvg
}
