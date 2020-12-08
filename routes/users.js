const express = require('express');
const router = express.Router();
const {auth, authorized, admin} = require("../middleware/auth");
const validId = require("../middleware/validateIdParam");
const userController = require("../controllers/userController");

router.post('/', userController.createUser);

router.get('/', [auth, admin], userController.getUsers);

router.get('/location', [auth], userController.getUsersLocation);

router.get('/:id/location', [auth, authorized, validId], userController.getUserLocation);

router.patch('/makeBuildingAdmin', auth, userController.makeUserAdmin);

module.exports = router;
