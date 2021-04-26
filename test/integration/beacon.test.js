const {User} = require('../../models/user');
const {SignalMap} = require('../../models/signalMap');
const {Building} = require('../../models/building');
const {Room} = require('../../models/room');
const {Beacon} = require('../../models/beacon');
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
const { v4: uuidv4 , validate} = require('uuid');

describe('/api/beacons', () => {
    let user;
    let token;
    let refreshToken;
    let beacon;
    let buildingId;

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
                .get("/api/beacons" + query)
                .set('x-auth-token', token);
        };

        beforeEach(async () => {
            const building = new Building({name: "324"});
            buildingId = building.id;

            beacon = await new Beacon({
                name: "beacon1",
                building: buildingId
            }).save();

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

        it("Should return 403 if user was not admin", async () => {
            user.role = 1;
            // token = user.generateAuthToken();
            await user.save();

            const res = await exec();
            expect(res.statusCode).to.equal(403);
        });

        it("Should get list of all beacons", async () => {
            await new Beacon({
                name: "beacon2",
                building: buildingId
            }).save();
            await new Beacon({
                name: "beacon3",
                building: buildingId
            }).save();
            await new Beacon({
                name: "beacon4",
                building: buildingId
            }).save();

            const res = await exec();
            expect(res.body.length).to.equal(4);
        });
    });


    describe("GET /uuid", () => {
        const exec = () => {
            return request(server)
                .get("/api/beacons/uuid")
                .set('x-auth-token', token);
        };


        it("Should return specific uuid", async () => {
            const res = await exec();
            const uuid = "f7826da6-4fa2-4e98-8024-bc5b71e0893e";

            expect(res.text).to.equal(uuid)

        });


    });


});
