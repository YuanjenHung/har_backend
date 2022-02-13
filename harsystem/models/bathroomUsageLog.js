const mongoose = require('mongoose');

const bathroomUsageLogSchema = new mongoose.Schema({
    startTime: {
        type: Date,
        required: true
    },
    stopTime: {
        type: Date,
        required: true
    }
})

bathroomUsageLogSchema.virtual('duration').get(function(){
    const milliDiff = this.stopTime.getTime() - this.startTime.getTime();
    return Math.floor(milliDiff/1000/60);
})

const BathroomUsageLog = mongoose.model("BathroomUsageLog", bathroomUsageLogSchema);

module.exports = BathroomUsageLog;