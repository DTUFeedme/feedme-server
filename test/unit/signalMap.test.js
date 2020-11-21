const {
    roomTypeEstimation, alignAndFillArrays,
    updateNearestNeighbors, findIndexOfMaxDistanceNeighbor,
    roomOfMostNeighbors
} = require('../../models/signalMap');
const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-as-promised'));
const mongoose = require('mongoose');
const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const IllegalArgumentError = require("../../errors/IllegalArgumentError");


describe('Location estimation algorithm', () => {


    let registeredBeacons;
    let signalMaps;
    let signalMap1;
    let signalMap2;
    let signalMap3;
    let k;
    let beaconNames;

    const exec = () => {
        return roomTypeEstimation(registeredBeacons, signalMaps, k, beaconNames)
    };

    describe("Estimate room", () => {
        beforeEach(() => {

            k = 3;
            registeredBeacons = [{
                name: "beaconName1",
                signal: 20
            }, {
                name: "beaconName2",
                signal: 10
            }];


            signalMap1 = {
                beacons: [
                    {
                        name: registeredBeacons[0].name,
                        signal: 20
                    },
                    {
                        name: registeredBeacons[1].name,
                        signal: 10
                    }
                ],
                room: mongoose.Types.ObjectId()
            };

            signalMap2 = {
                beacons: [
                    {
                        name: registeredBeacons[0].name,
                        signal: 52.5
                    },
                    {
                        name: registeredBeacons[1].name,
                        signal: 1.5
                    }
                ],
                room: mongoose.Types.ObjectId()
            };

            signalMap3 = {
                beacons: [
                    {
                        name: registeredBeacons[0].name,
                        signal: 101
                    },
                    {
                        name: registeredBeacons[1].name,
                        signal: 301
                    }
                ],
                room: mongoose.Types.ObjectId()
            };

            beaconNames = [registeredBeacons[0].name, registeredBeacons[1].name];
            signalMaps = [signalMap1, signalMap2, signalMap3]
        });

        it("Should estimate room to be signalMap 1", () => {
            const roomEstimation = exec();
            expect(roomEstimation.type.toString()).to.equal(signalMap1.room.toString());
        });

        it("Should return roomEstimation object with estimated room and percentage", () => {
            const roomEstimation = exec();
            expect(roomEstimation.type).to.be.ok;
            expect(roomEstimation.certainty).to.be.ok;
        });

        it("Should also work with reversed order", () => {
            signalMaps = [signalMap3, signalMap2, signalMap1];
            console.log(signalMaps.map(sm => sm.room));
            console.log(beaconNames);
            const roomEstimation = exec();
            expect(roomEstimation.type.toString()).to.equal(signalMap1.room.toString());
        });

        it("Should find correct room with 3 signalMaps", () => {
            let signalMap3 = {
                beacons: [
                    {
                        name: registeredBeacons[0].name,
                        signals: 20
                    },
                    {
                        name: registeredBeacons[1].name,
                        signals: 11
                    }
                ],
                room: mongoose.Types.ObjectId()
            };
            signalMaps = [signalMap1, signalMap3, signalMap2];

            const roomEstimation = exec();
            expect(roomEstimation.type.toString()).to.equal(signalMap1.room.toString());
        });

        it("Should return correct room when client beacons length is shorter than server beacon length", () => {

            signalMap1.beacons.push({
                name: registeredBeacons[0].name,
                signal: 52.5
            });
            signalMap2.beacons.push({
                name: registeredBeacons[0].name,
                signal: 52.5
            });

            const roomEstimation = exec();
            expect(roomEstimation.type.toString()).to.equal(signalMap1.room.toString());
        });

        it("Should also locate the right room when client posts more beacons than server has", () => {
            registeredBeacons.push({
                name: mongoose.Types.ObjectId(),
                signals: 52.5
            });

            const roomEstimation = exec();
            expect(roomEstimation.type.toString()).to.equal(signalMap1.room.toString());
        });

        it("Should estimate the correct room even though the nearest point is for another room with correct percentage", () => {
            // Define a third signal map to point to the same room as signalMap2
            let signalMap3 = {
                beacons: [
                    {
                        name: registeredBeacons[0].name,
                        signal: 52.5
                    },
                    {
                        name: registeredBeacons[1].name,
                        signal: 1.5
                    }
                ],
                room: signalMap2.room
            };

            signalMaps.push(signalMap3);
            // console.log(signalMaps);

            // should find 3 points. the closest point to room A, but the two others point to room B.
            // Should therefore estimate the room to be room B
            const roomEstimation = exec();
            expect(roomEstimation.type.toString()).to.equal(signalMap3.room.toString());
            expect(roomEstimation.certainty).to.approximately(66, 1);
        });


        it("Should not throw ", () => {
            signalMaps = [{
                isActive: true,
                _id: "5cc6ec3eaf4f896906f43f0d",
                room: "5cc6cd0e785ba2674dbc7482",
                beacons: [{name: "5ca4b1776a3ec26dfd07362d", signals: [-60]}, {
                    name: "5ca45b286a3ec26dfd0735b5",
                    signals: [-64]
                }],
                __v: 0
            }];

            registeredBeacons = [
                {signals: [-78], name: "5ca4b1776a3ec26dfd07362d"},
                {signals: [-70], name: "5ca45b286a3ec26dfd0735b5"}
            ];

            k = 2;
            const roomEstimation = exec();
            expect(roomEstimation.type).to.equal("5cc6cd0e785ba2674dbc7482")
        });
    });

    describe("update nearest neighbors", () => {
        let nearestNeighbors;
        let newNeighbor;

        beforeEach(() => {
            newNeighbor = {
                room: mongoose.Types.ObjectId(),
                distance: 3
            };

            nearestNeighbors = [{
                room: mongoose.Types.ObjectId(),
                distance: 1
            }, {
                room: mongoose.Types.ObjectId(),
                distance: 2
            }, {
                room: mongoose.Types.ObjectId(),
                distance: 4
            }]
        });

        const exec = () => {
            return updateNearestNeighbors(nearestNeighbors, newNeighbor);
        };

        it("Should return array with new neighbor", () => {
            const nearestNeighbors = exec();
            const index = nearestNeighbors.findIndex(elem => {
                return elem.room === newNeighbor.room
            });

            expect(index).to.not.equal(-1);
        });

        it("should return non-updated array when newNeighbor is further away", () => {
            const nearestNeighbors = exec();
            newNeighbor = {distance: 10, room: mongoose.Types.ObjectId()};

            const index = nearestNeighbors.findIndex(elem => elem.room === newNeighbor.room);

            expect(index).to.equal(-1);
        })
    });

    describe("Find the room that most neighbors point to", () => {
        let nearestNeighbors;
        let roomId1;
        let roomId2;
        beforeEach(() => {
            roomId1 = mongoose.Types.ObjectId();
            roomId2 = mongoose.Types.ObjectId();

            nearestNeighbors = [{
                room: roomId1,
                distance: 1
            }, {
                room: roomId2,
                distance: 2
            }, {
                room: roomId1,
                distance: 4
            }]
        });

        const exec = () => {
            return roomOfMostNeighbors(nearestNeighbors);
        };


        it("Should return the roomId that most neighbors point to", () => {
            const roomId = exec();
            expect(roomId).to.equal(roomId1.toString());
        });

        it("Should return correct roomId when room2 has most neighbors", () => {
            nearestNeighbors.push({
                room: roomId2,
                distance: 2
            });

            nearestNeighbors.push({
                    room: roomId2,
                    distance: 2
                }
            );
            const roomId = exec();
            expect(roomId.toString()).to.equal(roomId2.toString());
        });

        it("If more neighbors have max count the method should return the element with the lowest distance", () => {
            nearestNeighbors.push({
                room: roomId2,
                distance: 2
            });

            let newId = mongoose.Types.ObjectId();
            nearestNeighbors.push({
                room: newId,
                distance: 10
            });
            nearestNeighbors.push({
                room: newId,
                distance: 0
            });


            const roomId = exec();
            expect(roomId).to.equal(newId.toString());
        });
    });

    describe("find index of max distance neighbor", () => {
        let nearestNeighbors;

        beforeEach(() => {
            nearestNeighbors = [{
                room: mongoose.Types.ObjectId(),
                distance: 1
            }, {
                room: mongoose.Types.ObjectId(),
                distance: 2
            }, {
                room: mongoose.Types.ObjectId(),
                distance: 4
            }, {
                room: mongoose.Types.ObjectId(),
                distance: 3
            }]
        });

        const exec = () => {
            return findIndexOfMaxDistanceNeighbor(nearestNeighbors)
        };

        it("Should return correct index of max distance", () => {
            const index = exec();
            expect(index).to.equal(2);
        });

        it("Should return index of undefined neighbor", () => {
            nearestNeighbors[1] = undefined;
            const index = exec();
            expect(index).to.equal(1);

        })

    });

    describe('align and fill arrays', () => {

        let alignedBeaconNames;
        let unAlignedBeacons;
        let beaconName1;
        let beaconName2;
        let beaconName3;
        beforeEach(() => {
            beaconName1 = mongoose.Types.ObjectId();
            beaconName2 = mongoose.Types.ObjectId();
            beaconName3 = mongoose.Types.ObjectId();

            alignedBeaconNames = [beaconName1, beaconName2];

            unAlignedBeacons = [
                {
                    name: beaconName2,
                    signals: []
                },
                {
                    name: beaconName1,
                    signals: []
                }
            ]
        });

        const exec = () => {
            return alignAndFillArrays(alignedBeaconNames, unAlignedBeacons);
        };


        it("should return aligned beacons array", () => {

            const aligned = exec();

            expect(aligned[0].name).to.equal(alignedBeaconNames[0]);
            expect(aligned[1].name).to.equal(alignedBeaconNames[1]);
        });

        it("Should return aligned beacon array with array length 3", () => {

            unAlignedBeacons = [
                {
                    name: beaconName3,
                    signals: []
                },
                {
                    name: beaconName1,
                    signals: []
                }, {
                    name: beaconName2,
                    signals: []
                }
            ];

            alignedBeaconNames = [beaconName1, beaconName2, beaconName3];

            const aligned = exec();
            expect(aligned[2].name).to.equal(alignedBeaconNames[2]);
        });

        it("Should fill array with -100 if an item wasn't in beacon id", () => {
            let id4 = mongoose.Types.ObjectId();
            unAlignedBeacons = [
                {
                    name: beaconName3,
                    signal: -10
                },
                {
                    name: beaconName1,
                    signal: -20
                }, {
                    name: id4,
                    signal: -30
                }
            ];

            alignedBeaconNames = [beaconName1, beaconName2, beaconName3, id4];
            const res = exec();
            expect(res[1].signal).to.equal(-100);
        });

        it("Should throw if unaligned is not at least one length array ", () => {
            unAlignedBeacons = [];
            expect(exec).to.throw(TypeError);
        });

        it("Should throw if names empty", () => {
            alignedBeaconNames = [];
            expect(exec).to.throw(IllegalArgumentError);
        });
    });


});
