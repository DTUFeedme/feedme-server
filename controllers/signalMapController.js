const {SignalMap, validate, roomTypeEstimation} = require("../models/signalMap");
const {Room} = require("../models/room");
const {Beacon} = require("../models/beacon");


const createSignalMap = async (req, res) => {
    const {error} = validate(req.body);

    if (error) return res.status(400).send(error.details[0].message);

    const {beacons, roomId, buildingId} = req.body;
    let roomEstimation;

    const clientBeacons = [];

    let serverBeacons;
    if (buildingId) {
        serverBeacons = await Beacon.find({name: beacons.map(b => b.name), building: buildingId});
    } else {
        serverBeacons = await Beacon.find({name: beacons.map(b => b.name)});
    }

    if (!serverBeacons || serverBeacons.length <= 0)
        return res.status(400).send("Was unable to find any matching beacons");
    const rooms = await Room.find({building: {$in: serverBeacons.map(b => b.building)}});

    beacons.forEach(b => {
        const sbs = serverBeacons.filter(sb => sb.name === b.name);
        if (sbs.length > 0) {
            clientBeacons.push({_id: sbs[0].id, signals: b.signals})
        }
    });
    if (clientBeacons.length <= 0)
        return res.status(400).send("Unable to find any beacons on server with requested ids ");

    let room;
    let certainty;
    if (!roomId) {

        let signalMaps = await SignalMap.find({
            isActive: true,
            room: {$in: rooms.map(room => room.id)}
        });

        if (signalMaps.length <= 0) return res.status(400).send("Unable to find any active signalMaps " +
            "in current building");
        roomEstimation = await roomTypeEstimation(clientBeacons, signalMaps, 3, clientBeacons.map(b => b._id));

        room = await Room.findById(roomEstimation.type);
        certainty = roomEstimation.certainty;
    } else if (req.user.role < 2) {
        if (req.user.role < 1) return res.status(403).send("User should be authorized to post active signalmaps");
        room = await Room.findById(roomId);
        if (!room) return res.status(400).send(`Room with id ${roomId} was not found`);

        console.log(req.user.adminOnBuildings);
        if (!req.user.adminOnBuildings.find(elem => room.building.toString() === elem.toString()))
            return res.status(403).send("User was not admin on building containing room " + roomId);
    }

    let signalMap = new SignalMap({
        room: roomId || roomEstimation.type,
        beacons: clientBeacons,
        isActive: !!roomId,
    });

    if (signalMap.isActive) {
        signalMap = await signalMap.save();
    } else {
        room.certainty = certainty;
    }

    signalMap.room = room;
    res.send(signalMap);
};

const confirmRoom = async (req, res) => {
    const id = req.params.id;
    const signalMap = await SignalMap.findByIdAndUpdate(id, {
        $set: {
            isActive: true
        },
    }, {new: true});

    if (!signalMap) return res.status(404).send(`signalMap with id ${id} was not found in database`);
    res.send(signalMap);
};

const getSignalMaps = async (req, res) => {
    const signalMaps = await SignalMap.find();
    res.send(signalMaps);
};

module.exports.createSignalMap = createSignalMap;
module.exports.confirmRoom = confirmRoom;
module.exports.getSignalMaps = getSignalMaps;
