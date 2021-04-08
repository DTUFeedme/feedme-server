const express = require('express');
const router = express.Router();
const {auth, authorized, admin} = require('../middleware/auth');
const validId = require("../middleware/validateIdParam");
const appFeedbackController = require("../controllers/appFeedbackController");

router.post('/', auth, appFeedbackController.createAppFeedback);

module.exports = router;
