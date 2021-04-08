const {AppFeedback, validate} = require("../models/appFeedback");
const _ = require('lodash');
const nodemailer = require("nodemailer");


const createAppFeedback = async (req, res) => {

    try {
        await validate(req.body);
    } catch (e) {
        return res.status(400).send(e.message);
    }

    const user = req.user.id;
    const {feedback} = req.body;
    await new AppFeedback({feedback, user}).save();

    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: process.env.feedbackEmail,
            pass: process.env.feedbackEmailPwd
        }
    });

    const mailOptions = {
        from: 'info@climify.com',
        to: 'sebastian.a.specht@gmail.com',
        subject: 'App feedback',
        text: feedback
    };

    transporter.sendMail(mailOptions);

    res.send({feedback});
};


module.exports.createAppFeedback = createAppFeedback;
