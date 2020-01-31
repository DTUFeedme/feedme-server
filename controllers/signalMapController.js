const {SignalMap, validate, estimateNearestNeighbors} = require("../models/signalMap");
const {Room} = require("../models/room");
const {Beacon} = require("../models/beacon");


const createSignalMap = async (req, res) => {
    const {error} = validate(req.body);

    if (error) return res.status(400).send(error.details[0].message);

    const {beacons, buildingId, roomId} = req.body;
    let estimatedRoomId;

    for (let i = 0; i < beacons.length; i++) {
        const beacon = await Beacon.findById(beacons[i].beaconId);
        if (!beacon) return res.status(400).send(`Beacon with id ${beacons[i].beaconId} did not exist in database`);
        beacons[i]._id = beacons[i].beaconId;
    }

    let room;
    if (!roomId) {
        // TODO: 
        // if (!buildingId) res.status(400).send("Please provide either roomId or buildingId");

        let signalMaps = await SignalMap.find({isActive: true});
        if (signalMaps.length <= 0) return res.status(400).send("Unable to estimate room when no active signalMaps " +
          "was found in database");

        for (let i = 0; i < signalMaps.length; i++) {
            const room = await Room.findById(signalMaps[i].room);
            if (!room) return res.status(400).send("Room was not defined: " + signalMaps[i].id);

            // TODO: Find solution to narrow for building
            //if (room.building.toString() !== buildingId.toString()) {
            //    signalMaps.splice(i, 1);
            //    i--;
            //}
        }
        const serverBeacons = await Beacon.find(); // {building: buildingId}); Should maybe filter? 
        if (!serverBeacons || serverBeacons.length <= 0)
            return res.status(400).send("Was unable to find any beacons");// ("Was unable to find beacon with building id " + buildingId);

        const beaconIds = [];
        for (let i = 0; i < serverBeacons.length; i++) {
            beaconIds.push(serverBeacons[i]._id);
        }
        estimatedRoomId = await estimateNearestNeighbors(beacons, signalMaps, 3, beaconIds);
        room = await Room.findById(estimatedRoomId);
    } else if (req.user.role < 2){
        if (req.user.role < 1) return res.status(403).send("User should be authorized to post active signalmaps");
        room = await Room.findById(roomId);
        if (!room) return res.status(400).send(`Room with id ${roomId} was not found`);

        if (!req.user.adminOnBuildings.find(elem => room.building.toString() === elem.toString()))
            return res.status(403).send("User was not admin on building containing room " + roomId);

        /*const signalMap = await SignalMap.findOne({room: roomId});
        if (signalMap){
            return res.status(400).send("There is already a signalmap for the given room");
        }*/
    }

    let signalMap = new SignalMap({
        room: roomId || estimatedRoomId,
        beacons,
        isActive: !!roomId
    });

    if (signalMap.isActive)
        signalMap = await signalMap.save();
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
