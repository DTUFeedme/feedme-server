const {User} = require('../../models/user');
const {Building} = require('../../models/building');
const {Room} = require('../../models/room');
const {Feedback} = require('../../models/feedback');
const request = require('supertest');
const assert = require('assert');
const mongoose = require('mongoose');
const app = require('../..');
const config = require('config');
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const {Question} = require("../../models/question");
chai.use(chaiAsPromised);
const {v4: uuidv4} = require('uuid');
const expect = require("chai").expect;
let server;

describe('/api/buildings', () => {
    let user;

    before(async () => {
        server = app.listen(config.get('port'));
        await mongoose.connect(config.get('db'), {useNewUrlParser: true, useUnifiedTopology: true});
    });
    after(async () => {
        await server.close();
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        user = new User({refreshToken: uuidv4()});
        await user.save();
    });
    afterEach(async () => {
        await User.deleteMany();
        await Building.deleteMany();
        await Room.deleteMany();
    });

    describe('POST /', () => {

        let buildingName;
        let token;

        const exec = () => {
            return request(server)
                .post('/api/buildings')
                .set('x-auth-token', token)
                .send({name: buildingName});
        };


        beforeEach(async () => {
            buildingName = '324';
            user.role = 1;
            await user.save();
            token = user.generateAuthToken();
        });

        afterEach(async () => {
            await server.close();
        });


        it('401 if json token not provided in header', async () => {
            token = null;
            const res = await exec();
            expect(res.statusCode).to.equal(401);
        });

        it('400 if name not provided', async () => {
            buildingName = null;
            const res = await exec();
            expect(res.statusCode).to.equal(400);
        });

        it('should have user as admin on newly posted building', async () => {
            assert.strictEqual(user.adminOnBuilding, undefined);
            const res = await exec();
            const newUser = await User.findById(user._id);

            expect(newUser.adminOnBuildings.find(elem => elem.toString() === res.body._id)).to.be.ok;
            // assert.strictEqual(newUser.adminOnBuilding.toString(), res.body._id);
        });

        it("should return 403 if user not authorized with login role >= 1", async () => {
            user.role = 0;
            await user.save();
            const res = await exec();
            expect(res.statusCode).to.equal(403);
        });

    });

    describe("DELETE /:id", () => {
        let building;
        let buildingId;
        let token;

        beforeEach(async () => {
            building = new Building({name: "324"});
            buildingId = building.id;
            user.adminOnBuildings = [buildingId];
            user.role = 1;
            await user.save();
            token = user.generateAuthToken();

            await building.save();
        });

        const exec = () => {
            return request(server)
                .delete("/api/buildings/" + buildingId)
                .set("x-auth-token", token);
        };

        it("Should return empty array of buildings after building was deleted", async () => {
            await exec();
            const buildings = await Building.find();
            expect(buildings.length).to.equal(0);
        });

        it("Should also delete all rooms in that building", async () => {
            const room = await new Room({
                name: "324",
                building: buildingId
            }).save();

            await exec();
            const result = await Room.findById(room.id);
            expect(result).to.not.be.ok
        });
        it("Should delete reference to room for questions posted in that building", async () => {

            const room = await new Room({
                name: "324",
                building: buildingId
            }).save();
            const question = await new Question({
                value: "whats up",
                answerOptions: [{
                    value: "not much",
                    _id: mongoose.Types.ObjectId()
                }
                    , {
                        _id: mongoose.Types.ObjectId(),
                        value: "I'm fine, thanks"
                    }],
                rooms: [room.id]
            }).save();

            await exec();
            const result = await Question.findById(question.id);
            expect(result).to.not.be.ok;
        });

        it("Should not delete questions posted in other buildings", async () => {

            const room = await new Room({
                name: "324",
                building: mongoose.Types.ObjectId()
            }).save();
            const question = await new Question({
                value: "whats up",
                answerOptions: [{
                    value: "not much",
                    _id: mongoose.Types.ObjectId()
                }
                    , {
                        _id: mongoose.Types.ObjectId(),
                        value: "I'm fine, thanks"
                    }],
                rooms: [room.id]
            }).save();

            await exec();
            const result = await Question.findById(question.id);
            expect(result).to.be.ok;
        });

        it("Should still have room that does not belong to the deleted building", async () => {
            const room = await new Room({
                name: "324",
                building: mongoose.Types.ObjectId()
            }).save();

            await exec();
            const result = await Room.findById(room.id);
            expect(result).to.be.ok
        });

        it("Should return 403 if user was not admin on the building", async () => {
            user.adminOnBuildings = [];
            await user.save();
            const res = await exec();
            expect(res.statusCode).to.equal(403);
        });

    });

    describe("GET /:id", () => {
        let building;
        let buildingId;
        let room;
        let token;
        let roomId;
        let query;

        beforeEach(async () => {
            building = new Building({name: "324"});
            buildingId = building.id;
            room = new Room({name: "hej", location: "hej", building: buildingId});
            roomId = room.id;
            query = "";
            token = user.generateAuthToken();
            await building.save();
            await room.save();
        });

        const exec = () => {
            return request(server)
                .get("/api/buildings/" + buildingId + "/" + query)
                .set("x-auth-token", token);
        };

        it("Should return only one building", async () => {
            let building = new Building({name: "322"});
            await building.save();
            const res = await exec();
            expect(res.body.name).to.equal("324");
        });

        it("Should return 404 if building was not found", async () => {
            buildingId = mongoose.Types.ObjectId();
            const res = await exec();
            expect(res.statusCode).to.equal(404);
        });

        it("Should return feedbackCount if withFeedbackCount query set", async () => {
            query = "?withFeedbackCount=true";
            const res = await exec();
            expect(res.body.feedbackCount).to.equal(0);
        });

        it("Should set correct feedbackCount", async () => {
            query = "?withFeedbackCount=true";
            const room = await new Room({
                name: "hej",
                building: buildingId
            }).save();

            await new Feedback({
                answer: mongoose.Types.ObjectId(),
                question: mongoose.Types.ObjectId(),
                user: mongoose.Types.ObjectId(),
                room: room.id
            }).save();


            const res = await exec();
            expect(res.body.feedbackCount).to.equal(1);
        });

    });

    describe("Get /", () => {

        let building;
        let buildingId;
        let room;
        let token;
        let roomId;
        let query;

        beforeEach(async () => {
            building = new Building({name: "324"});
            buildingId = building.id;
            room = new Room({name: "hej", location: "hej", building: buildingId});
            roomId = room.id;
            user.adminOnBuildings = [buildingId];
            token = user.generateAuthToken();

            query = "";
            await building.save();
            await room.save();
            await user.save();
        });

        const exec = () => {
            return request(server)
                .get("/api/buildings/" + query)
                .set("x-auth-token", token);
        };

        it("Should return building with room", async () => {
            query = "?admin=me";
            const res = await exec();
            expect(res.body[0].rooms[0]._id).to.equal(roomId);
        });


        it("Should return array with rooms", async () => {
            query = "?admin=me";
            let room2 = new Room({name: "hej", location: "hej", building: buildingId});
            let room3 = new Room({name: "hej", location: "hej", building: mongoose.Types.ObjectId()});
            await room2.save();
            await room3.save();
            const res = await exec();
            expect(res.body[0].rooms.length).to.equal(2);
        });

        it("Should only return buildings that requesting user is admin on when query set", async () => {
            query = "?admin=me";

            const b1 = await new Building({name: "hej"}).save();
            const b2 = await new Building({name: "hej"}).save();
            user.adminOnBuildings = [b1.id, b2.id];

            await user.save();

            const res = await exec();
            expect(res.body.length).is.equal(2);
        });

        it("Should return 403 if user was not admin but tried to get all buildings", async () => {
            const res = await exec();
            expect(res.statusCode).to.equal(403);
        });

        it("Should get all buildings when user was admin and did not set any query parameter", async () => {

            user.role = 2;
            token = user.generateAuthToken();
            await user.save();
            await new Building({name: "hej"}).save();
            await new Building({name: "hej"}).save();

            const res = await exec();
            expect(res.body.length).to.equal(3);
        });

        it("Should return 403 if non admin user tries to get buildings from where feedback from " +
            "a different user was given", async () => {
            const feedback = await new Feedback({
                question: mongoose.Types.ObjectId(),
                answer: mongoose.Types.ObjectId(),
                user: mongoose.Types.ObjectId(),
                room: roomId
            }).save();

            await new Building({name: "hej"}).save();

            query = "?feedback=" + feedback.user;

            const res = await exec();
            expect(res.statusCode).to.equal(403);
        });

        it("Should return buildings where another user has given feedback ", async () => {


            const building = await new Building({name: "hej"}).save();
            const room = await new Room({
                name: "222",
                building: building.id
            }).save();

            const newUser = await new User({
                email: "w@w",
                password: "qweQWE123",
                role: 1,
                refreshToken: uuidv4()
            }).save();
            await new Feedback({
                question: mongoose.Types.ObjectId(),
                answer: mongoose.Types.ObjectId(),
                user: newUser.id,
                room: room.id
            }).save();


            user.role = 2;
            await user.save();
            query = "?feedback=" + newUser.id;
            const res = await exec();
            expect(res.body.length).to.equal(1);
            expect(res.body[0]._id).to.equal(building.id);

        });


        it("Should get buildings where feedback was given", async () => {
            await new Feedback({
                question: mongoose.Types.ObjectId(),
                answer: mongoose.Types.ObjectId(),
                user: user.id,
                room: roomId
            }).save();

            await new Building({name: "hej"}).save();

            query = "?feedback=me";
            const res = await exec();
            expect(res.body.length).to.equal(1);

        });

        it("Should get building from another admin when proper query parsed", async () => {
            user.role = 2;

            const b1 = await new Building({name: "hej"}).save();
            const b2 = await new Building({name: "hej"}).save();

            const newUser = await new User({
                email: "q@q",
                password: "qweQWE123",
                adminOnBuildings: [b1.id, b2.id],
                refreshToken: uuidv4()
            }).save();

            query = "?admin=" + newUser.id;
            token = user.generateAuthToken();
            await user.save();

            const res = await exec();
            expect(res.body[0]._id).to.equal(b1.id);
        });

    });

    describe("PATCH /:buildingId/addBlacklistedDevice", () => {
        let building;
        let buildingId;
        let token;
        let deviceName;

        beforeEach(async () => {
            building = new Building({name: "324"});
            buildingId = building.id;
            user.adminOnBuildings = [buildingId];
            user.role = 1;
            token = user.generateAuthToken();
            deviceName = "bluetoothspeaker";

            await building.save();
            await user.save();
        });

        const exec = () => {
            return request(server)
                .patch("/api/buildings/" + buildingId + "/addBlacklistedDevice")
                .set("x-auth-token", token)
                .send({deviceName});
        };

        it("Should update building with new blacklisted device", async () => {
            await exec();

            const building = await Building.findById(buildingId);
            console.log(building);
            const blacklistedDevices = building.blacklistedDevices;

            expect(blacklistedDevices[0]).to.equal(deviceName);
        });

        it("Should return 400 if no device name provided", async () => {
            deviceName = undefined;
            const res = await exec();
            expect(res.statusCode).to.equal(400);
        });

        it("Should return 403 if user was not admin on building", async () => {
            user.adminOnBuildings = [];
            await user.save();
            const res = await exec();
            expect(res.statusCode).to.equal(403);
        });

        it("Should return 404 if building wasn't found", async () => {
            buildingId = mongoose.Types.ObjectId();
            user.adminOnBuildings = [buildingId];
            await user.save()

            const res = await exec();
            expect(res.statusCode).to.equal(404);
        });

    });

    describe("PATCH /:buildingId/removeBlacklistedDevice/:deviceName", () => {
        let building;
        let buildingId;
        let token;
        let deviceName;

        beforeEach(async () => {
            deviceName = "bluetoothspeaker";
            building = new Building({name: "324", blacklistedDevices: [deviceName]});
            buildingId = building.id;
            user.adminOnBuildings = [buildingId];
            user.role = 1;
            token = user.generateAuthToken();

            await building.save();
            await user.save();
        });

        const exec = () => {
            return request(server)
                .patch("/api/buildings/" + buildingId + "/removeBlacklistedDevice/" + deviceName)
                .set("x-auth-token", token);
        };

        it("Should return 403 if user not authorized", async () => {
            user.role = 0;
            await user.save();
            const res = await exec();

            expect(res.statusCode).to.equal(403);
        });

        it("Should remove device from buildings list", async () => {
            building.blacklistedDevices.push("heeey");
            await building.save();
            await exec();
            const updatedBuilding = await Building.findById(buildingId);
            const blacklist = updatedBuilding.blacklistedDevices;

            console.log(blacklist);
            expect(blacklist.length).to.equal(1);
        });

        it("Should return number of devices deleted", async () => {

            const res = await exec();

            expect(res.body.deleted).to.equal(1);
        });

        it("Should return 0 devices deleted if device was not present in building blacklist", async () => {
            deviceName = "not-found";
            const res = await exec();

            expect(res.body.deleted).to.equal(0);
        });

        it("Should return 404 if building not found", async () => {
            buildingId = mongoose.Types.ObjectId();

            const res = await exec();
            expect(res.statusCode).to.equal(404);
        });
    });

    describe("GET /:buildingId/blacklistedDevices", () => {

        let building;
        let buildingId;
        let token;
        let deviceName;

        beforeEach(async () => {
            deviceName = "bluetoothspeaker";
            building = new Building({name: "324", blacklistedDevices: [deviceName]});
            buildingId = building.id;
            user.adminOnBuildings = [buildingId];
            user.role = 1;
            token = user.generateAuthToken();

            await building.save();
            await user.save();
        });

        const exec = () => {
            return request(server)
                .get("/api/buildings/" + buildingId + "/blacklistedDevices" )
                .set("x-auth-token", token);
        };

        it("Should return 403 if user was not admin on building ", async () => {
            user.adminOnBuildings = [];

            await user.save();
            const res = await exec();

            expect(res.statusCode).to.equal(403);

        });

        it("Should return list with blacklisted devices", async () => {
            const res = await exec();

            expect(res.body[0]).to.equal(deviceName);

        });

    });
});
