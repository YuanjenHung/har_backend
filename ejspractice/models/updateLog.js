const mongoose = require('mongoose');

const updateLogSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true
    },
    startedPoint: {
        type: Object
    },
    lastValue: {
        type: Number
    }
})

const UpdateLog = mongoose.model("UpdateLog", updateLogSchema);

module.exports = UpdateLog;