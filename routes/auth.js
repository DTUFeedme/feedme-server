const express = require('express');
const {validateAuthorized} = require("../models/user");
const bcrypt = require("bcryptjs");
const {User} = require("../models/user");
const router = express.Router();
const {authExpired} = require("../middleware/auth");
const { v4: uuidv4 , validate} = require('uuid');

const FAIL_AUTH_TEXT = "Invalid email or password";

router.post("/", async (req, res) => {
    const {error} = validateAuthorized(req.body);
    if (error) return res.status(400).send(error.message);

    const {email, password} = req.body;

    const user = await User.findOne({email});
    if (!user) return res.status(400).send(FAIL_AUTH_TEXT);

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).send(FAIL_AUTH_TEXT);

    const token = user.generateAuthToken();
    const refreshToken = uuidv4();

    user.refreshToken = refreshToken;
    await user.save();

    res.header("x-auth-token", token).send({refreshToken});
});

router.post("/refresh", authExpired, async (req, res) => {
    const {refreshToken} = req.body;
    const user = req.user;

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    if (user.role > 0 && oneMonthAgo > user.updatedAt)
        return res.status(401).send("User was last active more than one month ago, and needs to log in again");

    if (!refreshToken) return res.status(400).send("No refreshToken provided");
    if (!validate(refreshToken)) return res.status(400).send(`Refresh token ${refreshToken} did not have a valid uuid format`);
    if (user.refreshToken !== refreshToken) return res.status(401).send(`Refresh token ${refreshToken} did not match user`);

    const newRefreshToken = uuidv4();
    user.refreshToken = newRefreshToken;
    await user.save();
    const newToken = user.generateAuthToken();

    res.header("x-auth-token", newToken).send({refreshToken: newRefreshToken});
});

module.exports = router;
