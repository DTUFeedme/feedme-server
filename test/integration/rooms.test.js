const {User} = require('../../models/user');
const {Building} = require('../../models/building');
const {Room} = require('../../models/room');
const {Question} = require('../../models/question');
const {Feedback} = require('../../models/feedback');
const {SignalMap} = require('../../models/signalMap');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../startup/logger');
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

describe('/api/rooms', () => {
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
        user = new User({role: 1, refreshToken: uuidv4()});
        await user.save();
    });
    afterEach(async () => {
        await User.deleteMany();
        await Room.deleteMany();
        await Building.deleteMany();
        await Question.deleteMany();
    });


    describe('POST /', () => {

        let building;
        let location;
        let name;
        let body;
        let token;

        const exec = () => {
            return request(server)
                .post('/api/rooms')
                .set("x-auth-token", token)
                .send({buildingId: building._id, name});
        };

        beforeEach(async () => {
            building = new Building({name: '324'});
            name = '324';


            await building.save();

            token = user.generateAuthToken();
        });

        it("should return 401 if no token provided", async () => {
            token = null;
            const res = await exec();
            expect(res.statusCode).to.equal(401);
        });


        it("Should return 403 if user not authorized with login role >= 1", async () => {
            user.role = 0;
            await user.save();
            const res = await exec();
            expect(res.statusCode).to.equal(403);
        });

        it('should return room with proper building id', async () => {
            try {
                const res = await exec();
                expect(res.body.building).to.equal(building.id);
            } catch (e) {
                logger.error(e.response.text);
                throw e;
            }
        });

        // 400 if random parameter in body is passed
        it('400 if random parameter in body is passed', async () => {
            body = {hej: "12345"};

            try {
                await exec();
            } catch (e) {
                assert.strictEqual(e.status, 400);
            }

        });


        it('should return 400 if name not set', async () => {
            name = null;
            const res = await exec();
            expect(res.statusCode).to.equal(400);
        });

        it("Should return 403 if user not admin on building", async () => {


        });

    });


    describe("GET rooms in building /fromBuilding/:id", () => {
        let building;
        let buildingId;
        let room;
        let token;

        beforeEach(async () => {
            building = new Building({name: '324', admins: [user.id]});
            buildingId = building.id;
            room = new Room({name: "222", location: "123", building: building._id});
            let room2 = new Room({name: "221", location: "456", building: mongoose.Types.ObjectId()});
            token = user.generateAuthToken();
            await building.save();
            await room.save();
            await room2.save();
        });

        const exec = () => {
            return request(server)
                .get('/api/rooms/fromBuilding/' + buildingId)
                .set('x-auth-token', token);
        };

        it("Should only return 1 room", async () => {
            const res = await exec();
            expect(res.body.length).to.equal(1);
        });

        it("Should also work with multiple users being admin on one building", async () => {
            building.admins.push(mongoose.Types.ObjectId());
            await building.save();
            const res = await exec();
            expect(res.body.length).to.equal(1);
        });


        it("Should return 403 if user was not admin on building", async () => {
            building.admins = [];
            await building.save();
            const res = await exec();
            expect(res.statusCode).to.equal(403);
        });
    });

    describe('GET /', () => {
        let building;
        let room;
        let token;
        let query;

        beforeEach(async () => {
            building = new Building({name: '324'});

            room = new Room({name: "222", location: "123", building: building._id});

            user.role = 2;
            token = user.generateAuthToken();
            await building.save();
            await room.save();
            await user.save();
            query = "";
        });
        const exec = () => {
            return request(server)
                .get('/api/rooms/' + query)
                .set('x-auth-token', token);
        };

        it("Should return 403 if no query parsed and user wasn't admin", async () => {
            user.role = 1;
            query = "";
            await user.save();
            const res = await exec();
            expect(res.statusCode).to.equal(403);
        });

        it("Should only return rooms that user has given feedback on, when query parsed", async () => {
            query = "?feedback=me";

            const room = await new Room({name: "222", location: "123", building: building._id}).save();

            await new Feedback({
                room: room.id,
                user: user.id,
                answer: mongoose.Types.ObjectId(),
                question: mongoose.Types.ObjectId()
            }).save();
            const res = await exec();
            expect(res.body.length).to.equal(1);
            expect(res.body[0]._id).to.equal(room.id);
        });

        it("Should only return rooms, that another user is admin on", async () => {
            user.role = 2;
            // const newBuildingId = mongoose.Types.ObjectId();
            const newUser = await new User({
                email: "w@w",
                password: "yo",
                refreshToken: uuidv4()
            }).save();
            const newBuilding = await new Building({name: "heey", admins: [newUser.id]}).save();
            room = await new Room({name: "222", location: "123", building: newBuilding.id}).save();

            query = "?admin=" + newUser.id;
            const res = await exec();
            expect(res.body.length).to.equal(1);
            expect(res.body[0]._id).to.equal(room.id);


        });

        it("Should return 404 if user was not found", async () => {
            query = "?admin=" + mongoose.Types.ObjectId();
            const res = await exec();
            expect(res.statusCode).to.equal(404);
        });
        it("Should return 403 if user tried to get rooms another user is admin on but was not admin himself", async () => {
            user.role = 1;
            await user.save();
            query = "?admin=" + mongoose.Types.ObjectId();
            const res = await exec();
            expect(res.statusCode).to.equal(403);
        });

        it("Should only return rooms where user is admin if query admin=me parsed", async () => {
            building.admins = [user.id];
            await building.save();
            await new Room({
                name: "222",
                location: "123",
                building: mongoose.Types.ObjectId()
            }).save();

            query = "?admin=me";
            const res = await exec();
            expect(res.body.length).to.equal(1);
            expect(res.body[0].building).to.equal(building.id);
        });

        it('should return array with length 2 of rooms when 2 rooms are posted', async () => {
            const room2 = new Room({name: "222", location: "123", building: building._id});
            await room2.save();

            try {
                const res = await exec();
                expect(res.body.length).to.equal(2);
            } catch (e) {
                logger.error(e);
                throw e;
            }
        });

    });

    describe("GET rooms in building /fromBuilding/:id/userCount", () => {
        let token;
        let buildingId;
        let room;

        const exec = () => {
            return request(server)
                .get('/api/rooms/fromBuilding/' + buildingId + "/userCount")
                .set('x-auth-token', token);
        };

        beforeEach(async () => {
            const building = new Building({name: '324', admins: [user.id]});
            buildingId = building.id;
            room = new Room({name: "222", location: "123", building: building._id});
            let room2 = new Room({name: "221", location: "456", building: mongoose.Types.ObjectId()});
            user.currentRoom = room.id;
            user.roomLastUpdated = new Date();
            await user.save();

            token = user.generateAuthToken();
            await building.save();
            await room.save();
            await room2.save();
        });

        it("Should only display rooms from building which user is admin on", async () => {
            const res = await exec();
            expect(res.body.length).to.equal(1);
        })

        it("Should not allow userCount from buildings which user is not admin on", async () => {
            buildingId = mongoose.Types.ObjectId();
            const res = await exec();
            expect(res.statusCode).to.equal(403);

        });

        it("Should return only roomId, room name and user count", async () => {
            const res = await exec();
            const newRoom = res.body[0];

            expect(Object.keys(newRoom).length).to.equal(3);
            expect(newRoom._id).to.equal(room._id.toString());
        });

        it("Should update userCount if more users have set their currentRoom", async () => {
            const user2 = new User({currentRoom: room.id, roomLastUpdated: new Date(), refreshToken: uuidv4()});
            const user3 = new User({currentRoom: room.id, roomLastUpdated: new Date(), refreshToken: uuidv4()});

            await user2.save();
            await user3.save();

            const res = await exec();
            const newRoom = res.body[0];
            expect(newRoom.userCount).to.equal(3);
        });

        it("Should only count users who have updated their room within the last half hour", async () => {
            const oldDate = new Date();
            oldDate.setMinutes(oldDate.getMinutes() - 30);
            const user2 = new User({currentRoom: room.id, roomLastUpdated: oldDate, refreshToken: uuidv4()});
            await user2.save();
            const res = await exec();
            const newRoom = res.body[0];
            expect(newRoom.userCount).to.equal(1);
        });

        it("Should count users who have updated their room within the last half hour", async () => {
            const oldDate = new Date();
            oldDate.setMinutes(oldDate.getMinutes() - 29);
            const user2 = new User({currentRoom: room.id, roomLastUpdated: oldDate, refreshToken: uuidv4()});
            await user2.save();
            const res = await exec();
            const newRoom = res.body[0];
            expect(newRoom.userCount).to.equal(2);
        });

        it("Should only allow authorized user", async () => {
            user.role = 0;
            token = user.generateAuthToken();
            await user.save();
            const res = await exec();
            expect(res.statusCode).to.equal(403);

        })

    });

    describe("DELETE /:id", () => {
        let roomId;
        let token;
        let building;

        beforeEach(async () => {
            building = await new Building({name: "hey", admins: [user.id]}).save();
            const room = await new Room({
                name: "324",
                building: building.id
            }).save();
            roomId = room.id;
            user.role = 1;

            await user.save();

            token = user.generateAuthToken();

        });
        const exec = () => {
            return request(server)
                .delete("/api/rooms/" + roomId)
                .set("x-auth-token", token)
        };

        it("Should return array of length 0 when room deleted", async () => {
            await exec();
            const res = await Room.find();
            expect(res.length).to.equal(0);
        });

        it("403 if user was not admin on building where room exists", async () => {
            building.admins = [];
            await building.save();
            token = user.generateAuthToken();
            const res = await exec();
            expect(res.statusCode).to.equal(403);
        });

        it("Should delete questions that have only reference to deleted room", async () => {
            await new Question({
                value: "hej",
                rooms: roomId,
                answerOptions: [{value: "hej", _id: mongoose.Types.ObjectId()}, {
                    value: "hej",
                    _id: mongoose.Types.ObjectId()
                }]
            }).save();

            await exec();
            const res = await Question.find();
            expect(res.length).to.equal(0);

        });

        it("Should not delete references to other rooms", async () => {
            const question = await new Question({
                value: "hej",
                rooms: [roomId, mongoose.Types.ObjectId()],
                answerOptions: [{value: "hej", _id: mongoose.Types.ObjectId()}, {
                    value: "hej",
                    _id: mongoose.Types.ObjectId()
                }]
            }).save();

            await exec();
            const res = await Question.findById(question.id);
            expect(res.rooms.find(elem => elem.toString() === question.rooms[1].toString())).to.be.ok;
        });

        it("Should delete all signalmaps that references the room", async () => {
            const signalMap = await new SignalMap({
                room: roomId
            }).save();

            let signalMaps = await SignalMap.find({});
            expect(signalMaps.length).to.equal(1);
            await exec();
            signalMaps = await SignalMap.find({});
            expect(signalMaps.length).to.equal(0);
        });

    });
});
