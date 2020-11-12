const mongoose = require('mongoose');
const Joi = require('joi');
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        minLength: 3,
        maxLength: 255
    },
    password: {
        type: String,
        minLength: 3,
        maxLength: 1024
    },
    role: {
        type: Number,
        min: 0,
        max: 2,
        required: true,
        default: 0
    },
    refreshToken: {
        type: String,
        required: true,
        validate: /^[a-zA-Z\d]{8}-[a-zA-Z\d]{4}-[a-zA-Z\d]{4}-[a-zA-Z\d]{4}-[a-zA-Z\d]{12}$/
    },
    currentRoom: {
        type: mongoose.Types.ObjectId,
        ref: "Room",
    },
    roomLastUpdated: {
        type: Date,
    }
}, {timestamps: {createdAt: false, updatedAt: true}});

userSchema.methods.generateAuthToken = function (timeNow) {
    const expInSec = 60 * 5; // Five minutes

    if (timeNow)
        return jwt.sign({
            _id: this._id,
            role: this.role,
            exp: timeNow + expInSec,
            iat: timeNow
        }, process.env.jwtPrivateKey);

    return jwt.sign({
        _id: this._id,
        role: this.role,
        exp: Math.floor(Date.now() / 1000) + expInSec,
    }, process.env.jwtPrivateKey);
};

const UserRole = Object.freeze({"unauthorized": 0, "authorized": 1, "admin": 2,});

const User = mongoose.model('User', userSchema);

function validate(user) {
    const schema = {};
    return Joi.validate(user, schema);
}

function validateAuthorizedUser(user) {
    const schema = {
        email: Joi.string().min(3).max(255).required().email()
            .error(new Error("Invalid email")),
        password: Joi.string().required()
            .regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/)
            .error(new Error("Password must be at least 8 characters long " +
                "and include at least one capital letter and one number"
            )).required()
    };
    return Joi.validate(user, schema);
}


module.exports.User = User;
module.exports.validate = validate;
module.exports.validateAuthorized = validateAuthorizedUser;
module.exports.UserRole = UserRole;
