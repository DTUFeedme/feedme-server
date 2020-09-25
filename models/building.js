const mongoose = require('mongoose');
const Joi = require('joi');


const buildingSchema = new mongoose.Schema({
    name: {
        type: String,
        minLength: 1,
        maxLength: 255,
        required: true
    },
    feedback: {
        type: [mongoose.Schema.ObjectId]
    },
    blacklistedDevices: {
        type: [String]
    }
});

const Building = mongoose.model('Building', buildingSchema);

function validateBuilding(building) {

    const schema = {
        name: Joi.string().min(1).max(255).required()
    };

    return Joi.validate(building, schema);
}

exports.Building = Building;
exports.validate = validateBuilding;
