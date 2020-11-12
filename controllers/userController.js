const _ = require('lodash');
const bcrypt = require("bcryptjs");
const {User, validate, validateAuthorized} = require('../models/user');
const {v4: uuidv4} = require('uuid');
const {Building} = require("../models/building");


const getUsers = async (req, res) => {
    const users = await User.find(null, "_id email role adminOnBuilding");
    res.send(users);
};

const getUsersLocation = async (req, res) => {
    const users = await User.find(null, "_id currentRoom roomLastUpdated");
    res.send(users);
};

const makeUserAdmin = async (req, res) => {

    const {email, buildingId} = req.body;

    if (!email || !buildingId)
        return res.status(400).send("Request should include userEmail and buildingId");

    let newUser = await User.findOne({email: email});


    const updatedBuilding = await Building.findOneAndUpdate({
        _id: buildingId,
        admins: {$all: [req.user.id], $ne: newUser.id}
    }, {
        $push: {admins: newUser.id}
    }, {new: true})


    if (!updatedBuilding)
        return res.status(400).send("Building could not be updated");

    res.send(newUser);
};

const createUser = async (req, res) => {

    let user;

    if (req.body.email) {
        try {
            await validateAuthorized(req.body);
        } catch (e) {
            return res.status(400).send(e.message);
        }
    } else {
        try {
            await validate(req.body);
        } catch (e) {
            return res.status(400).send(e.message);
        }
    }

    if (req.body.email) {
        const {email, password} = req.body;
        if (await User.findOne({email})) return res.status(400).send("User already registered");

        const salt = await bcrypt.genSalt();
        user = new User(_.pick(req.body, ['email', "password"]));
        user.password = await bcrypt.hash(password, salt);
        user.role = 1; // Authorized
    } else {
        user = new User();
    }

    user.refreshToken = uuidv4();
    await user.save();
    const token = user.generateAuthToken();

    res.header('x-auth-token', token).send(_.pick(user, ["_id", "email", "refreshToken"]));
};


module.exports.getUsers = getUsers;
module.exports.makeUserAdmin = makeUserAdmin;
module.exports.createUser = createUser;
module.exports.getUsersLocation = getUsersLocation;
