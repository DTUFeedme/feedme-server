const express = require('express');
const {auth, admin} = require("../middleware/auth");
const router = express.Router();
const {User} = require('../models/user');
const {Building} = require('../models/building');
const {Room} = require('../models/room');
const {Question} = require('../models/question');
const {Feedback} = require('../models/feedback');
const {SignalMap} = require('../models/signalMap');
const {Answer} = require("../models/answer");

router.delete("/", [auth, admin], async (req, res) => {
    const deleteUser = await User.deleteMany({role: {$lt: 2}});
    const deleteBuilding = await Building.deleteMany({});
    const deleteRoom = await Room.deleteMany({});
    const deleteQuestion = await Question.deleteMany({});
    const deleteFeedback = await Feedback.deleteMany({});
    const deleteSignalMap = await SignalMap.deleteMany({});
    const deleteAnswer = await Answer.deleteMany({});

    res.send({
        deletedUsers: deleteUser.deletedCount,
        deletedBeacon: deleteBeacon.deletedCount,
        deletedBuilding: deleteBuilding.deletedCount,
        deletedRoom: deleteRoom.deletedCount,
        deletedQuestion: deleteQuestion.deletedCount,
        deletedFeedback: deleteFeedback.deletedCount,
        deletedSignalMap: deleteSignalMap.deletedCount,
        deletedAnswer: deleteAnswer.deletedCount,
    })
});
module.exports = router;
