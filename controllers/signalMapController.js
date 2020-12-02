const {SignalMap, validate, roomTypeEstimation} = require("../models/signalMap");
const {Room} = require("../models/room");
const {Building} = require("../models/building");
const {Beacon} = require("../models/beacon");

const createSignalMap = async (req, res) => {
    const {error} = validate(req.body);

    if (error) return res.status(400).send(error.details[0].message);

    const {beacons, roomId} = req.body;
    let roomEstimation;

    let room;
    let certainty;
    let buildingId;
    if (!roomId) {
        const serverBeacons = await Beacon.find({name: {$in: beacons.map(b => b.name)}});
        const filteredBeacons = await Beacon.find({building: {$in: serverBeacons.map(b => b.building)}});

        if (serverBeacons.length <= 0)
            return res.status(400).send("No server beacons were found matching the beacon names in the signal map");

        // const rooms = await Room.find({building: {$in: filteredBeacons.map(fb => fb.building)}});


        let signalMaps = await SignalMap.find({
            isActive: true,
            building: {$in: filteredBeacons.map(fb => fb.building)}
        });

        if (signalMaps.length <= 0) return res.status(400).send("Unable to find any active signalMaps " +
            "in current building");

        roomEstimation = await roomTypeEstimation(beacons, signalMaps, 3, filteredBeacons.map(sb => sb.name));

        room = await Room.findById(roomEstimation.type);
        buildingId = room.building;
        certainty = roomEstimation.certainty;
        const user = req.user;
        const location = {
            room: room.id,
            updatedAt: new Date()
        }
        if (user.locations.length === 1000) {
            user.locations[0] = location;
            user.locations.sort((l1, l2) => l1.updatedAt - l2.updatedAt);
            await user.save();
        } else {
            user.locations.push(location)
            await user.save();
        }

    } else {
        if (req.user.role < 1) return res.status(403).send("User should be authorized to post active signalmaps");
        room = await Room.findById(roomId);
        if (!room) return res.status(400).send(`Room with id ${roomId} was not found`);

        buildingId = room.building;

        const building = await Building.findOne({_id: room.building, admins: {$all: [req.user.id]}});
        if (!building)
            return res.status(403).send("User was not admin on building containing room " + roomId);

        for (let i = 0; i < beacons.length; i++) {
            const beacon = await Beacon.findOne({name: beacons[i].name});
            if (!beacon) {
                await new Beacon({name: beacons[i].name, building: building.id}).save();

                const rooms = await Room.find({building: building.id});

                // Updates all signalmaps to include new beacon with signal value -100
                await SignalMap.updateMany({room: {$in: rooms.map(r => r.id)}}, {
                    $push: {
                        beacons: {
                            name: beacons[i].name,
                            signal: -100
                        }
                    }
                });

            } else if (building.id !== beacon.building.toString())
                return res.status(400).send(`Beacon with name ${beacon.name} was already posted in different building with id ${beacon.building}`);
        }


    }
    let signalMap = new SignalMap({
        room: roomId || roomEstimation.type,
        beacons: beacons,
        isActive: !!roomId,
        building: buildingId
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

const deleteFromRoom = async (req, res) => {
    const user = req.user;
    const roomId = req.params.id;
    const room = await Room.findById(roomId);
    if (!room)
        return res.status(400).send(`Room with id ${roomId} was not found`);

    const building = await Building.findOne({_id: room.building, admins: {$all: [user.id]}});
    if (!building)
        return res.status(403).send(`Building admin rights is required to delete a signal map from room`);

    const result = await SignalMap.deleteMany({room: roomId});

    const signalMaps = await SignalMap.find({building: room.building});
    const beacons = await Beacon.find({building: building.id});
    let foundBeacon = false;

    for (let i = 0; i < beacons.length; i++) {
        for (let j = 0; j < signalMaps.length; j++) {
            if (foundBeacon)
                break;
            const sm = signalMaps[j];

            for (let k = 0; k < sm.beacons.length; k++) {
                if (sm.beacons[k].name === beacons[i].name) {
                    foundBeacon = true;
                    break;
                }
            }
        }

        if (!foundBeacon)
            await beacons[i].remove()

        foundBeacon = false;
    }
    // Building set with all beacons with reference from signalMaps.
    // const beaconsWithReferences = new Set();
    // signalMaps.forEach(sm => {
    //     sm.beacons.forEach(b => beaconsWithReferences.add(b.name));
    // });
    // // Then deleting all beacons not in the set
    // await Beacon.deleteMany({name: {$nin: Array.from(beaconsWithReferences)}});

    res.send(result);
};

module.exports.createSignalMap = createSignalMap;
module.exports.confirmRoom = confirmRoom;
module.exports.getSignalMaps = getSignalMaps;
module.exports.deleteFromRoom = deleteFromRoom;
