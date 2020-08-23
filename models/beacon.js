const mongoose = require('mongoose');
const Joi = require('joi');

const beaconSchema = new mongoose.Schema({
    name: {
        type: String,
        minLength: 1,
        maxLength: 255,
        required: true,
        unique: true,
        index: true
    },
    // room: {
    //     type: roomSchema,
    //     required: true
    // },
    building: {
        type: mongoose.Types.ObjectId,
        ref: "Building",
        required: true
    }
});

const Beacon = mongoose.model('Beacon', beaconSchema);

function validateBeacon(beacon) {
    const schema = {
        buildingId: Joi.objectId().required(),
        name: Joi.string().min(1).max(255).required()
    };

    return Joi.validate(beacon, schema);
}

exports.Beacon = Beacon;
exports.validate = validateBeacon;
