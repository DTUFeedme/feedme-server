const mongoose = require('mongoose');
const Joi = require('joi');

const beaconSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 1024,
        unique: true
    },
    building: {
        type: mongoose.Types.ObjectId,
        ref: "Building",
        required: true
    },
});

const Beacon = mongoose.model('Beacon', beaconSchema);

function validateBeacon(signalMap) {
    const schema = {
        beacons: Joi.string().required(),
        buildingId: Joi.objectId().required()
    };
    return Joi.validate(signalMap, schema);
}

exports.Beacon = Beacon;
exports.validate = validateBeacon;