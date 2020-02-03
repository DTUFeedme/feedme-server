const express = require('express');
const router = express.Router();
const { Beacon, validate } = require('../models/beacon');
const { Building } = require('../models/building');
const _ = require('lodash');
const {auth, authorized} = require("../middleware/auth");


router.post('/', [auth, authorized], async (req, res) => {

    try {
        await validate(req.body);
    } catch (e) {
        return res.status(400).send(e.message);
    }

    let {buildingId, name, uuid} = req.body;

    const existingBeacon = await Beacon.findOne({uuid});

    if (existingBeacon) return res.status(400).send(`Unique UUID is required. Beacon with uuid ${uuid} already exists`);

    if (req.user.role < 1) return res.status(403).send("Forbidden. User should be authorized");

    const building = await Building.findById(buildingId);
    if (!building) return res.status(404).send('Building with id ' + buildingId + ' was not found');

    const beacon = new Beacon({
        building: buildingId,
        name,
        uuid
    });
    await beacon.save();

    res.send(_.pick(beacon, ["_id", "building", "name", "uuid"]));
});

router.delete("/:id", [auth, authorized], async (req, res) => {

    const user = req.user;


    const beacon = await Beacon.findById(req.params.id);
    if (!beacon) return res.status(404).send("No beacon with id found");

    if (!user.adminOnBuildings.find(elem => elem.toString() === beacon.building.toString()))
        return res.status(403).send("User was not admin on building with beacon");

    await Beacon.deleteOne({_id: req.params.id});

    res.send(beacon);
});

router.get('/', auth, async (req, res) => {
    const query = {};
    if (req.query.building) {
        query.building = req.query.building
    }
    const beacons = await Beacon.find(query).populate("building");
    res.send(beacons);
});

module.exports = router;
