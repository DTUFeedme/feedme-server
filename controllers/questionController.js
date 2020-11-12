const {Question} = require("../models/question");
const {Building} = require("../models/building");
const {Answer} = require("../models/answer");
const {Room} = require("../models/room");

const deleteQuestion = async (req, res) => {
    const id = req.params.id;

    const question = await Question.findById(id);
    if (!question) return res.status(404).send(`Question with id ${id} was not found in database`);

    const rooms = await Room.find({_id: {$in: question.rooms}});
    for (let i = 0; i < rooms.length; i++) {
        const building = await Building.findOne({_id: rooms[i].building, admins: {$all: [req.user.id]}});
        if (!building)
            return res.status(403).send("User needs to be admin on building with question to delete it");

    }

    for (let i = 0; i < question.answerOptions.length; i++) {
        const res = await Answer.findByIdAndRemove(question.answerOptions[i]._id);
    }

    await question.remove();

    res.send(question);
};

module.exports.deleteQuestion = deleteQuestion;
