const express = require('express');
const router = express.Router();
const {auth} = require("../middleware/auth");
const validId = require("../middleware/validateIdParam");
const userController = require("../controllers/userController");

router.get('/', [auth], async (req, res) => {
    return res.send("f7826da6-4fa2-4e98-8024-bc5b71e0893e");
});


module.exports = router;