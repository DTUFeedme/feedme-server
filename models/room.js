const mongoose = require('mongoose');
const Joi = require('joi');

const roomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        minLength: 1,
        maxLength: 255
    },
    location: {
        type: String,
        required: true,
        minLength: 1,
        maxLength: 1024
    },
    building: {
        ref: 'Building',
        type: mongoose.Schema.ObjectId,
        required: true
    },
});

const Room = mongoose.model('Room', roomSchema);

function validateRoom(room) {
    const schema = {
        name: Joi.string().min(1).max(255).required(),
        location: Joi.string().min(1).max(1024),
        buildingId: Joi.objectId().required()
    };
    return Joi.validate(room, schema);
}

exports.Room = Room;
exports.validate = validateRoom;
exports.roomSchema = roomSchema;
