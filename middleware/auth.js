const {User} = require('../models/user');
const mongoose = require('mongoose');
const jwt = require("jsonwebtoken");

const auth = async (req, res, next) => {
    const token = req.header("x-auth-token");
    if (!token) return res.status(401).send('No json web token provided.');
    let decoded;

    try {
        decoded = jwt.verify(token, process.env.jwtPrivateKey);
    } catch (e) {
        return res.status(401).send(e.message);
    }

    const userId = decoded._id;

    if (!userId) return res.status(401).send('Please provide valid token with user id');

    if (!mongoose.Types.ObjectId.isValid(userId))
        return res.status(401).send(`User id ${userId} was not valid`);

    const user = await User.findById(userId);
    if (!user) return res.status(404).send("User with id (decoded from token) " + userId + " was not found");

    req.user = user;

    next();
};

const authExpired = async (req, res, next) => {
    const token = req.header("x-auth-token");
    if (!token) return res.status(401).send('No json web token provided.');
    let decoded;

    try {
        decoded = jwt.verify(token, process.env.jwtPrivateKey, {ignoreExpiration: true});
    } catch (e) {
        return res.status(401).send('Invalid token');
    }

    const userId = decoded._id;

    if (!userId) return res.status(401).send('Please provide valid token with user id');

    if (!mongoose.Types.ObjectId.isValid(userId))
        return res.status(401).send(`User id ${userId} was not valid`);

    const user = await User.findById(userId);
    if (!user) return res.status(404).send("User with id (decoded from token) " + userId + " was not found");

    req.user = user;

    next();
};

const admin = (req, res, next) => {
    if (req.user.role < 2) return res.status(403).send('Admin rights are required');
    next();
};

const authorized = (req, res, next) => {
    if (req.user.role < 1) return res.status(403).send('User needs to be authorized to access the resource');
    next();
};

module.exports.auth = auth;
module.exports.admin = admin;
module.exports.authorized = authorized;
module.exports.authExpired = authExpired;

