const mongoose = require('mongoose');
const Joi = require('joi');

const roomPredictionSchema = new mongoose.Schema({
    signalMap: {
        type: {
            beacons: {
                type: [{
                    name: {
                        type: String,
                        required: true
                    },
                    signal: {
                        type: Number,
                        required: true
                    }
                }]
            }
        },
        required: true
    },
    correctRoom: {
        type: mongoose.Types.ObjectId,
        ref: "Room",
        required: true
    },
    predictedRoom: {
        type: mongoose.Types.ObjectId,
        ref: "Room",
        required: true
    },
    user: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    },
}, {timestamps: {createdAt: true, updatedAt: false}});

const RoomPrediction = mongoose.model('RoomPrediction', roomPredictionSchema);

function validateRoomPrediction(room) {

    const schema = {
        signalMap: Joi.object({
            beacons: Joi.array().items(Joi.object({
                name: Joi.string()
                    .required(),
                signal: Joi.number().min(-200).max(0).required()
            }).required()),
        }).required(),
        correctRoomId: Joi.objectId().required(),
        predictedRoomId: Joi.objectId().required(),
    };

    return Joi.validate(room, schema);
}

module.exports.RoomPrediction = RoomPrediction;
module.exports.validate = validateRoomPrediction;
