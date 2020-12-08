const {User} = require('../../models/user');
const {SignalMap} = require('../../models/signalMap');
const {Building} = require('../../models/building');
const {Beacon} = require('../../models/beacon');
const {Room} = require('../../models/room');
const request = require('supertest');
let assert = require('assert');
const app = require('../..');
let server;
const config = require('config');
const mongoose = require('mongoose');
const jwt = require("jsonwebtoken");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const expect = chai.expect;
chai.should();
const {v4: uuidv4, validate} = require('uuid');

describe('/api/users', () => {
    let user;
    let token;
    let refreshToken

    before(async () => {
        server = app.listen(config.get('port'));
        await mongoose.connect(config.get('db'), {useNewUrlParser: true, useUnifiedTopology: true});
    });
    after(async () => {
        await server.close();
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        refreshToken = uuidv4();
        user = new User({refreshToken});
        token = user.generateAuthToken();
        await user.save();
    });
    afterEach(async () => {
        await User.deleteMany();
        await SignalMap.deleteMany();
        await Room.deleteMany();
        await Building.deleteMany();
        await Beacon.deleteMany();
    });

    describe("GET /", () => {
        let query;
        const exec = () => {
            return request(server)
                .get("/api/users" + query)
                .set('x-auth-token', token);
        };

        beforeEach(async () => {
            user = new User({
                email: "hej",
                password: "yo",
                role: 2,
                refreshToken: uuidv4()
            });
            token = user.generateAuthToken();
            await user.save();
            query = "";
        });

        it("Should not return password", async () => {

            const res = await exec();
            const users = res.body;
            const password = users.find((elem) => elem._id === user.id).password;
            expect(password).to.not.be.ok;
        });

        it("Should return 403 if user was not admin", async () => {
            user.role = 1;
            await user.save();
            const res = await exec();
            expect(res.statusCode).to.equal(403);
        });

        it("Should not update updatedAt", async () => {
            const now = new Date();
            await exec();
            const foundUser = await User.findById(user.id);
            expect(now > foundUser.updatedAt).to.be.ok;
        });

        it("Should return 401 if token not provided", async () => {
            token = null;
            const res = await exec();
            expect(res.statusCode).to.equal(401);
        });

    });

    describe("GET /location", () => {
        let roomId;
        let buildingId;
        let beaconName;
        const exec = () => {
            return request(server)
                .get("/api/users/location")
                .set('x-auth-token', token);
        };

        beforeEach(async () => {
            const building = new Building({name: "hey"});
            buildingId = building.id;
            const room = new Room({building: buildingId, name: "hey"});
            roomId = room.id;
            beaconName = "random name";

            user = new User({
                locations: [{room: roomId, updatedAt: new Date()}],
                role: 2,
                refreshToken: uuidv4()
            });
            token = user.generateAuthToken();
            await user.save();
            await building.save();
            await room.save();
        });

        it("Should return a list of users with proper length", async () => {
            const res = await exec();
            expect(res.body.length).to.equal(2);
        });

        it("Should return only user id and locations array", async () => {
            const res = await exec();
            const fetchedUser = res.body.find(e => e._id === user.id);

            expect(Object.keys(fetchedUser).length).to.equal(2);
        });

        it("Should update user's location after posting signalmap", async () => {
            await new Beacon({name: beaconName, building: buildingId}).save();
            await new Beacon({name: "hej", building: buildingId}).save();
            await new SignalMap({
                building: buildingId,
                beacons: [{name: beaconName, signal: -10}],
                room: roomId, isActive: true
            }).save();

            user.locations = [];
            await user.save();
            await request(server).post("/api/signalmaps/").set("x-auth-token", token).send({
                beacons: [{name: "hej", signal: -10}],
            });

            const res = await exec();
            const updatedUser = res.body.find(u => u._id === user.id);
            expect(updatedUser.locations[0].room).to.equal(roomId);
        });

        it("Should return list of locations with room id and time updated", async () => {
            const res = await exec();

            const updatedUser = res.body.find(u => u._id === user.id);
            expect(updatedUser.locations.length).to.equal(1);
        });

        it("Should not be allowed if user is not admin or Davide", async () => {
            user.role = 1;
            token = user.generateAuthToken();
            user.email = "not@davide.dk";
            await user.save();

            const res = await exec();
            expect(res.statusCode).to.equal(403);
        });

        it("Should be allowed if user has email address of davide", async () => {
            user.role = 1;
            user.email = "dcal@dtu.dk";
            await user.save();

            const res = await exec();
            expect(res.statusCode).to.equal(200);
        });
    });

    describe("GET /:userId/location", () => {
        let roomId;
        let buildingId;
        let beaconName;
        let userId;
        const exec = () => {
            return request(server)
                .get("/api/users/" + userId + "/location")
                .set('x-auth-token', token);
        };

        beforeEach(async () => {
            const building = new Building({name: "hey"});
            buildingId = building.id;
            const room = new Room({building: buildingId, name: "hey"});
            roomId = room.id;
            beaconName = "random name";

            user = new User({
                locations: [{room: roomId, updatedAt: new Date()}],
                role: 2,
                refreshToken: uuidv4()
            });
            userId = user.id
            token = user.generateAuthToken();
            await user.save();
            await building.save();
            await room.save();
        });

        it("Should return a user object with list of user locations", async () => {

            const res = await exec();

            expect(res.body.locations.length).to.equal(1);
        });

        it("Should return only user id and locations array", async () => {
            const res = await exec();
            //const fetchedUser = res.body.find(e => e._id === user.id);

            expect(Object.keys(res.body).length).to.equal(2);
        });

        it("Should update user's location after posting signalmap", async () => {
            await new Beacon({name: beaconName, building: buildingId}).save();
            await new Beacon({name: "hej", building: buildingId}).save();
            await new SignalMap({
                building: buildingId,
                beacons: [{name: beaconName, signal: -10}],
                room: roomId, isActive: true
            }).save();

            user.locations = [];
            await user.save();
            await request(server).post("/api/signalmaps/").set("x-auth-token", token).send({
                beacons: [{name: "hej", signal: -10}],
            });

            const res = await exec();
            expect(res.body.locations[0].room).to.equal(roomId);
        });

        it("Should return list of locations with room id and time updated", async () => {
            const res = await exec();

            //const updatedUser = res.body.find(u => u._id === user.id);
            expect(res.body.locations.length).to.equal(1);
        });

        it("Should not be allowed if user is not admin or Davide", async () => {
            user.role = 1;
            token = user.generateAuthToken();
            user.email = "not@davide.dk";
            await user.save();

            const res = await exec();
            expect(res.statusCode).to.equal(403);
        });

        it("Should be allowed if user has email address of davide", async () => {
            user.role = 1;
            user.email = "dcal@dtu.dk";
            await user.save();

            const res = await exec();
            expect(res.statusCode).to.equal(200);
        });


    });

    describe('POST /', () => {

        describe("Unauthorized user", () => {
            let body;
            beforeEach(() => {
                body = {};
            });

            const exec = () => {
                return request(server)
                    .post("/api/users")
                    .send(body);
            };

            // 400 if random parameter in body is passed
            it('400 if  random parameter in body is passed', async () => {
                body = {hej: "12345"};
                const res = await exec();
                expect(res.statusCode).to.equal(400);
            });

            it("Should have user role 0 when no email+password provided", async () => {
                const res = await exec();
                const decoded = jwt.decode(res.header["x-auth-token"]);
                const user = await User.findById(decoded._id);
                assert.strictEqual(user.role, 0);
            });

            it("Should be a valid mongoose id decoded by returned json web token", async () => {
                const res = await exec();
                const decoded = jwt.decode(res.header["x-auth-token"]);
                assert.strictEqual(mongoose.Types.ObjectId.isValid(decoded._id), true);
            });

            it("Should add refreshtoken upon login", async () => {
                await exec();
                const updatedUser = await User.findById(user.id);
                expect(updatedUser.refreshToken).to.be.ok;
            });

            it("Should return valid refreshtoken upon login", async () => {
                const res = await exec();
                expect(validate(res.body.refreshToken)).to.be.ok;
            });
        });

        describe("Authorized user", () => {
            let email;
            let password;

            beforeEach(async () => {
                email = "user1@gmail.com";
                password = "qweQWE123";
            });

            afterEach(async () => {
                await User.deleteMany();
            });

            const exec = () => {
                return request(server)
                    .post('/api/users')
                    .send({email, password});
            };

            it("Should create user with authorized role if valid email and password provided", async () => {
                try {
                    await exec();
                } catch (e) {
                    console.log(e);
                }

                const user = await User.findOne({email});

                assert.strictEqual(user.role, 1);
            });

            it("should return 400 if email invalid", async () => {
                email = "user@";
                const res = await exec();
                expect(res.statusCode).to.equal(400);
            });

            it("Should not allow two users to be created with the same email", async () => {
                await exec();
                const res = await exec();
                expect(res.statusCode).to.equal(400);
            });

            it("Should return json web token in header that can be decoded to valid mongoose _id", async () => {
                const res = await exec();
                const decodedToken = jwt.decode(res.headers["x-auth-token"]);
                expect(mongoose.Types.ObjectId.isValid(decodedToken._id)).to.be.true;
            });

            it("Should add a refresh token to user upon login", async () => {
                await exec();

                const updatedUser = await User.findById(user.id);
                expect(updatedUser.refreshToken).to.be.ok;
            });

            it("Should return valid refresh token upon login", async () => {
                const res = await exec();
                expect(validate(res.body.refreshToken)).to.be.ok;
            });

        });
    });

    describe("PATCH /makeBuildingAdmin", () => {
        let newUser;
        let email;
        let building;
        let buildingId;

        beforeEach(async () => {
            user = await new User({
                email: "hej",
                password: "yo",
                role: 1,
                refreshToken: uuidv4()
            }).save();
            building = await new Building({name: "324", admins: [user.id]}).save();

            buildingId = building.id;

            newUser = await new User({
                email: "hej@hej.dk",
                password: "yo",
                role: 1,
                refreshToken: uuidv4()
            }).save();
            email = newUser.email;
            token = user.generateAuthToken();
        });

        const exec = () => {
            return request(server)
                .patch("/api/users/makeBuildingAdmin")
                .set('x-auth-token', token)
                .send({
                    email,
                    buildingId
                });
        };

        it("Should return 400 if user was not admin on building", async () => {
            building.admins = [];
            await building.save();

            const res = await exec();
            expect(res.statusCode).to.equal(400);
        });

        it("Should return 401 if no token provided", async () => {
            token = null;
            const res = await exec();
            expect(res.statusCode).to.equal(401);
        });

        it("Should update building with user admin", async () => {
            await exec();
            const newBuilding = await Building.findById(building.id);
            expect(newBuilding.admins[0].toString()).to.equal(user.id);
        });

        it("Should not be allowed to make user admin who is already an admin", async () => {
            await exec();

            const res = await exec();
            expect(res.statusCode).to.equal(400);
        });

    });


});
