const express = require('express');
const {auth, authorized} = require("../middleware/auth");
const router = express.Router();
const validId = require("../middleware/validateIdParam");
const {createSignalMap, confirmRoom, getSignalMaps, deleteFromRoom} = require("../controllers/signalMapController");

router.post('/', [auth], createSignalMap);

router.get('/', auth, getSignalMaps);

router.patch("/confirm-room/:id", [auth, authorized], confirmRoom);

router.delete("/room/:id", [auth, authorized, validId], deleteFromRoom);

module.exports = router;
