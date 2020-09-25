const {Building, validate} = require("../models/building");
const {Room} = require("../models/room");
const {Question} = require("../models/question");
const {Feedback} = require('../models/feedback');
const {User} = require('../models/user');
const _ = require('lodash');

const deleteBuilding = async (req, res) => {
    const id = req.params.id;

    if (!req.user.adminOnBuildings.find(elem => elem.toString() === id.toString()))
        return res.status(403).send("User needs to be admin on building to delete it");

    const building = await Building.findByIdAndDelete(id);
    const rooms = await Room.find({building: id});
    for (let i = 0; i < rooms.length; i++) {
        await Question.deleteMany({rooms: rooms[i].id});
    }
    await Room.deleteMany({building: id});

    if (!building) return res.status(404).send(`Building with id ${id} was not found in database`);

    res.send(building);
};

const getBuilding = async (req, res) => {
    const building = await Building.findById(req.params.id);
    if (!building) return res.status(404).send(`Building with id ${req.params.id} was not found`);
    const newBuilding = _.pick(building, ["name", "_id"]);
    newBuilding.rooms = await Room.find({building: building.id});

    if (req.query.withFeedbackCount) {
        let feedbackCount = 0;
        for (let i = 0; i < newBuilding.rooms.length; i++) {
            feedbackCount += await Feedback.countDocuments({room: newBuilding.rooms[i]._id});
        }
        newBuilding.feedbackCount = feedbackCount;
    }

    res.send(newBuilding);
};

const getBuildings = async (req, res) => {
    const user = req.user;
    const admin = req.query.admin;
    const feedback = req.query.feedback;
    const all = req.query.all;

    if (all) {
        const buildings = await Building.find();
        return res.send(buildings);
    }

    let buildings;
    if (admin === "me") {
        buildings = await Building.find({_id: {$in: user.adminOnBuildings}});
    } else if (admin) {
        if (user.role < 2) return res.status(403).send("User did not have authorized role (admin)" +
            " to view buildings of other admins");

        const adminUser = await User.findById(admin);
        buildings = await Building.find({_id: {$in: adminUser.adminOnBuildings}});
    } else if (!admin && !feedback) {
        if (user.role < 2) return res.status(403).send("User did not have authorized role (admin)" +
            " to view all buildings. Please specify query to only receive specific buildings");

        buildings = await Building.find();
    } else if (feedback) {
        let givenFeedback;
        if (feedback === "me") {
            givenFeedback = await Feedback.find({user: user.id});
        } else {
            if (user.role < 2) return res.status(403).send("User did not have authorized role (admin) " +
                "to view buildings where another user has given feedback");
            givenFeedback = await Feedback.find({user: feedback});
        }

        const buildingsGivenFeedback = new Set();
        for (let i = 0; i < givenFeedback.length; i++) {
            const room = await Room.findById(givenFeedback[i].room);
            buildingsGivenFeedback.add(room.building);
        }
        buildings = await Building.find({_id: {$in: Array.from(buildingsGivenFeedback)}});
    }

    let newBuildings = [];
    for (let i = 0; i < buildings.length; i++) {
        newBuildings.push(_.pick(buildings[i], ["name", "_id"]));
        newBuildings[i].rooms = await Room.find({building: buildings[i].id});
    }
    res.send(newBuildings);
};

const createBuilding = async (req, res) => {

    try {
        await validate(req.body)
    } catch (e) {
        return res.status(400).send(e.message);
    }

    let {name} = req.body;
    const user = req.user;

    const admin = await User.findById(user._id);
    if (!admin) return res.status(401).send(`User with id ${userId} is not authorized in system`);

    const building = new Building({
        name
    });

    admin.adminOnBuildings.push(building._id);
    await admin.save();
    await building.save();
    res.send(building);
};

const addBlacklistedDevice = async (req, res) => {
    const {deviceName} = req.body;
    if (!deviceName) return res.status(400).send("No device name provided in body of request");

    const buildingId = req.params.id;

    if (!req.user.adminOnBuildings.find(elem => elem.toString() === buildingId.toString()))
        return res.status(403).send("User needs to be admin on building to delete it");

    const building = await Building.findById(buildingId);
    if (!building) return res.status(404).send(`Building with id ${buildingId} was not found`)

    building.blacklistedDevices.push(deviceName);

    await building.save();
    res.send(building);
};

const removeBlacklistedDevice = async (req, res) => {
    const buildingId = req.params.id;
    const deviceName = req.params.deviceName;

    const building = await Building.findById(buildingId);
    if (!building) return res.status(404).send(`Building with id ${buildingId} was not found`);

    const deviceIdx = building.blacklistedDevices.indexOf(deviceName);

    if (!req.user.adminOnBuildings.find(elem => elem.toString() === buildingId.toString()))
        return res.status(403).send("User needs to be admin on building to delete it");

    let devicesDeleted = 0;

    if (deviceIdx >= 0) {
        building.blacklistedDevices.splice(deviceIdx, 1);
        await building.save();
        devicesDeleted = 1;
    }
    return res.send({"deleted": devicesDeleted});
};

const getBlacklistedDevices = async (req, res) => {
    const buildingId = req.params.id;

    if (!req.user.adminOnBuildings.find(elem => elem.toString() === buildingId.toString()))
        return res.status(403).send("User needs to be admin on building to delete it");

    const building = await Building.findById(buildingId);
    if (!building) return res.status(404).send(`Building with id ${buildingId} was not found`);

    return res.send(building.blacklistedDevices);
};


module.exports.deleteBuilding = deleteBuilding;
module.exports.getBuildings = getBuildings;
module.exports.getBuilding = getBuilding;
module.exports.createBuilding = createBuilding;
module.exports.addBlacklistedDevice = addBlacklistedDevice;
module.exports.removeBlacklistedDevice = removeBlacklistedDevice;
module.exports.getBlacklistedDevices = getBlacklistedDevices;
