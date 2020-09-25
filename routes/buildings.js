const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const {auth, authorized} = require('../middleware/auth');
const validId = require("../middleware/validateIdParam");
const buildingController = require("../controllers/buildingController");

router.post('/', [auth, authorized], buildingController.createBuilding);

router.get("/:id", [auth, validId], buildingController.getBuilding);

router.get('/', auth, buildingController.getBuildings);

router.delete("/:id", [auth, authorized], buildingController.deleteBuilding);

router.patch("/:id/addBlacklistedDevice", [auth, authorized, validId], buildingController.addBlacklistedDevice);

router.patch("/:id/removeBlacklistedDevice/:deviceId", [auth, authorized, validId], buildingController.removeBlacklistedDevice);

router.get("/:id/blacklistedDevices", [auth, authorized, validId], buildingController.getBlacklistedDevices);

module.exports = router;
