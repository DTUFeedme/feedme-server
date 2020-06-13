const mongoose = require('mongoose');
const Joi = require('joi');


const feedbackSchema = new mongoose.Schema({
    question: {
        type: mongoose.Types.ObjectId,
        ref: 'Question',
        required: true
    },
    user: {
        type: mongoose.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    room: {
        type: mongoose.Types.ObjectId,
        required: true,
        ref: 'Room'
    },
    answer: {
        type: mongoose.Types.ObjectId,
        required: true,
        ref: 'Answer'
    },
    timesAnswered: Number
}, {timestamps: true});

const Feedback = mongoose.model('Feedback', feedbackSchema);

function validateFeedback(feedback) {
    const schema = {
        roomId: Joi.objectId().required(),
        questionId: Joi.objectId().required(),
        answerId: Joi.objectId().required()

        // You only send genre id
        // Then we find the genre in the separate list
        // and send that with the movie object
        // questions: Joi.array().items(Joi.object({
        //   _id: Joi.objectId().required(),
        //   answer: Joi.string().min(1).max(255).required()
        // }).required()).required(),
    };
    return Joi.validate(feedback, schema);
}

function validateChangeQuestion(feedback) {
    const schema = {
        answerId: Joi.objectId().required()
    };
    return Joi.validate(feedback, schema);
}

exports.Feedback = Feedback;
exports.validate = validateFeedback;
exports.feedbackSchema = feedbackSchema;
exports.validateChangeQuestion = validateChangeQuestion;
