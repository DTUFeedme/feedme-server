const {Beacon, validate} = require("../models/beacon");
const {Room} = require("../models/room");
const {Question} = require("../models/question");
const {Feedback} = require('../models/feedback');
const {User} = require('../models/user');
const _ = require('lodash');

const deleteBeacon = async (req, res) => {
    const id = req.params.id;

    const beacon = await Beacon.findById(id);

    if (!beacon.admins.find(admin => admin.toString() === req.user.id))
        return res.status(403).send("User needs to be admin on beacon to delete it");

    await beacon.delete();
    // const beacon = await Beacon.findByIdAndDelete(id);
    const rooms = await Room.find({beacon: id});
    for (let i = 0; i < rooms.length; i++) {
        await Question.deleteMany({rooms: rooms[i].id});
    }
    await Room.deleteMany({beacon: id});

    if (!beacon) return res.status(404).send(`Beacon with id ${id} was not found in database`);

    res.send(beacon);
};

const getBeacon = async (req, res) => {
    const beacon = await Beacon.findById(req.params.id);
    if (!beacon) return res.status(404).send(`Beacon with id ${req.params.id} was not found`);
    const newBeacon = _.pick(beacon, ["name", "_id"]);
    newBeacon.rooms = await Room.find({beacon: beacon.id});

    if (req.query.withFeedbackCount) {
        let feedbackCount = 0;
        for (let i = 0; i < newBeacon.rooms.length; i++) {
            feedbackCount += await Feedback.countDocuments({room: newBeacon.rooms[i]._id});
        }
        newBeacon.feedbackCount = feedbackCount;
    }

    res.send(newBeacon);
};

const getBeacons = async (req, res) => {

    const beacons = await Beacon.find();
    return res.send(beacons);

};

const createBeacon = async (req, res) => {

    try {
        await validate(req.body)
    } catch (e) {
        return res.status(400).send(e.message);
    }
    //
    // let {name} = req.body;
    // const user = req.user;
    //
    // const beacon = new Beacon({
    //     name,
    //     admins: [user.id]
    // });
    //
    // await beacon.save();
    res.send(beacon);
};


module.exports.deleteBeacon = deleteBeacon;
module.exports.getBeacons = getBeacons;
module.exports.getBeacon = getBeacon;
module.exports.createBeacon = createBeacon;
