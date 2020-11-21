require('express-async-errors');
require('dotenv').config();
const config = require('config');
const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const express = require('express');
const app = express();
const feedback = require('./routes/feedback');
const mongoose = require('mongoose');
const users = require('./routes/users');
const rooms = require('./routes/rooms');
const general = require('./routes/general');
const questions = require('./routes/questions');
const buildings = require('./routes/buildings');
const beacons = require('./routes/beacons');
const auth = require('./routes/auth');
const signalMaps = require('./routes/signalMaps');
const error = require('./middleware/error');
const morgan = require('morgan');
const bodyParser = require("body-parser");
const endMiddleware = require("./startup/resBodyLogger");

// To disable CORS
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-auth-token, roomId");
    res.header("Access-Control-Expose-Headers", "x-auth-token, roomId");
    res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, PATCH, OPTIONS');
    next();
});

app.use(bodyParser.json());

morgan.token("reqBody", (req) => `Req body: ${JSON.stringify(req.body)}`);

const port = config.get('port') || 80;
const baseUrl = config.get("base-url") || "/api/";

const logger = require("./startup/logger");

logger.streamError = {
    write: function (message) {
        logger.error(message);
    }
};
logger.streamInfo = {
    write: function (message) {
        logger.info(message);
    }
};

// Logging
if (process.env.NODE_ENV !== "production") {
    app.use(morgan("dev"));
    app.use(morgan(":reqBody", {immediate: true}));

    app.use(morgan(":reqBody", {
        stream: logger.streamError,
        skip: (req, res) => res.statusCode < 400
    }));
    app.use(morgan(":date[clf] :method :url :status :response-time ms - :res[content-length]", {
        stream: logger.streamError,
        skip: (req, res) => res.statusCode < 400
    }));

} else {
    app.use(morgan("dev"));
    app.use(morgan(":reqBody", {
        stream: logger.streamError,
        skip: (req, res) => res.statusCode < 400 ||
            req.originalUrl.includes("/users/") ||
            req.originalUrl.includes("/auth/")
        // To avoid logging sensitive info
    }));
    app.use(morgan("PROD: :date[clf] :method :url :status :response-time ms - :res[content-length]", {
        stream: logger.streamError,
        skip: (req, res) => res.statusCode < 400
    }));
}

if (!process.env.jwtPrivateKey) {
    logger.error("FATAL ERROR: jwtPrivateKey not set");
    process.exit(1);
}

if (process.env.NODE_ENV !== 'test') {
    app.listen(port, () => console.log(`Listening on port ${port}...`));
    const db = config.get('db');
    mongoose.connect(db, {useNewUrlParser: true, useUnifiedTopology: true})
        .then(() => console.log(`Connected to ${db}...`))
        .catch(err => console.log('Could not connect to MongoDB...', err));
}


app.use(endMiddleware);
app.use(express.json());
app.use(baseUrl + 'feedback/', feedback);
app.use(baseUrl + 'users', users);
app.use(baseUrl + 'rooms', rooms);
app.use(baseUrl + 'questions', questions);
app.use(baseUrl + 'buildings', buildings);
app.use(baseUrl + 'auth', auth);
app.use(baseUrl + 'signalMaps', signalMaps);
app.use(baseUrl + 'general', general);
app.use(baseUrl + 'beacons', beacons);
app.use(error);

module.exports = app;
