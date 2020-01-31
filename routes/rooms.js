const express = require('express');
const {auth, authorized} = require("../middleware/auth");
const validId = require("../middleware/validateIdParam");
const {deleteRoom, createRoom, getRooms, getRoomsFromBuilding} = require("../controllers/roomController");
const router = express.Router();


router.post('/', [auth, authorized], createRoom);

router.get('/', [auth, authorized], getRooms);

router.get("/fromBuilding/:id", auth, getRoomsFromBuilding);

router.delete("/:id", [auth, validId], deleteRoom);

module.exports = router;
