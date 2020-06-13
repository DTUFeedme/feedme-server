const {Room, validate} = require("../models/room");
const {Question} = require("../models/question");
const {User} = require("../models/user");
const {Feedback} = require("../models/feedback");
const {Building} = require("../models/building");
const {SignalMap} = require("../models/signalMap");

const createRoom = async (req, res) => {
    const {error} = validate(req.body);

    if (error) return res.status(400).send(error.details[0].message);

    const {name, location, buildingId} = req.body;

    if (await Building.countDocuments({_id: buildingId}) <= 0)
        return res.status(404).send('Building with id ' + buildingId + ' was not found.');

    let room = new Room({
        name,
        location,
        building: buildingId
    });

    await room.save();
    res.send(room);
};
const getRoomsFromBuilding = async (req, res) => {
    const buildingId = req.params.id;
    if (!req.user.adminOnBuildings.find(elem => elem.toString() === buildingId))
        return res.status(403).send("User was not admin on building with id " + buildingId);
    const rooms = await Room.find({building: buildingId});
    res.send(rooms);
};

const deleteRoom = async (req, res) => {
    const id = req.params.id;

    const room = await Room.findById(id);
    if (!room) return res.status(404).send(`Room with id ${id} was not found in database`);

    if (!req.user.adminOnBuildings.find(elem => elem.toString() === room.building.toString()))
        return res.status(403).send("User needs to be admin on room to delete it");

    const questions = await Question.find({rooms: room.id});

    for (let i = 0; i < questions.length; i++) {
        if (questions[i].rooms.length === 1) {
            await questions[i].remove();
        } else {
            const index = questions[i].rooms.findIndex(elem => elem.toString() === room.id);
            console.log('index: ', index);
            questions[i].rooms.splice(index, 1);
            await questions[i].save();
        }
    }
    const signalMaps = await SignalMap.find({room: room.id});

    for (let i = 0; i < signalMaps.length; i++) {
        await signalMaps[i].remove();
    }

    await room.remove();

    res.send(room);
};

const getRooms = async (req, res) => {
    const {admin, feedback} = req.query;


    let rooms;
    if (admin) {
        if (admin === "me") {
            rooms = await Room.find({building: {$in: req.user.adminOnBuildings}});
            console.log('rooms: ', rooms);
        } else {
            if (req.user.role < 2)
                return res.status(403).send("User should have role admin to get all rooms");
            const user = await User.findById(admin);
            if (!user) return res.status(404).send(`User with id ${admin} was not found`);

            rooms = await Room.find({building: {$in: user.adminOnBuildings}});
        }

    } else if (feedback) {
        if (feedback === "me") {
            const feedback = await Feedback.find({user: req.user.id});
            const roomsGivenFeedback = new Set();
            for (let i = 0; i < feedback.length; i++) {
                roomsGivenFeedback.add(feedback[i].room);
            }
            rooms = await Room.find({_id: {$in: Array.from(roomsGivenFeedback)}});
        } else {
            return res.status(400).send("query feedback can only have value \"me\" ");
        }

    } else {
        if (req.user.role < 2)
            return res.status(403).send("User should have role admin to get all rooms");
        rooms = await Room.find();
    }
    res.send(rooms);
};

const getUserCountFromBuilding = async (req, res) => {
    const buildingId = req.params.id;

    if (!req.user.adminOnBuildings.find(elem => elem.toString() === buildingId))
        return res.status(403).send("User was not admin on building with id " + buildingId);

    const fetchedRooms = await Room.find({building: buildingId}, "_id name userCount");
    const rooms = [];

    for (let i = 0; i < fetchedRooms.length; i++) {
        const {_id, name} = fetchedRooms[i];
        const oldDate = new Date();
        oldDate.setMinutes(oldDate.getMinutes() - 30);
        const userCount = await User.countDocuments({
            currentRoom: _id, roomLastUpdated: {
                $gt: oldDate
            }
        });

        rooms.push({
            _id,
            name,
            userCount
        });
    }
    res.send(rooms);
}

module.exports.deleteRoom = deleteRoom;
module.exports.getRooms = getRooms;
module.exports.createRoom = createRoom;
module.exports.getRoomsFromBuilding = getRoomsFromBuilding;
module.exports.getUserCountFromBuilding = getUserCountFromBuilding;
