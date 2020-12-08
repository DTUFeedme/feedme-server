const {User} = require('../../models/user');
const {SignalMap} = require('../../models/signalMap');
const {Building} = require('../../models/building');
const {Beacon} = require('../../models/beacon');
const {Room} = require('../../models/room');
const {RoomPrediction} = require('../../models/roomPrediction');
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

describe('/api/wrongRooms', () => {
    let user;
    let token;
    let refreshToken;

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
        user = new User({refreshToken, role: 1, email: "dcal@dtu.dk"});
        token = user.generateAuthToken();
        await user.save();

    });
    afterEach(async () => {
        await User.deleteMany();
        await SignalMap.deleteMany();
        await Room.deleteMany();
        await Building.deleteMany();
        await Beacon.deleteMany();
        await RoomPrediction.deleteMany();
    });

    describe("GET /", () => {
        let roomPrediction;
        let correctRoomId;
        let predictedRoomId;

        const exec = () => {
            return request(server)
                .get("/api/roomPredictions")
                .set('x-auth-token', token);
        };

        beforeEach(async () => {
            const buildingId = mongoose.Types.ObjectId();
            const correctRoom = await new Room({name: "324", building: buildingId}).save();
            const predictedRoom = await new Room({name: "324", building: buildingId}).save();
            const beacon = await new Beacon({name: "beacon1", building: buildingId}).save();

            correctRoomId = correctRoom.id;
            predictedRoomId = predictedRoom.id;

            const signalMap = await new SignalMap({
                building: buildingId,
                room: correctRoomId,
                beacons: [{name: beacon.name, signal: -42}]
            }).save();

            roomPrediction = await new RoomPrediction({
                correctRoom: correctRoomId,
                predictedRoom: predictedRoomId,
                signalMap: signalMap.id,
                user: user.id,
            }).save();
        });

        it("Should return list with correct element", async () => {
            const res = await exec();
            expect(res.body.length).to.equal(1)
            expect(res.body[0].correctRoom).to.equal(correctRoomId);
        });

        it("Should return 403 did not have role 1", async () => {
            user.role = 0;
            await user.save();
            const res = await exec();
            expect(res.statusCode).to.equal(403);
        });

        it("Should return 403 if user email was not dcal@dtu.dk", async () => {
            user.email = "not@davide.dk"
            await user.save();
            const res = await exec();
            expect(res.statusCode).to.equal(403);
        });

        it("Should work if user email was not dcal@dtu.dk but user role was 2 (admin)", async () => {
            user.email = "not@davide.dk"
            user.role = 2;
            await user.save();
            const res = await exec();
            expect(res.statusCode).to.equal(200);
        });

    });

    describe("DELETE /", () => {
        let roomPrediction;
        let roomPredictionId;
        let correctRoomId;
        let predictedRoomId;
        let signalMapId;

        const exec = () => {
            return request(server)
                .delete("/api/roomPredictions/" + roomPredictionId)
                .set('x-auth-token', token);
        };

        beforeEach(async () => {

            const buildingId = mongoose.Types.ObjectId();
            const correctRoom = await new Room({name: "324", building: buildingId}).save();
            const predictedRoom = await new Room({name: "324", building: buildingId}).save();
            const beacon = await new Beacon({name: "beacon1", building: buildingId}).save();

            correctRoomId = correctRoom.id;
            predictedRoomId = predictedRoom.id;

            const signalMap = await new SignalMap({
                building: buildingId,
                room: correctRoomId,
                beacons: [{name: beacon.name, signal: -42}]
            }).save();

            user.role = 2;
            await user.save();

            signalMapId = signalMap.id;

            roomPrediction = await new RoomPrediction({
                correctRoom: correctRoomId,
                predictedRoom: predictedRoomId,
                signalMap: signalMap.id,
                user: user.id,
            }).save();

            roomPredictionId = roomPrediction.id;
        });

        it("Should update db and delete roomPrediction", async () => {
            const secondRoomPrediction = await new RoomPrediction({
                correctRoom: correctRoomId,
                predictedRoom: predictedRoomId,
                signalMap: signalMapId,
                user: user.id,
            }).save();

            await exec();

            const predictedRooms = await RoomPrediction.find();
            expect(predictedRooms.length).to.equal(1);

            expect(predictedRooms[0].id).to.equal(secondRoomPrediction.id);
        });

        it("Should validate id", async () => {
            roomPredictionId = "not-valid"
            const res = await exec();
            expect(res.statusCode).to.equal(400);
        });

        it("Should return roomPrediction", async () => {
            const res = await exec();
            expect(res.body._id.toString()).to.equal(roomPredictionId);
        });

        it("Should return 403 if user email was not admin", async () => {
            user.role = 1;
            await user.save();
            const res = await exec();
            expect(res.statusCode).to.equal(403);
        });
    })

    describe('POST /', () => {
        let roomPrediction;
        let correctRoomId;
        let predictedRoomId;
        let signalMapId;

        const exec = () => {
            return request(server)
                .post("/api/roomPredictions")
                .set('x-auth-token', token)
                .send({correctRoomId, predictedRoomId, signalMapId});
        };

        beforeEach(async () => {
            const buildingId = mongoose.Types.ObjectId();
            const correctRoom = await new Room({name: "324", building: buildingId}).save();
            const predictedRoom = await new Room({name: "324", building: buildingId}).save();
            const beacon = await new Beacon({name: "beacon1", building: buildingId}).save();

            correctRoomId = correctRoom.id;
            predictedRoomId = predictedRoom.id;

            user.role = 0;
            await user.save();

            const signalMap = await new SignalMap({
                building: buildingId,
                room: correctRoomId,
                beacons: [{name: beacon.name, signal: -42}]
            }).save();

            signalMapId = signalMap.id;

            roomPrediction = await new RoomPrediction({
                correctRoom: correctRoomId,
                predictedRoom: predictedRoomId,
                signalMap: signalMap.id,
                user: user.id,
            });
            console.log(roomPrediction)

        });

        it("Should add the roomPrediction to the DB", async () => {
            const res = await exec();
            const prediction = await RoomPrediction.findById(res.body._id);

            expect(prediction.correctRoom.toString()).to.equal(correctRoomId);
        });

        it("Should add the roomPrediction to the DB with correct user", async () => {
            const res = await exec();
            const prediction = await RoomPrediction.findById(res.body._id);

            expect(prediction.user.toString()).to.equal(user.id);
        });

        it("Should return 400 if correct and predicted room id not set", async () => {
            correctRoomId = undefined;
            let res = await exec();
            expect(res.statusCode).to.equal(400);

            predictedRoomId = undefined;
            res = await exec();
            expect(res.statusCode).to.equal(400);

        });

        it("Should also add createdAt timestamp to predictedRoom", async () => {
            const res = await exec();

            expect("updatedAt" in res.body).to.not.be.ok;
            expect("createdAt" in res.body).to.be.ok;
        });

        it("Should verify existence of signalmap", async () => {
            await SignalMap.findByIdAndDelete(signalMapId);
            const res = await exec();
            expect(res.statusCode).to.equal(400)
        });

        it("Should verify existence of correct room", async () => {
            await Room.findByIdAndDelete(correctRoomId);
            const res = await exec();
            expect(res.statusCode).to.equal(400)
        });

        it("Should verify existence of predicted room", async () => {
            await Room.findByIdAndDelete(predictedRoomId);
            const res = await exec();
            expect(res.statusCode).to.equal(400)
        });
    });
});
