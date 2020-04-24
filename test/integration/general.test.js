const {User} = require('../../models/user');
const {Building} = require('../../models/building');
const {Room} = require('../../models/room');
const {Question} = require('../../models/question');
const {Feedback} = require('../../models/feedback');
const {SignalMap} = require('../../models/signalMap');
const config = require('config');
const app = require('../..');
let assert = require('assert');
const request = require('supertest');
let server;
const mongoose = require('mongoose');
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const expect = require('chai').expect;

describe("/api/general/", () => {
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
        user = new User({role: 2});
        await user.save();
    });
    afterEach(async () => {
        await User.deleteMany();
        await Room.deleteMany();
        await Building.deleteMany();
        await Question.deleteMany();
    });

    describe("/ DELETE", () => {

        const exec = () => request(server)
          .delete("/api/general")
          .set("x-auth-token", token);


        beforeEach(async () => {
            token = user.generateAuthToken();
        });

        it("Should delete everything", async () => {
            await new Room({
                name: "hej",
                building: mongoose.Types.ObjectId()
            }).save();
            await new Room({
                name: "hej",
                building: mongoose.Types.ObjectId()
            }).save();
            await new Building({name: "heey"}).save();
            await new Building({name: "heey"}).save();
            await new Building({name: "heey"}).save();
            let rooms = await Room.countDocuments({});
            let buildings = await Building.countDocuments({});
            expect(rooms).to.equal(2);
            expect(buildings).to.equal(3);
            await exec();
            rooms = await Room.countDocuments({});
            buildings = await Building.countDocuments({});
            expect(rooms).to.equal(0);
            expect(buildings).to.equal(0);
        });

        it("Should not be possible for user role 1 to delete db", async () => {
            user.role = 1;
            token = user.generateAuthToken();
            await user.save();

            const res = await exec();
expect(res.statusCode).to.equal(403);
        });

        it("Should not be possible for user role 0 to delete db", async () => {
            user.role = 0;
            token = user.generateAuthToken();
            await user.save();

            const res = await exec();
expect(res.statusCode).to.equal(403);
        });

        it("Should not delete admins ", async () => {
            user.role = 2;
            await user.save();
            await new User({role: 1}).save();
            await exec();
            const userAmount = await User.countDocuments({});
            expect(userAmount).to.equal(1);
        });
    });

});
