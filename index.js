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
const beacons = require('./routes/beacons');
const buildings = require('./routes/buildings');
const auth = require('./routes/auth');
const signalMaps = require('./routes/signalMaps');
const error = require('./middleware/error');
const { createLogger, format, transports } = require('winston');
const morgan = require('morgan');
const bodyParser = require("body-parser");
const endMiddleware = require("./startup/resBodyLogger");
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

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


/*const serviceAccount = require("./feedme-7673a-firebase-adminsdk-680au-0931d5784a.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://feedme-7673a.firebaseio.com"
});

var registrationToken = 'dSN5jeaUixw:APA91bG-XFjVVvgXZQnyzrB9UCi8NI_E8SNLqWPjhFB2IQBDBUYyR86PIvmonXjwuPaxPY6Q2un_ndyGkB0rUNKg7n4z_kz5R9oXJ-UtXrWrBcIOwlch3IBVdyD3J2ihv5hCuGToKndp';

See the "Defining the message payload" section above for details
on how to define a message payload.
var payload = {
    
    data: {
        "volume" : "3.21.15",
        "contents" : "http://www.news-magazine.com/world-week/21659772"
      }
  };
  
  // Set the message as high priority and have it expire after 24 hours.
  var options = {
    priority: 'normal',
    timeToLive: 10
  };
  
  Send a message to the device corresponding to the provided
  registration token with the provided options.
  admin.messaging().sendToDevice(registrationToken, payload, options)
    .then(function(response) {
      console.log('Successfully sent message:', response);
    })
    .catch(function(error) {
      console.log('Error sending message:', error);
    });*/


// Logging
if (process.env.NODE_ENV !== "production") {
    app.use(morgan("dev"));
    app.use(morgan(":reqBody", { immediate: true }));

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
    mongoose.connect(db, { useNewUrlParser: true })
        .then(() => console.log(`Connected to ${db}...`))
        .catch(err => console.log('Could not connect to MongoDB...', err));
}


app.use(endMiddleware);
app.use(express.json());
app.use(baseUrl + 'feedback/', feedback);
app.use(baseUrl + 'users', users);
app.use(baseUrl + 'rooms', rooms);
app.use(baseUrl + 'beacons', beacons);
app.use(baseUrl + 'questions', questions);
app.use(baseUrl + 'buildings', buildings);
app.use(baseUrl + 'auth', auth);
app.use(baseUrl + 'signalMaps', signalMaps);
app.use(baseUrl + 'general', general);
app.use(error);

module.exports = app;
