const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    startTime: {
        type: Date,
        required: true
    },
    stopTime: {
        type: Date,
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['shower', 'sleep', 'bathroom']
    }
})

activitySchema.virtual('duration').get(function(){
    const milliDiff = this.stopTime.getTime() - this.startTime.getTime();
    return Math.floor(milliDiff/1000/60);
})

const activity = mongoose.model("activity", activitySchema);

module.exports = activity;