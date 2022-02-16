const mongoose = require('mongoose');

const update = new mongoose.Schema({
    date: {
        type: Date,
        required: true
    },
    startedPoint: {
        type: Object
    },
    lastValue: {
        type: Number
    },
    usage: {
        type: String,
        enum: ['shower', 'bathroom', 'sleep']
    }
})

const Update = mongoose.model("Update", update);

module.exports = Update;