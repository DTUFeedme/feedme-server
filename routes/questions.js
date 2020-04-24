const express = require('express');
const router = express.Router();
const {Question, validate} = require('../models/question');
const {Answer} = require('../models/answer');
const {Feedback} = require('../models/feedback');
const _ = require('lodash');
const {Room} = require('../models/room');
const {Building} = require('../models/building');
const mongoose = require('mongoose');
const {auth} = require('../middleware/auth');
const questionController = require("../controllers/questionController");

router.post('/', [auth], async (req, res) => {

    const {error} = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    if (req.user.role < 1) return res.status(403).send("User should be authorized to post questions");

    const {value, rooms, answerOptions} = req.body;

    const user = req.user;

    if (answerOptions.length < 2)
        res.status(400).send("Minimum 2 answer options should be provided");

    let tempBuilding;
    for (let i = 0; i < rooms.length; i++) {
        const room = await Room.findById(rooms[i]);
        if (!room) return res.status(404).send(`Room with id ${rooms[i]} was not found.`);
        const building = await Building.findById(room.building);
        if (!building) return res.status(404).send('Building with id ' + room.building + ' was not found.');
        if (!tempBuilding) {
            tempBuilding = building;
            if (user.role !== 2 && (!user.adminOnBuildings ||
              !user.adminOnBuildings.find(elem => elem.toString() === building._id.toString()))) {
                return res.status(403).send('Admin rights on the building are required to post new questions');
            }
        } else if (tempBuilding !== building) {
            return res.status(400).send('Questions were posted in rooms of different buildings, which is not allowed');
        }
    }

    let question = new Question({
        value,
        rooms,
    });

    for (let i = 0; i < answerOptions.length; i++) {
        let answer = new Answer({value: answerOptions[i], question: question.id});
        await answer.save();
        question.answerOptions.push(answer);
    }
    await question.save();
    // for (let i = 0; i < answerOptions.length; i++) {
    //     question.answerOptions[i] = answerOptions[i];
    // }
    const hej = _.pick(question, ["_id", "rooms", "value", "isActive", "answerOptions"]);

    res.send(hej);
});

router.get('/', auth, async (req, res) => {
    const query = req.query;
    const user = req.user;

    
    const roomId = req.header('roomId');
    if (!roomId) return res.status(400).send('No room id provided');

    if (!mongoose.Types.ObjectId.isValid(roomId))
        return res.status(400).send(`Room id ${roomId} was not valid`);

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).send(`Room with id ${roomId} was not found`);

    // const questions = await Question.find({room: room._id});
    var questions = await Question.find({
        rooms: room.id
    });
    if (query.withTimesAnswered) {
        for (let i = 0; i < questions.length; i++) {
            const feedback = await Feedback.find({question: questions[i].id});
            questions[i].timesAnswered = feedback.length;
            for (let j = 0; j < questions[i].answerOptions.length; j++) {
                questions[i].answerOptions[j].timesAnswered = 0;
                for (let k = 0; k < feedback.length; k++) {
                    if (feedback[k].answer.toString() === questions[i].answerOptions[j].id.toString())
                        questions[i].answerOptions[j].timesAnswered++;
                }
            }
        }
    }
    //if (query.notAnswered) { TODO: Should be implemented when implememnted in app
        // console.log(questions.length);
        // questions = questions.filter(q => {
        //     for (let userId of q.usersAnswered) {
        //         if (user._id.toString() === userId.toString())
        //             return false;
        //     }
        //     return true;
        // });
    //}

    res.send(questions);
});

router.get("/active", auth, async (req, res) => {
    const roomId = req.header('roomId');
    if (!roomId) return res.status(400).send('No room id provided');

    if (!mongoose.Types.ObjectId.isValid(roomId))
        return res.status(400).send(`Room id ${roomId} was not valid`);

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).send(`Room with id ${roomId} was not found`);

    // const questions = await Question.find({room: room._id, isActive: true});
    const questions = await Question.find({
        rooms: room.id,
        isActive: true
    });

    res.send(questions);
});

router.put('/:id', async (req, res) => {

    if (await Question.countDocuments({_id: req.params.id}) <= 0)
        return res.status(404).send('Question with id ' + req.params.id + ' was not found.');

    const question = await Question.findByIdAndUpdate(req.params.id, {
        $set: {
            value: req.body.value,
            answer: req.body.answer
        }
    }, {new: true});

    res.send(question);
});

router.patch("/setActive/:id", auth, async (req, res) => {
    if (!req.body.hasOwnProperty("isActive")) return res.status(400).send("isActive should be set in body");

    const question = await Question.findByIdAndUpdate(req.params.id, {
        $set: {
            isActive: req.body.isActive
        }
    }, {new: true});

    res.send(question);
});

router.delete("/:id", auth, questionController.deleteQuestion);

module.exports = router;
