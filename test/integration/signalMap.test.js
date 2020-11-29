const {User} = require('../../models/user');
const {Building} = require('../../models/building');
const {Room} = require('../../models/room');
const {SignalMap} = require('../../models/signalMap');
const {Beacon} = require('../../models/beacon');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../index');
const config = require('config');
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const expect = require('chai').expect;
const {v4: uuidv4} = require('uuid');

describe('/api/signalMaps', () => {
    let server;
    let user;
    let token;
    let roomId;
    let buildingId;
    let signal;
    let beaconId;
    let beacons;
    let signalMap;
    let room;
    let beaconName;

    before(async () => {
        server = await app.listen(config.get('port'));
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
        await SignalMap.deleteMany();
        await Room.deleteMany();
        await Beacon.deleteMany();
    });

    describe('POST /', () => {
        let building;
        const exec = () => {
            return request(server)
                .post('/api/signalMaps')
                .set({'x-auth-token': token})
                .send({roomId, beacons})
        };

        beforeEach(async () => {
            signal = -40;

            building = new Building({
                name: "222"
            });

            await building.save();

            building.admins = [user.id];
            await building.save();

            buildingId = building.id;
            beaconName = "beaconName1";

            room = new Room({
                name: "222",
                building: building.id
            });
            await room.save();

            roomId = room.id;
            signalMap = {
                room: roomId,
                beacons: [{name: beaconName, signal: -41}]
            };

            beacons = [{
                name: beaconName,
                signal
            }];
            token = user.generateAuthToken();
        });

        it("Should not throw error", async () => {

            const building = new Building({name: "heeej"});
            await building.save();

            let room = new Room({building: building.id, name: "hej"});
            let room2 = new Room({building: building.id, name: "hej2"});
            await room.save();
            await room2.save();
            let beaconName1 = "hejj";
            let beaconName2 = "hejjj";

            let signalMap = new SignalMap({
                isActive: true,
                room: room.id,
                beacons: [
                    {
                        signal: 70,
                        name: beaconName1
                    },
                    {
                        signal: 67,
                        name: beaconName2
                    }
                ],
                __v: 0
            });
            await signalMap.save();
            let signalMap2 = new SignalMap({
                isActive: true,
                room: room2.id,
                beacons: [
                    {
                        signal: 70,
                        name: beaconName1
                    },
                    {
                        signal: 67,
                        name: beaconName2
                    }
                ]
            });
            await signalMap2.save();

            const requestFromChril = {
                beacons: [
                    {name: beaconName1, signal: -62}, {
                        name: beaconName2,
                        signal: -70
                    },]
            };

            await request(server)
                .post('/api/signalMaps')
                .set({'x-auth-token': token})
                .send(requestFromChril);
        });

        it("Should return new signalmap with one length array of beacons", async () => {

            const res = await exec();
            expect(res.body.beacons.length).to.equal(1);
        });

        it("Should have reference to room", async () => {
            const res = await exec();
            expect(res.body.room._id).to.equal(roomId.toString());
        });

        it("Should return 400 if one of the beacons doesn't exist in the system", async () => {
            beacons = [{
                beaconId: mongoose.Types.ObjectId(),
                signal
            }];

            const res = await exec();
            expect(res.statusCode).to.equal(400);
        });

        it("Should set isActive to false by default if room not provided", async () => {
            await new Beacon({name: beaconName, building: buildingId}).save();
            const signalMap = new SignalMap({
                beacons: [{
                    name: beaconName,
                    signal: 40
                }],
                room: roomId,
                isActive: true
            });
            await signalMap.save();

            roomId = undefined;
            const res = await exec();
            expect(res.body.isActive).to.be.false;
        });

        it("Should set user's current room after estimating room", async () => {
            await new Beacon({name: beaconName, building: building.id}).save();
            const signalMap = new SignalMap({
                beacons: [{
                    name: beaconName,
                    signal: 39
                }],
                room: roomId,
                isActive: true
            });
            await signalMap.save();
            roomId = undefined;
            const now = new Date();
            await exec();
            const updatedUser = await User.findById(user.id);
            expect(updatedUser.roomLastUpdated).to.be.at.least(now);
        });

        it("Should set currentRoom to correct room after room estimation", async () => {
            await new Beacon({name: beaconName, building: building.id}).save();
            const signalMap = new SignalMap({
                beacons: [{
                    name: beaconName,
                    signal: 41
                }],
                room: roomId,
                isActive: true
            });
            await signalMap.save();
            roomId = undefined;
            await exec();
            const updatedUser = await User.findById(user.id);
            expect(updatedUser.currentRoom.toString()).to.equal(signalMap.room.toString());
        });

        it("Should report back certainty percentage", async () => {
            await new Beacon({name: beaconName, building: building.id}).save();

            const signalMap = new SignalMap({
                beacons: [{
                    name: beaconName,
                    signal: 39
                }],
                room: roomId,
                isActive: true
            });
            await signalMap.save();
            roomId = undefined;
            const res = await exec();
            expect(res.body.room.certainty).to.equal(100);
            // expect(res.body.room._id).to.equal(signalMap.room.toString());
        });

        it("Should set isActive to true if roomId provided", async () => {
            const res = await exec();
            expect(res.body.isActive).to.be.true;
        });

        it("Should update beacon list after posting signalmap with reference to room", async () => {
            await exec();
            const beacon = await Beacon.findOne({building: building.id});

            expect(beacon).to.be.ok;
        });

        it("Should add beacon with correct name to beacon list", async () => {
            await exec();
            const beacon = await Beacon.findOne({building: building.id});

            expect(beacon.name).to.equal(beaconName);
        });

        it("Should not add beacon again if already added to building", async () => {
            await exec();
            await exec();

            const beacons = await Beacon.find({building: building.id});
            expect(beacons.length).to.equal(1);
        });

        it("Should return 400 if beacons are being added to two different buildings", async () => {
            await exec();

            const otherBuilding = await new Building({name: "other", admins: [user.id]}).save();
            const otherRoom = await new Room({name: "324", building: otherBuilding.id}).save();

            roomId = otherRoom.id;
            beacons = [{name: beaconName, signal: -41}];
            const res = await exec();
            expect(res.statusCode).to.equal(400);
        });

        it("Should update previous signalmaps if new beacons are added", async () => {
            const res = await exec();
            const b = new Beacon({name: "newBeacon", building: buildingId})
            beacons = [{name: b.name, signal: -30}];
            await exec();

            const updatedSignalMap = await SignalMap.findById(res.body._id);

            expect(updatedSignalMap.beacons.length).to.equal(2);
            expect(updatedSignalMap.beacons[1].signal).to.equal(-100);
        });

        it("Should estimate room if roomId not provided ", async () => {
            await new Beacon({name: beaconName, building: building.id}).save();

            const signalMap = new SignalMap({
                beacons: [{
                    name: beaconName,
                    signal: 38
                }],
                room: roomId,
                isActive: true
            });
            await signalMap.save();
            roomId = undefined;
            const res = await exec();
            expect(res.body.room.certainty).to.equal(100);
            // expect(res.body.room._id).to.equal(signalMap.room.toString());
        });

        it("Should set isActive to true if roomId provided ", async () => {
            const res = await exec();
            expect(res.body.isActive).to.be.true;
        });

        it("Should throw error if only inactive signalmaps are available and roomId not provided", async () => {
            const signalMap = new SignalMap({
                beacons: [{
                    name: beaconName,
                    signal: 37
                }],
                room: roomId,
                isActive: false
            });
            await signalMap.save();
            roomId = undefined;
            const res = await exec();
            expect(res.statusCode).to.equal(400);
        });

        it("Should estimate correct room when nearest neighbor is a tie", async () => {
            let newBeaconName = "hejjj";

            let room2 = new Room({
                building: buildingId,
                name: "hej"
            });
            await room2.save();
            await new Beacon({name: beaconName, building: buildingId}).save();
            await new Beacon({name: newBeaconName, building: buildingId}).save();

            await SignalMap.deleteMany();
            const signalMaps = [new SignalMap({
                beacons: [{
                    name: beaconName,
                    signal: -40
                }, {
                    name: newBeaconName,
                    signal: -60
                }],
                room: roomId,
                isActive: true
            }), new SignalMap({
                beacons: [{
                    name: beaconName,
                    signal: -60
                }, {
                    name: newBeaconName,
                    signal: -40
                }],
                room: room2.id,
                isActive: true
            }),];

            for (let i = 0; i < signalMaps.length; i++) {
                await signalMaps[i].save();
            }

            beacons = [{
                name: beaconName,
                signal: -40
            }, {
                name: newBeaconName,
                signal: -60
            }];


            let roooom = roomId;
            roomId = undefined;

            const res = await exec();

            expect(res.body.room._id.toString()).to.equal(roooom);
            expect(res.body.room.certainty).to.equal(50);
        });

        it("Should not throw error if beacon was in client beacons array but not in servermap", async () => {
            let beaconName1 = "hejjjj";
            await new Beacon({name: beaconName, building: buildingId}).save();
            await new Beacon({name: beaconName1, building: buildingId}).save();

            let room2 = new Room({
                building: buildingId,
                name: "hej"
            });
            await room2.save();

            await SignalMap.deleteMany();
            const signalMaps = [new SignalMap({
                beacons: [{
                    name: beaconName,
                    signal: -40
                }, {
                    name: beaconName1,
                    signal: -60
                }],
                room: roomId,
                isActive: true
            }), new SignalMap({
                beacons: [{
                    name: beaconName,
                    signal: -60
                }, {
                    name: beaconName1,
                    signal: -40
                }],
                room: room2.id,
                isActive: true
            }),];

            for (let i = 0; i < signalMaps.length; i++) {
                await signalMaps[i].save();
            }

            let beaconOnlyFromClient = "hejjj"

            beacons = [{
                name: beaconName,
                signal: -40
            }, {
                name: beaconName1,
                signal: -60
            }, {
                name: beaconOnlyFromClient,
                signal: -20
            }];

            let roooom = roomId;
            roomId = undefined;
            const res = await exec();
            expect(res.body.room._id.toString()).to.equal(roooom);
        });

        it("Should return 400 if no signalmap was posted and a room estimation was requested", async () => {
            await SignalMap.deleteMany();
            roomId = undefined;
            const res = await exec();
            expect(res.statusCode).to.equal(400);
        });

        it("Should return 403 if roomId provided and user was not authorized", async () => {
            user.role = 0;
            token = user.generateAuthToken();
            await user.save();

            const res = await exec();
            expect(res.statusCode).to.equal(403);

        });

        it("Should return 400 if room was not found", async () => {
            roomId = mongoose.Types.ObjectId();
            const res = await exec();
            expect(res.statusCode).to.equal(400);
        });

        it("Should return 403 if user was not admin on building where signalmap is posted", async () => {
            building.admins = [];
            await building.save();

            const res = await exec();
            expect(res.statusCode).to.equal(403);
        });

        it("Should merge if two signalMaps was posted to same room", async () => {
            await new Beacon({name: beaconName, building: buildingId}).save();

            const room2 = await new Room({
                name: "223",
                building: buildingId
            }).save();

            await new SignalMap({
                beacons: [{
                    name: beaconName,
                    signal: -38
                }],
                room: roomId,
                isActive: true
            }).save();

            await new SignalMap({
                beacons: [{
                    name: beaconName,
                    signal: -42
                }],
                room: room2.id,
                isActive: true
            }).save();

            await new SignalMap({
                beacons: [{
                    name: beaconName,
                    signal: -40
                }],
                room: room2.id,
                isActive: true
            }).save();
            roomId = undefined;

            const res = await exec();
            expect(res.body.room._id.toString()).to.equal(room2.id);
        });

        it("Should ignore (but not crash) when users send signalmaps with unknown beacons", async () => {
            await new Beacon({name: beaconName, building: buildingId}).save();
            const sm = await new SignalMap({
                room: roomId,
                beacons: [{name: beaconName, signal: -40}],
                isActive: true
            }).save();

            // creating signal from unknown beacon
            beacons.push({
                name: "random-beacon-name",
                signal: -32
            });
            signal = -32;
            roomId = undefined;

            const res = await exec();
            expect(res.body.room._id).to.equal(sm.room._id.toString());
        });

        it("Should add proper padding if beacons from two different buildings were posted", async () => {
            await new Beacon({name: beaconName, building: building.id}).save();
            const otherBuilding = await new Building({name: "324"}).save();
            const otherBeacon = await new Beacon({name: "beaconName2", building: otherBuilding.id}).save();
            await new SignalMap({
                room: roomId,
                beacons: [{name: beaconName, signal: -80}],
                isActive: true
            }).save();
            const roomFromOtherBuilding = await new Room({name: "otherRoom", building: otherBuilding.id}).save();

            await new SignalMap({
                room: roomFromOtherBuilding.id,
                beacons: [{name: otherBeacon.name, signal: -20}],
                isActive: true
            }).save();

            beacons = [{name: beaconName, signal: -80}, {name: otherBeacon.name, signal: -20}];
            roomId = undefined;
            const res = await exec();
            expect(res.body.room._id).to.equal(roomFromOtherBuilding.id);
        });

        it("Should properly add padding according to list of beacons from server", async () => {
            await new Beacon({name: beaconName, building: buildingId}).save();
            await new Beacon({name: "beaconName2", building: buildingId}).save();
            await new SignalMap({
                room: roomId,
                beacons: [{name: beaconName, signal: -80}, {name: "beaconName2", signal: -20}],
                isActive: true
            }).save();

            const room2 = await new Room({name: "room2", building: buildingId}).save();

            await new SignalMap({
                room: room2.id,
                beacons: [{name: beaconName, signal: -90}, {name: "beaconName2", signal: -90}],
                isActive: true
            }).save();

            // Even though this signalmap fits exactly with first signalmap it should match with second because of padding.
            beacons = [{name: beaconName, signal: -80}];
            roomId = undefined;

            const res = await exec();

            expect(res.body.room._id).to.equal(room2.id);
        });

        it("Should return 400 if signalmap with only unkown beacons was sent by client", async () => {
            await new SignalMap({
                room: roomId,
                beacons: [{name: beaconName, signal: -39}],
                isActive: true
            }).save();
            beacons = [{
                name: "randomBeaconName",
                signal: -32
            }];
            roomId = undefined;
            const res = await exec();
            expect(res.statusCode).to.equal(400);
        })

        it("Should return certainty percentage of room estimation", async () => {
            await new Beacon({name: beaconName, building: buildingId}).save();
            const signalMap = new SignalMap({
                beacons: [{
                    name: beaconName,
                    signal: 41
                }],
                room: roomId,
                isActive: true
            });
            const room2 = new Room({name: "322", building: buildingId})
            const signalMap2 = new SignalMap({
                beacons: [{
                    name: beaconName,
                    signal: 39
                }],
                room: room2.id,
                isActive: true
            });
            await room2.save();
            await signalMap.save();
            await signalMap2.save();
            roomId = undefined;
            const res = await exec();
            expect(res.body.room.certainty).to.equal(50);
        });

        it("Should estimate both building and room correctly when posting signalmap without building and room id", async () => {
            await new Beacon({name: beaconName, building: buildingId}).save();

            const signalMap = new SignalMap({
                beacons: [{
                    name: beaconName,
                    signal: 41
                }],
                room: roomId,
                isActive: true
            });
            await signalMap.save();

            roomId = undefined;
            const res = await exec();
            expect(res.body.room.building).to.equal(building.id);
        });

        it("Should return 400 if no active signalmaps were found in building of posted beacons", async () => {
            const otherBuilding = await new Building({name: "heeey"}).save();
            const otherRoom = await new Room({name: "yoyo", building: otherBuilding.id}).save();

            const otherBeacon = await new Beacon({name: "beaconName2", building: otherBuilding.id}).save();

            await new SignalMap({
                beacons: [{
                    name: otherBeacon.name,
                    signal: -20,
                }],
                room: otherRoom.id,
                isActive: true
            }).save();

            roomId = undefined;
            const res = await exec();
            expect(res.statusCode).to.equal(400);


        });

    });

    describe("PATCH /confirm-room/:id Confirm room", () => {

        let signalMapId;
        const exec = () => {
            return request(server)
                .patch('/api/signalMaps/confirm-room/' + signalMapId)
                .set({'x-auth-token': token})
                .send({roomId, beacons, buildingId})
        };

        beforeEach(async () => {
            signal = 40;

            beaconName = "randomName";
            buildingId = mongoose.Types.ObjectId();

            const room = new Room({
                name: "222",
                building: buildingId
            });
            await room.save();

            roomId = room.id;

            signalMap = new SignalMap({
                room: roomId,
                beacons: [{name: beaconName, signal: 40}]
            });
            signalMapId = signalMap.id;

            await signalMap.save();

            token = user.generateAuthToken();
        });

        it("Should return updated signal map with isValid = true", async () => {
            const signalMap = await exec();
            expect(signalMap.body.isActive).to.be.true;
        });

        it("Should return 404 if signal map did not exist", async () => {
            signalMapId = mongoose.Types.ObjectId();
            const res = await exec();
            expect(res.statusCode).to.equal(404);
        });
    });


    describe(" GET / ", () => {

        const exec = () => {
            return request(server)
                .get('/api/signalMaps')
                .set({'x-auth-token': token})
        };

        beforeEach(async () => {
            signal = 40;

            beaconName = "random name";
            buildingId = mongoose.Types.ObjectId();

            const room = new Room({
                name: "222",
                building: buildingId
            });
            await room.save();

            roomId = room.id;

            signalMap = new SignalMap({
                room: roomId,
                beacons: [{name: beaconName, signal: 39}]
            });

            await signalMap.save();

            beacons = [{
                beaconId,
                signal
            }];
            token = user.generateAuthToken();
        });

        it("Should return array with correct beaconIds ", async () => {
            const res = await exec();
            expect(res.body[0].beacons[0].name).to.equal(beaconName);
        });
    })

    describe(" DELETE /room/:roomId", () => {
        let roomId;
        let building;
        let beacon;

        const exec = () => {
            return request(server)
                .delete('/api/signalMaps/room/' + roomId)
                .set({'x-auth-token': token});
        };

        beforeEach(async () => {
            signal = 40;

            beaconName = "random name";


            building = await new Building({name: "324", admins: [user.id]}).save();
            beacon = await new Beacon({name: beaconName, building: building.id}).save();


            const room = new Room({
                name: "222",
                building: building.id
            });
            await room.save();

            roomId = room.id;

            signalMap = new SignalMap({
                room: roomId,
                beacons: [{name: beaconName, signal: 39}]
            });

            await signalMap.save();

            beacons = [{
                beaconId,
                signal
            }];
            await user.save();
            token = user.generateAuthToken();
        });

        it("Should not have any signalmaps present after delete request", async () => {
            let signalMaps = await SignalMap.find({});
            expect(signalMaps.length).to.equal(1);

            await exec();
            signalMaps = await SignalMap.find({});
            expect(signalMaps.length).to.equal(0);
        });

        it("Should return 403 if user not logged in", async () => {
            user.role = 0;
            await user.save();
            const res = await exec();
            expect(res.statusCode).to.equal(403);
        });

        it("Should return 403 if user was not building admin", async () => {
            building.admins = [];
            await building.save();

            const res = await exec();
            expect(res.statusCode).to.equal(403);
        });

        it("Should return 400 if room id was not valid", async () => {
            roomId = "not-valid";
            const res = await exec();
            expect(res.statusCode).to.equal(400);
        });

        it("Should return 400 if room with provided id did not exist in database", async () => {
            roomId = mongoose.Types.ObjectId();
            const res = await exec();
            expect(res.statusCode).to.equal(400);
        });

        it("Should delete only signal map from specified room", async () => {
            signalMap = new SignalMap({
                room: mongoose.Types.ObjectId(),
                beacons: [{name: beaconName, signal: 41}]
            });

            await signalMap.save();

            await exec();
            const foundSignalMap = await SignalMap.findById(signalMap.id);
            expect(foundSignalMap).to.be.ok;
        });

        it("Should delete beacons if there are no more references to that beacon", async () => {
            const beaconWithRef = await new Beacon({name: "hey", building: building.id}).save();
            const otherRoom = await new Room({name: "hey", building: building.id}).save();
            await new SignalMap({room: otherRoom.id, beacons: [{name: beaconWithRef.name, signal: -20}]}).save();

            await exec();
            const beacons = await Beacon.find();
            expect(beacons.length).to.equal(1);

        });
    });
});
