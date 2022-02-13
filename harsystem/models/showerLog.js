const mongoose = require('mongoose');

const showerLogSchema = new mongoose.Schema({
    startTime: {
        type: Date,
        required: true
    },
    stopTime: {
        type: Date,
        required: true
    }
})

showerLogSchema.virtual('duration').get(function(){
    const milliDiff = this.stopTime.getTime() - this.startTime.getTime();
    return Math.floor(milliDiff/1000/60);
})

const ShowerLog = mongoose.model("ShowerLog", showerLogSchema);

module.exports = ShowerLog;