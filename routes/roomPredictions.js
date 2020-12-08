const express = require('express');
const router = express.Router();
const {auth, authorized, admin} = require("../middleware/auth");
const validId = require("../middleware/validateIdParam");
const roomPredictionController = require("../controllers/roomPredictionController");

router.get('/', [auth, authorized], roomPredictionController.getRoomPredictions);

router.post('/', [auth], roomPredictionController.addRoomPrediction);

router.delete('/:id', [auth, authorized, admin, validId], roomPredictionController.deleteRoomPrediction);

module.exports = router;
