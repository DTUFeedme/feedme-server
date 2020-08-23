const mongoose = require('mongoose');
const Joi = require('joi');
const KnnManager = require("./knnManager");
const IllegalArgumentError = require("../errors/IllegalArgumentError");

const signalMapSchema = new mongoose.Schema({
    beacons: {
        type: [{
            beacon: {
                type: mongoose.Types.ObjectId,
                ref: "Beacon"
            },
            signals: [Number]
        }]
    },
    room: {
        type: mongoose.Types.ObjectId,
        ref: "Room"
    },
    isActive: {
        type: Boolean,
        default: false
    }
});

function alignAndFillArrays(alignedBeaconIds, unAlignedBeacons) {
    if (!alignedBeaconIds || alignedBeaconIds.length <=0)
        throw new IllegalArgumentError("alignedBeaconIds should be at least one-length array");

    // Create new array of aligned beacons
    const alignedBeacons = new Array(alignedBeaconIds.length);

    const signalLength = unAlignedBeacons[0].signals.length;


    for (let i = 0; i < alignedBeaconIds.length; i++) {
        // Find beacon with particular beacon id
        const beacon = unAlignedBeacons.find(beacon => {
              if (beacon.beaconId)
                  return beacon.beaconId.toString() === alignedBeaconIds[i].toString();
              return beacon._id.toString() === alignedBeaconIds[i].toString();
          });
        // If beacon doesn't already exist, then add it with lowest value (-100)
        if (!beacon) {
            alignedBeacons[i] = {
                beaconId: alignedBeaconIds[i],
                signals: new Array(signalLength).fill(-100)
            };
            alignedBeacons[i].signals.fill(-100)
        } else {
            alignedBeacons[i] = beacon;
        }
    }
    return alignedBeacons;
}

function updateNearestNeighbors(nearestNeighbors, newNeighbor) {

    const index = findIndexOfMaxDistanceNeighbor(nearestNeighbors);
    if (!nearestNeighbors[index] || newNeighbor.distance < nearestNeighbors[index].distance)
        nearestNeighbors[index] = newNeighbor;

    return nearestNeighbors;
}

function findIndexOfMaxDistanceNeighbor(nearestNeighbors) {
    let maxDistance = -1;
    let maxDistIndex = -1;

    for (let i = 0; i < nearestNeighbors.length; i++) {
        if (!nearestNeighbors[i])
            return i;

        if (nearestNeighbors[i].distance > maxDistance) {
            maxDistance = nearestNeighbors[i].distance;
            maxDistIndex = i;
        }
    }

    return maxDistIndex;
}

function maxSignalsAmount(signalMap) {

    let maxSignalsAmount = 0;

    for (let i = 0; i < signalMap.beacons.length; i++) {
        if (signalMap.beacons[i] && signalMap.beacons[i].signals) {
            const signalsAmount = signalMap.beacons[i].signals.length;
            if (maxSignalsAmount < signalsAmount)
                maxSignalsAmount = signalsAmount;
        }
    }
    return maxSignalsAmount;
}

function roomEstimation(clientBeacons, signalMaps, k, beaconIds) {

    if (!k)
        k = 3;

    const initialPoints = [];
    for (let i = 0; i < signalMaps.length; i++) {
        const alignedServerBeacons = alignAndFillArrays(beaconIds, signalMaps[i].beacons);
        for (let j = 0; j < alignedServerBeacons[0].signals.length; j++) {
            const vector = [];
            for (let l = 0; l < alignedServerBeacons.length; l++) {
                vector.push(
                  alignedServerBeacons[l].signals[j]
                )
            }
            initialPoints.push({vector, type: signalMaps[i].room.toString()})
        }
    }


    if (initialPoints.length < k)
        k = initialPoints.length;

    const dimension = beaconIds.length;
    const knnManager = new KnnManager(dimension, initialPoints, k);

    const newPointVector = [];
    const alignedClientBeacons = alignAndFillArrays(beaconIds, clientBeacons);
    for (let i = 0; i < alignedClientBeacons.length; i++) {
        newPointVector.push(alignedClientBeacons[i].signals[0]);
    }

    const newPoint = {
        vector: newPointVector
    };

    return knnManager.pointTypeEstimation(newPoint);

    /*let nearestNeighbors = new Array(k);
    nearestNeighbors[0] = {
        room: signalMaps[0].room,
        distance: Number.MAX_SAFE_INTEGER
    };

    for (let i = 0; i < signalMaps.length; i++) {

        const alignedBeacons = alignedClientBeacons(signalMaps[i].beacons, clientBeacons);
        const maxAmountOfSignals = maxSignalsAmount(signalMaps[i]);

        for (let j = 0; j < maxAmountOfSignals; j++) {

            let sum = 0;
            for (let k = 0; k < signalMaps[i].beacons.length; k++) {
                if (!alignedBeacons[k]) {
                    alignedBeacons[k] = {
                        signals: [signalMaps[i].beacons[k].signals[j]]
                    };
                }

                const clientSignal = alignedBeacons[k].signals[0];
                sum += (signalMaps[i].beacons[k].signals[j] - clientSignal) ** 2;
            }

            const distance = Math.sqrt(sum);

            nearestNeighbors = updateNearestNeighbors(nearestNeighbors, {
                room: signalMaps[i].room,
                distance
            });
        }
    }

    return roomOfMostNeighbors(nearestNeighbors);*/
}

function roomOfMostNeighbors(nearestNeighbors) {
    const roomCount = [];
    const roomIds = new Set();
    const minDistances = [];

    for (let i = 0; i < nearestNeighbors.length; i++) {
        let roomAmount = roomIds.size;

        roomIds.add(nearestNeighbors[i].room.toString());
        let addedIndex;
        if (roomAmount !== roomIds.size) {
            roomCount.push(0);
            minDistances.push(nearestNeighbors[i].distance);
            addedIndex = roomCount.length - 1;
        } else {
            addedIndex = [...roomIds].indexOf(nearestNeighbors[i].room.toString());
            roomCount[addedIndex]++;

            if (minDistances[addedIndex] > nearestNeighbors[i].distance)
                minDistances[addedIndex] = nearestNeighbors[i].distance;
        }
    }
    const maxCount = Math.max(...roomCount);

    const roomIdArray = Array.from(roomIds);
    const indexOfMax = roomCount.indexOf(maxCount);

    let minDistIndex = -1;
    let minDistance = Number.MAX_SAFE_INTEGER;


    if (roomCount.filter(elem => elem === maxCount).length > 1) {
        for (let i = 0; i < roomCount.length; i++) {
            if (roomCount[i] === maxCount && minDistance > minDistances[i]) {
                minDistance = minDistances[i];
                minDistIndex = i;
            }
        }
        return roomIdArray[minDistIndex]
    } else {
        return roomIdArray[indexOfMax];
    }


}

const SignalMap = mongoose.model('SignalMap', signalMapSchema);

function validateSignalMap(signalMap) {
    const schema = {
        beacons: Joi.array().items(Joi.object({
            name: Joi.string()
                .required(),
            signals: Joi.array().items(Joi.number().min(-200).max(0))
        }).required()).required(),
        roomId: Joi.objectId(),
        buildingId: Joi.objectId()
    };
    return Joi.validate(signalMap, schema);
}

exports.SignalMap = SignalMap;
exports.validate = validateSignalMap;
exports.signalMapSchema = signalMapSchema;
exports.roomTypeEstimation = roomEstimation;
exports.alignAndFillArrays = alignAndFillArrays;
exports.updateNearestNeighbors = updateNearestNeighbors;
exports.findIndexOfMaxDistanceNeighbor = findIndexOfMaxDistanceNeighbor;
exports.roomOfMostNeighbors = roomOfMostNeighbors;
