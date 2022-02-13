const mongoose = require('mongoose');

const sleepLogSchema = new mongoose.Schema({
    startTime: {
        type: Date,
        required: true
    },
    stopTime: {
        type: Date,
        required: true
    }
})

sleepLogSchema.virtual('duration').get(function(){
    return (this.stopTime.getTime() - this.startTime.getTime())/1000/60;
})

const SleepLog = mongoose.model("SleepLog", sleepLogSchema);

module.exports = SleepLog;