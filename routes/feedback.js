const express = require('express');
const router = express.Router();
const {Feedback, validate, validateChangeQuestion} = require('../models/feedback');
const {Room} = require('../models/room');
const {Answer} = require('../models/answer');
const {Question} = require('../models/question');
const {User} = require('../models/user');
const {Building} = require('../models/building');
const _ = require('lodash');
const validateId = require('../middleware/validateIdParam');
const {auth} = require('../middleware/auth');
const mongoose = require("mongoose");

router.post('/', auth, async (req, res) => {

    const {error} = validate(req.body);

    if (error) return res.status(400).send(error.details[0].message);

    const {roomId, answerId, questionId} = req.body;

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).send("Room with id " + roomId + " was not found");

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).send("User with id " + user._id + " was not found");

    const answer = await Answer.findById(answerId);
    if (!answer) return res.status(404).send("Answer with id " + answerId + " was not found");

    const question = await Question.findById(questionId);
    if (!question) return res.status(404).send("Question with id " + questionId + " was not found");

    const qs = question.rooms.filter( room => room.toString() === roomId);
    if (qs.length < 1)
        return res.status(400).send("Question was not from the same room as the feedback given");


    let feedback = new Feedback(
      {
          user: user._id,
          room: roomId,
          answer: answerId,
          question: questionId
      }
    );

    const building = await Building.findById(room.building);
    building.feedback.push(feedback);

    await feedback.save();
    await building.save();

    // for (userId of question.usersAnswered) {
    //     if (userId.toString() === user._id.toString())
    //         return res.status(400).send("User is already present in usersAnswered list");
    // }

    // question.usersAnswered.push(user._id);
    await question.save();

    res.send(_.pick(feedback, ["_id", "user", "room", "answer", "question"]));

});

router.get('/', auth, async (req, res) => {
    const query = feedbackQuery(req.query, req.user._id);
    if (!query) return res.status(400).send("Invalid query parameter");

    if (req.query.building) {

        const rooms = await Room.find({building: req.query.building});
        const roomIds = [];
        for (let i = 0; i < rooms.length; i++) {
            roomIds.push(rooms[i].id);
        }
        query.room = {$in: roomIds};
    }

    const feedback = await Feedback.find(query)
      .populate("answer")
      .populate("question");

    res.send(feedback);
});

router.get("/answeredQuestions", auth, async (req, res) => {

    let answeredQuestions = [];

    const query = feedbackQuery(req.query, req.user._id);
    if (!query) return res.status(400).send("Invalid query parameter");
    const feedback = await Feedback.find(query).populate("question");

    for (let i = 0; i < feedback.length; i++) {
        const index = answeredQuestions.findIndex((answeredQuestion) => {
            return answeredQuestion.question && answeredQuestion.question._id === feedback[i].question._id;
        });
        if (index >= 0) {
            answeredQuestions[index].timesAnswered++;
        } else {
            answeredQuestions.push({
                question: _.pick(feedback[i].question, ["value", "_id"]),
                timesAnswered: 1
            })
        }
    }
    res.send(Array.from(answeredQuestions));
});

router.get("/questionStatistics/:questionId", [validateId, auth], async (req, res) => {
    let feedbackStats = [];
    const questionId = req.params.questionId;

    const query = feedbackQuery(req.query, req.user._id);
    if (!query) return res.status(400).send("Invalid query parameter");

    query.question = questionId;
    const feedback = await Feedback.find(query).populate("answer");

    for (let i = 0; i < feedback.length; i++) {
        const index = feedbackStats.findIndex(item => {
            return item.answer && item.answer._id === feedback[i].answer._id
        });
        if (index < 0) {
            feedbackStats.push({
                answer: _.pick(feedback[i].answer, ["_id", "value"]),
                timesAnswered: 1
            })
        } else {
            feedbackStats[index].timesAnswered++;
        }
    }

    res.send(feedbackStats);
});

router.patch("/change-answer/:feedbackId", [validateId, auth], async (req, res) => {

    const feedbackId = req.params.feedbackId;

    const {error} = validateChangeQuestion(req.body);

    if (error) return res.status(400).send(error.details[0].message);

    let feedback = await Feedback.findById(req.params.feedbackId).populate('question');

    if (!feedback)
        return res.status(404).send("feedback with id " + feedbackId+ " was not found");


    if (!feedback.question.answerOptions.find(e => e.id.toString() === req.body.answerId.toString()))
        return res.status(400).send("answerId was not included in question's answer options");


    console.log(feedback);
    feedback.answer = req.body.answerId;
    const newFeedback = await feedback.save();
    res.send(newFeedback);
});


function feedbackQuery(query, userId) {
    let feedbackQuery = {};
    let today = new Date();

    if (query.room) {
        if (!mongoose.Types.ObjectId.isValid(query.room)) return null;
        feedbackQuery.room = query.room;
    }


    switch (query.t) {
        case "hour":
            feedbackQuery.createdAt = {
                $gt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), today.getHours(), today.getMinutes() - 60, today.getSeconds())
            };
            break;
        case "day":
            feedbackQuery.createdAt = {
                $gt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), today.getHours() - 24, today.getMinutes())
            };
            break;
        case "week":
            feedbackQuery.createdAt = {
                $gt: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7, today.getHours())
            };
            break;
        case "month":
            feedbackQuery.createdAt = {
                $gt: new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
            };
            break;
        case "year":
            feedbackQuery.createdAt = {
                $gt: new Date(today.getFullYear() - 1, today.getMonth())
            };
            break;
        case undefined:
            break;
        default:
            return null;
    }

    switch (query.user) {
        case "me":
            feedbackQuery.user = userId;
            break;
        case "all":
            break;
        case undefined:
            break;
        default:
            return null;
    }

    return feedbackQuery;
}

module.exports = router;
