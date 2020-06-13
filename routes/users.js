const express = require('express');
const router = express.Router();
const {auth, admin} = require("../middleware/auth");
const userController = require("../controllers/userController");

router.post('/', userController.createUser);

router.get('/', [auth, admin], userController.getUsers);

router.get('/location', [auth, admin], userController.getUsersLocation);

router.patch('/makeBuildingAdmin', auth, userController.makeUserAdmin);



module.exports = router;
