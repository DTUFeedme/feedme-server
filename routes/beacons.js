const express = require('express');
const router = express.Router();
const {auth, authorized, admin} = require('../middleware/auth');
const validId = require("../middleware/validateIdParam");
const beaconController = require("../controllers/beaconController");

router.post('/', [auth, authorized], beaconController.createBeacon);

router.get("/uuid", [auth], beaconController.getUuid);

router.get("/:id", [auth, validId], beaconController.getBeacon);

router.get('/', [auth], beaconController.getBeacons);

router.delete("/:id", [auth, authorized], beaconController.deleteBeacon);

module.exports = router;
