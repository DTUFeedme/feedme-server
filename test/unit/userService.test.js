const StatusError = require("../../errors/statusError");
const {createUser} = require("../../controllers/userController");
const {User} = require('../../models/user');
const request = require('supertest');
const app = require('../..');
let server;
const config = require('config');
const mongoose = require('mongoose');
const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-as-promised'));


describe('Should throw error', () => {
    let user;
    let token;

    before(async () => {
        server = app.listen(config.get('port'));
        await mongoose.connect(config.get('db'), {useNewUrlParser: true, useUnifiedTopology: true});
    });
    after(async () => {
        await server.close();
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        user = new User();
        token = user.generateAuthToken();
        await user.save();
    });
    afterEach(async () => {
        await User.deleteMany();
    });

    const exec = () => {
        return request(server)
          .post("/api/users" )
          .send({email: "hej", password: "yo"});
    };

});
