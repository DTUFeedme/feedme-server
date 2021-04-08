const mongoose = require('mongoose');
const Joi = require('joi');

const appFeedbackSchema = new mongoose.Schema({
    feedback: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 4096,
    },
    user: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    },
});

const AppFeedback = mongoose.model('AppFeedback', appFeedbackSchema);

function validateAppFeedback(appFeedback) {
    const schema = {
        feedback: Joi.string().min(1).max(4000).required(),
    };
    return Joi.validate(appFeedback, schema);
}

exports.AppFeedback = AppFeedback;
exports.validate = validateAppFeedback;