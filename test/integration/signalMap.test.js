const {User} = require('../../models/user');
const {Building} = require('../../models/building');
const {Room} = require('../../models/room');
const {Beacon} = require('../../models/beacon');
const {SignalMap} = require('../../models/signalMap');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../index');
const config = require('config');
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const expect = require('chai').expect;

describe('/api/signalMaps', () => {
    let server;
    let user;
    let token;
    let roomId;
    let buildingId;
    let signals;
    let beaconId;
    let uuid;
    let beacons;
    let signalMapFromOtherBuilding;
    let room;

    before(async () => {
        server = await app.listen(config.get('port'));
        await mongoose.connect(config.get('db'), {useNewUrlParser: true, useUnifiedTopology: true});
    });
    after(async () => {
        await server.close();
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        user = new User({role: 1});
        await user.save();
    });
    afterEach(async () => {
        await User.deleteMany();
        await SignalMap.deleteMany();
        await Room.deleteMany();
        await Beacon.deleteMany();
    });

    describe('POST /', () => {

        const exec = () => {
            return request(server)
                .post('/api/signalMaps')
                .set({'x-auth-token': token})
                .send({roomId, beacons, buildingId})
        };

        beforeEach(async () => {
            signals = [-40];


            const building = new Building({
                name: "222"
            });

            await building.save();

            user.adminOnBuildings.push(building.id);
            await user.save();

            let beacon = await new Beacon({
                name: "hej", building: building.id,
                uuid: "f7826da6-4fa2-4e98-8024-bc5b71e0893b"
            }).save();

            buildingId = building.id;
            beaconId = beacon.id;
            uuid = beacon.uuid;

            room = new Room({
                name: "222",
                building: building.id
            });
            await room.save();

            roomId = room.id;
            signalMapFromOtherBuilding = {
                room: roomId,
                beacons: [{uuid: beaconId, signals: [-39, -41]}]
            };

            beacons = [{
                uuid: beacon.uuid,
                signals
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
            let beacon = new Beacon({name: "hej", building: building.id, uuid: "f7826da6-4fa2-4e98-8024-bc5b71e0893a"});
            let beacon2 = new Beacon({
                name: "hej",
                building: building.id,
                uuid: "f7826da6-4fa2-4e98-8024-bc5b71e0893c"
            });
            await beacon.save();
            await beacon2.save();


            let signalMap = new SignalMap({
                isActive: true,
                room: room.id,
                beacons: [
                    {
                        signals: [
                            -73,
                            -69.5,
                            -67
                        ],
                        uuid: beacon.uuid
                    },
                    {
                        signals: [
                            -64,
                            -70
                        ],
                        uuid: beacon2.uuid
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
                        signals: [
                            -73,
                            -69.5,
                            -67
                        ],
                        uuid: beacon.uuid
                    },
                    {
                        signals: [
                            -64,
                            -70
                        ],
                        uuid: beacon2.uuid
                    }
                ]
            });
            await signalMap2.save();

            const requestFromChril = {
                buildingId: building.id,
                beacons: [
                    {uuid: beacon.uuid, signals: [-62]}, {
                        uuid: beacon2.uuid,
                        signals: [-70]
                    }]
            };

            await request(server)
                .post('/api/signalMaps')
                .set({'x-auth-token': token})
                .send(requestFromChril);
        });

        /*
        it("Should not throw error either", async () => {
            await SignalMap.deleteMany();
            await Room.deleteMany();
            await Building.deleteMany();
            await Beacon.deleteMany();

            buildingId = "5ca34d31ab35306b2610eb7b";

            const rooms = [new Room({
                name: "222",
                building: buildingId,
                _id: "5cc8565c7e14e27313a9ddba"
            }), new Room({
                name: "222",
                building: buildingId,
                _id: "5cc856907e14e27313a9ddc0"
            }), new Room({
                name: "222",
                building: buildingId,
                _id: "5cc85939e50be37333359408"
            }), new Room({
                name: "222",
                building: mongoose.Types.ObjectId(),
            }), new Room({
                name: "222",
                building: mongoose.Types.ObjectId(),
            }), new Room({
                name: "222",
                building: mongoose.Types.ObjectId(),
            }), new Room({
                name: "222",
                building: buildingId,
            })];

            for (let i = 0; i < rooms.length; i++) {
                await rooms[i].save();
            }

            const signalMaps = [
                new SignalMap({
                    isActive: true,
                    _id: "5cc8565c7e14e27313a9ddbb",
                    room: "5cc8565c7e14e27313a9ddba",
                    "beacons": [
                        {
                            signals: [
                                -68.33333333333333,
                                -67,
                                -63.6,
                                -69,
                                -69.8,
                                -69.6
                            ],
                            uuid: "5cc813915dd2bd712743c9ba"
                        },
                        {
                            signals: [
                                -74.33333333333333,
                                -78.8,
                                -76.8,
                                -73.8,
                                -74.2,
                                -74.2
                            ],
                            uuid: "5cc81e43c3325e715fb3b72b"
                        },
                        {
                            signals: [
                                -70,
                                -69,
                                -75.4,
                                -72,
                                -73,
                                -68.2
                            ],
                            uuid: "5cc81eb1c3325e715fb3b72c"
                        },
                        {
                            signals: [
                                -75.33333333333333,
                                -75.2,
                                -70.2,
                                -70.2,
                                -69.6,
                                -69.8
                            ],
                            uuid: "5cc820cda98a3571910886b4"
                        }
                    ],
                    __v: 0
                }),
                new SignalMap({
                    isActive: true,
                    _id: "5cc856907e14e27313a9ddc1",
                    room: "5cc856907e14e27313a9ddc0",
                    beacons: [
                        {
                            signals: [
                                -82.4,
                                -100,
                                -82,
                                -100,
                                -79.8,
                                -100,
                                -74,
                                -100,
                                -75.2,
                                -100,
                                -72.8,
                                -100
                            ],
                            uuid: "5cc813915dd2bd712743c9ba"
                        },
                        {
                            signals: [
                                -65,
                                -100,
                                -67.6,
                                -100,
                                -65.8,
                                -100,
                                -66,
                                -100,
                                -68.2,
                                -100,
                                -64,
                                -100
                            ],
                            uuid: "5cc81e43c3325e715fb3b72b"
                        },
                        {
                            signals: [
                                -66.6,
                                -100,
                                -66,
                                -100,
                                -69.4,
                                -100,
                                -69.6,
                                -100,
                                -70,
                                -100,
                                -70.8,
                                -100
                            ],
                            uuid: "5cc81eb1c3325e715fb3b72c"
                        },
                        {
                            signals: [
                                -84.2,
                                -100,
                                -83.2,
                                -100,
                                -82.4,
                                -100,
                                -82.4,
                                -100,
                                -80.4,
                                -100,
                                -83.2,
                                -100
                            ],
                            uuid: "5cc820cda98a3571910886b4"
                        },
                        {
                            signals: [
                                -82.4,
                                -100,
                                -82,
                                -100,
                                -79.8,
                                -100,
                                -74,
                                -100,
                                -75.2,
                                -100,
                                -72.8,
                                -100
                            ],
                            uuid: "5cc813915dd2bd712743c9ba"
                        },
                        {
                            signals: [
                                -65,
                                -100,
                                -67.6,
                                -100,
                                -65.8,
                                -100,
                                -66,
                                -100,
                                -68.2,
                                -100,
                                -64,
                                -100
                            ],
                            uuid: "5cc81e43c3325e715fb3b72b"
                        },
                        {
                            signals: [
                                -66.6,
                                -100,
                                -66,
                                -100,
                                -69.4,
                                -100,
                                -69.6,
                                -100,
                                -70,
                                -100,
                                -70.8,
                                -100
                            ],
                            uuid: "5cc81eb1c3325e715fb3b72c"
                        },
                        {
                            signals: [
                                -84.2,
                                -100,
                                -83.2,
                                -100,
                                -82.4,
                                -100,
                                -82.4,
                                -100,
                                -80.4,
                                -100,
                                -83.2,
                                -100
                            ],
                            uuid: "5cc820cda98a3571910886b4"
                        }
                    ],
                    __v: 0
                }),
                new SignalMap({
                    isActive: true,
                    _id: "5cc8593fe50be37333359409",
                    room: "5cc85939e50be37333359408",
                    beacons: [
                        {
                            signals: [
                                -44.666666666666664,
                                -48.8,
                                -46.6
                            ],
                            uuid: "5cc813915dd2bd712743c9ba"
                        },
                        {
                            signals: [
                                -51.333333333333336,
                                -48.8,
                                -49
                            ],
                            uuid: "5cc81e43c3325e715fb3b72b"
                        },
                        {
                            signals: [
                                -42.333333333333336,
                                -39.2,
                                -40.8
                            ],
                            uuid: "5cc81eb1c3325e715fb3b72c"
                        },
                        {
                            signals: [
                                -47.333333333333336,
                                -54,
                                -49.8
                            ],
                            uuid: "5cc820cda98a3571910886b4"
                        }
                    ],
                    __v: 0
                })
            ];
            for (let i = 0; i < signalMaps.length; i++) {
                await signalMaps[i].save();
            }

            const newBeacons = [new Beacon({
                _id: "5cc813915dd2bd712743c9ba",
                building: {
                    feedback: [],
                    _id: "5ca34d31ab35306b2610eb7b",
                    name: "Empire State Building",
                    __v: 0
                },
                name: "vIgJ",
                uuid: "f7826da6-4fa2-4e98-8024-bc5b71e0893b",
                __v: 0
            }),
                new Beacon({
                    _id: "5cc81e43c3325e715fb3b72b",
                    building: {
                        feedback: [],
                        _id: "5ca34d31ab35306b2610eb7b",
                        "name": "Empire State Building",
                        "__v": 0
                    },
                    name: "ha2T",
                    uuid: "f7826da6-4fa2-4e98-8024-bc5b71e0893a",
                    __v: 0
                }),
                new Beacon({
                    _id: "5cc81eb1c3325e715fb3b72c",
                    building: {
                        feedback: [],
                        _id: "5ca34d31ab35306b2610eb7b",
                        name: "Empire State Building",
                        __v: 0
                    },
                    name: "LToy",
                    uuid: "f7826da6-4fa2-4e98-8024-bc5b71e0891e",
                    __v: 0
                }),
                new Beacon({
                    _id: "5cc820cda98a3571910886b4",
                    building: {
                        feedback: [],
                        _id: "5ca34d31ab35306b2610eb7b",
                        "name": "Empire State Building",
                        "__v": 0
                    },
                    name: "CQS0",
                    uuid: "f7826da6-4fa2-4e98-8024-bc5b71e0877e",
                    __v: 0
                })];
            for (let i = 0; i < newBeacons.length; i++) {
                await newBeacons[i].save();
            }

            beacons = [
                {signals: [-65.33333], beaconId: "5cc813915dd2bd712743c9ba"},
                {signals: [-66], beaconId: "5cc81e43c3325e715fb3b72b"},
                {signals: [-64], beaconId: "5cc81eb1c3325e715fb3b72c"},
                {signals: [-65.33333], beaconId: "5cc820cda98a3571910886b4"}];

            buildingId = "5ca34d31ab35306b2610eb7b";
            roomId = undefined;

            const res = await exec();
            console.log(JSON.stringify(res));

        });*/

        it("Should return 400 if neither roomId or buildingId provided", async () => {
            buildingId = undefined;
            roomId = undefined;
            const res = await exec();
                expect(res.statusCode).to.equal(400);
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
                signals
            }];

            const res = await exec();
                expect(res.statusCode).to.equal(400);
        });

        it("Should return 400 if one of the rssi arrays did not have the same length as the other's", async () => {
            let newBeacon = new Beacon({
                name: "hejj", building: buildingId,
                uuid: "f7826da6-4fa2-4e98-8024-bc5b71e0893b"
            });
            beacons.push({
                beaconId: mongoose.Types.ObjectId(),
                signals: [10, 23, 60]
            });
            const res = await exec();
                expect(res.statusCode).to.equal(400);
        });

        it("Should set isActive to false by default if room not provided", async () => {
            const signalMap = new SignalMap({
                beacons: [{
                    uuid,
                    signals: [39, 41]
                }],
                room: roomId,
                isActive: true
            });
            await signalMap.save();

            roomId = undefined;
            const res = await exec();
            expect(res.body.isActive).to.be.false;
        });

        it("Should set isActive to true if roomId provided", async () => {
            const res = await exec();
            expect(res.body.isActive).to.be.true;
        });

        it("Should estimate room if roomId not provided", async () => {
            const signalMap = new SignalMap({
                beacons: [{
                    _id: beaconId,
                    signals: [39, 41]
                }],
                room: roomId,
                isActive: true
            });
            await signalMap.save();
            roomId = undefined;
            const res = await exec();
            expect(res.body.room._id).to.equal(signalMap.room.toString());
        });

        it("Should throw error if only inactive signalmaps are available and roomId not provided", async () => {
            const signalMap = new SignalMap({
                beacons: [{
                    _id: beaconId,
                    signals: [39, 41]
                }],
                room: roomId,
                isActive: false
            });
            roomId = undefined;
            const res = await exec();
                expect(res.statusCode).to.equal(400);
        });

        it("Should estimate correct room when nearest neighbor is a tie", async () => {
            let beacon = new Beacon({
                name: "hejjj", building: buildingId,
                uuid: "f7826da6-4fa2-4e98-8024-bc5b71e0894b"
            });
            await beacon.save();

            let room2 = new Room({
                building: buildingId,
                name: "hej"
            });
            await room2.save();

            await SignalMap.deleteMany();
            console.log(uuid);
            const signalMaps = [new SignalMap({
                beacons: [{
                    uuid: uuid,
                    signals: [-39, -41]
                }, {
                    uuid: beacon.uuid,
                    signals: [-59, -61]
                }],
                room: roomId,
                isActive: true
            }), new SignalMap({
                beacons: [{
                    uuid: uuid,
                    signals: [-59, -61]
                }, {
                    uuid: beacon.uuid,
                    signals: [-39, -41]
                }],
                room: room2.id,
                isActive: true
            }),];

            for (let i = 0; i < signalMaps.length; i++) {
                await signalMaps[i].save();
            }

            beacons = [{
                uuid: uuid,
                signals: [-40]
            }, {
                uuid: beacon.uuid,
                signals: [-60]
            }];


            let roooom = roomId;
            roomId = undefined;
            const res = await exec();
            expect(res.body.room._id.toString()).to.equal(roooom);
        });

        it("Should not throw error if beacon was in client beacons array but not in servermap", async () => {
            let beacon = new Beacon({
                name: "hejjj", building: buildingId,
                uuid: "f7826da6-4fa2-4e98-8024-bc5b71e0894b"
            });
            await beacon.save();

            let room2 = new Room({
                building: buildingId,
                name: "hej"
            });
            await room2.save();

            await SignalMap.deleteMany();
            const signalMaps = [new SignalMap({
                beacons: [{
                    uuid: uuid,
                    signals: [-39, -41]
                }, {
                    uuid: beacon.uuid,
                    signals: [-59, -61]
                }],
                room: roomId,
                isActive: true
            }), new SignalMap({
                beacons: [{
                    uuid: uuid,
                    signals: [-59, -61]
                }, {
                    uuid: beacon.uuid,
                    signals: [-39, -41]
                }],
                room: room2.id,
                isActive: true
            }),];

            for (let i = 0; i < signalMaps.length; i++) {
                await signalMaps[i].save();
            }

            let beaconOnlyFromClient = new Beacon({
                name: "hejjj", building: buildingId,
                uuid: "f7826da6-4fa2-4e98-8024-bc5b71e08912"
            });
            await beaconOnlyFromClient.save();

            beacons = [{
                uuid: uuid,
                signals: [-40]
            }, {
                uuid: beacon.uuid,
                signals: [-60]
            }, {
                uuid: beaconOnlyFromClient.uuid,
                signals: [-20]
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

            buildingId = undefined;
            const res = await exec();
expect(res.statusCode).to.equal(403);

        });

        it("Should return 400 if room was not found", async () => {
            roomId = mongoose.Types.ObjectId();
            buildingId = undefined;

            const res = await exec();
                expect(res.statusCode).to.equal(400);
        });

        it("Should return 403 if user was not admin on building where signalmap is posted", async () => {
            user.adminOnBuildings = [];
            token = user.generateAuthToken();
            await user.save();

            buildingId = undefined;
            const res = await exec();
expect(res.statusCode).to.equal(403);
        });

        it("Should take all signal maps with the same room id into account when estimating room", async () => {

        });

        it("Should not consider signalMaps from buildings which no uploaded beacons are located in", async () => {
            const newBuilding = new Building({name: "otherBuilding"});
            await newBuilding.save();
            const newRoom = await new Room({
                name: "hej",
                building: newBuilding.id
            }).save();

            signalMapFromOtherBuilding = await new SignalMap({
                room: newRoom.id,
                beacons: [{_id: beaconId, signals: [40]}],
                isActive: true
            }).save();

            await new SignalMap({
                room: roomId,
                beacons: [{_id: beaconId, signals: [50]}],
                isActive: true
            }).save();

            roomId = undefined;
            buildingId = undefined;

            const res = await exec();
            console.log(newRoom.id);
            expect(res.body.room._id.toString()).to.equal(room.id);
        });

        it("Should merge if two signalMaps was posted to same room", async () => {
            const room2 = await new Room({
                name: "223",
                building: buildingId
            }).save();

            await new SignalMap({
                beacons: [{
                    _id: beaconId,
                    signals: [-38, -42]
                }],
                room: roomId,
                isActive: true
            }).save();
            console.log(roomId);

            await new SignalMap({
                beacons: [{
                    _id: beaconId,
                    signals: [-36, -45]
                }],
                room: room2.id,
                isActive: true
            }).save();

            await new SignalMap({
                beacons: [{
                    _id: beaconId,
                    signals: [-39, -41]
                }],
                room: room2.id,
                isActive: true
            }).save();
            roomId = undefined;

            const res = await exec();
            expect(res.body.room._id.toString()).to.equal(room2.id);
        });

        it("Should ignore (but not crash) when users send signalmaps with unknown beacons", async () => {

            const sm = await new SignalMap({
                room: roomId,
                beacons: [{uuid: beaconId, signals: [-39, -41]}],
                isActive: true
            }).save();

            // creating signal from unknown beacon
            beacons.push({
                uuid: "f7826da6-4fa2-4e98-8024-bc5b71e08hej",
                signals: [-32]
            });
            signals = [-32];
            roomId = undefined;

            const res = await exec();
            expect(res.body.room._id).to.equal(sm.room._id.toString());
        });

        it("Should return 400 if signalmap with only unkown beacons was sent by client", async () => {
            const sm = await new SignalMap({
                room: roomId,
                beacons: [{uuid: beaconId, signals: [-39, -41]}]
            }).save();
            beacons = [{
                uuid: "f7826da6-4fa2-4e98-8024-bc5b71e08hej",
                signals: [-32]
            }];
            roomId = undefined;
            const res = await exec();
                expect(res.statusCode).to.equal(400);
        })
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
            signals = [40];

            beaconId = mongoose.Types.ObjectId();
            buildingId = mongoose.Types.ObjectId();

            const room = new Room({
                name: "222",
                building: buildingId
            });
            await room.save();

            roomId = room.id;

            signalMapFromOtherBuilding = new SignalMap({
                room: roomId,
                beacons: [{_id: beaconId, signals: [39, 41]}]
            });
            signalMapId = signalMapFromOtherBuilding.id;

            await signalMapFromOtherBuilding.save();

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
            signals = [40];

            beaconId = mongoose.Types.ObjectId();
            buildingId = mongoose.Types.ObjectId();

            const room = new Room({
                name: "222",
                building: buildingId
            });
            await room.save();

            roomId = room.id;

            signalMapFromOtherBuilding = new SignalMap({
                room: roomId,
                beacons: [{_id: beaconId, signals: [39, 41]}]
            });

            await signalMapFromOtherBuilding.save();

            beacons = [{
                beaconId,
                signals
            }];
            token = user.generateAuthToken();
        });

        it("Should return array with correct beaconIds ", async () => {
            const res = await exec();
            expect(res.body[0].beacons[0]._id).to.equal(beaconId.toString());
        });
    })
});
