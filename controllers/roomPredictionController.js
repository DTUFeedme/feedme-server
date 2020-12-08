const {SignalMap} = require('../models/signalMap');
const {Room} = require('../models/room');
const {RoomPrediction, validate} = require('../models/roomPrediction');
const _ = require('lodash');


const getRoomPredictions = async (req, res) => {
    if (req.user.email !== "dcal@dtu.dk" && req.user.role < 2) {
        return res.status(403).send("User was not authorized to get room predictions")
    }

    const roomPredictions = await RoomPrediction.find();
    return res.send(roomPredictions);
};

const addRoomPrediction = async (req, res) => {
    const user = req.user;

    const {error} = validate(req.body);

    if (error) return res.status(400).send(error.details[0].message);

    const {signalMapId, correctRoomId, predictedRoomId} = req.body;

    // Verify ids
    const sm = await SignalMap.findById(signalMapId);
    if (!sm) res.status(400).send(`SignalMap with id ${signalMapId} was not found in db`);

    const correctRoom = await Room.findById(correctRoomId);
    if (!correctRoom) res.status(400).send(`CorrectRoom with id ${correctRoomId} was not found in db`);

    const predictedRoom = await Room.findById(predictedRoomId);
    if (!predictedRoom) res.status(400).send(`Predicted room with id ${predictedRoomId} was not found in db`);

    const roomPrediction = new RoomPrediction({
        correctRoom: correctRoomId,
        user: user.id,
        predictedRoom: predictedRoomId,
        signalMap: signalMapId
    });

    await roomPrediction.save();

    return res.send(roomPrediction);
};

const deleteRoomPrediction = async (req, res) => {

    const roomPrediction = await RoomPrediction.findByIdAndDelete(req.params.id);

    return res.send(roomPrediction);
};


module.exports.getRoomPredictions = getRoomPredictions;
module.exports.addRoomPrediction = addRoomPrediction;
module.exports.deleteRoomPrediction = deleteRoomPrediction;