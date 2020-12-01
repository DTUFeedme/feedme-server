var db = connect('127.0.0.1:27017/feedme');

var users = db.users.find({});
var buildings = db.buildings.find();
var signalmaps = db.signalmaps.find();


beaconNameMap = {
    "7ZGI": "43300 - 17321",
    "CQS0": "51362 - 64784",
    "x2tk": "49930 - 17199",
    "fBDa": "7096 - 10821",
    "btFo": "43639 - 31347",
    "b6dI": "9952 - 63242",
    "FizX": "18258 - 20914",
    "Pgoi": "11801 - 44771",
    "r0eb": "61766 - 9231",
    "RY5g": "21852 - 43249",
    "wDTZ": "27401 - 17544",
    "Kj8Y": "49306 - 45015",
    "FImF": "62557 - 53798",
    "djc3": "31017 - 1287",
    "kBkf": "63568 - 55761",
    "FerW": "5594 - 11048",
    "UTNO": "55146 - 34671"
}

// Id of Høje Taastrup school building: 5da41e00c525af695b69a72e

// Removing all buildings except for 5da41e00c525af695b69a72e,
// and all rooms, signalmaps, questions and feedback belonging to those buildings
// buildings.forEach(b => {
//     if (b._id.toString() !== "ObjectId(\"5da41e00c525af695b69a72e\")") {
//     // if (b._id.toString() !== "ObjectId(\"5f37fcdae47d4e070d85aa83\")") {
//
//         db.buildings.remove({_id: b._id});
//         print("removed building with name " + b.name);
//         var rooms = db.rooms.find({building: b._id});
//
//         rooms.forEach(r => {
//             db.rooms.remove({_id: r._id});
//             print("removed room");
//
//             var questions = db.questions.find({rooms: {$all: [r._id]}});
//             questions.forEach(q => {
//                 db.questions.remove({_id: q._id});
//                 print("removed question " + q.value);
//
//                 q.answerOptions.forEach(ao => {
//                     db.answers.remove({_id: ao._id});
//                     print("removed answer");
//                 });
//             });
//
//             var feedbacks = db.feedbacks.find({room: r._id});
//             feedbacks.forEach(f => {
//                 db.feedbacks.remove({_id: f._id});
//                 print("removed feedback");
//             });
//
//             var signalmaps = db.signalmaps.find({room: r._id});
//             signalmaps.forEach(sm => {
//                 db.signalmaps.remove({_id: sm._id});
//                 print("removed sm");
//             });
//         });
//     }
// });
//
// Updating all buildings without admins array with empty array.
// buildings.forEach(b => {
//     if (!b.admins)
//         db.buildings.updateOne({_id: b._id}, {$set: {admins: []}});
// });
//
// // Add admins to all buildings
// users.forEach(user => {
//     if (user.adminOnBuildings) {
//         user.adminOnBuildings.forEach(bId => {
//             db.buildings.updateOne({_id: bId}, {$push: {admins: user._id}})
//         });
//         db.users.updateOne({_id: user._id}, {$unset: {adminOnBuildings: ""}});
//     }
// });

// Convert signalmap with array of signals to individual signalmaps
signalmaps = db.signalmaps.find();
let smInserted = 0;
let smRemoved = 0;
let totalBeacons = 0;
let beaconsAvoided = 0;
let totalBeaconsInserted = 0;

signalmaps.forEach(sm => {
    let signalLength = sm.beacons[0].signals.length;
    // print("removed sm " + smRemoved);
    smRemoved++;
    // db.signalmaps.remove({_id: sm._id});


    for (let i = 0; i < sm.beacons[0].signals.length; i++) {
        var newSm = {
            isActive: true,
            room: sm.room,
            beacons: []
        }

        for (let j = 0; j < sm.beacons.length; j++) {
            totalBeacons++;


            if (sm.beacons[j].signals.length !== signalLength) {
                print(sm.beacons[j].signals.length);
                print(signalLength);
                var room = db.rooms.findOne({_id: sm.room});
                print("ERROR WITH SM " + sm._id + " from building " + room.building);
                return;
            }

            let beacon = db.beacons.findOne({_id: sm.beacons[j]._id});

            let bNewName = beaconNameMap[beacon.name]


            // if (!beacon) {
            //     let room = db.rooms.findOne({_id: sm.room});
            //     // db.beacons.insert({name: sm.beacons[j].name, building: room.building});
            // }
            if (beacon.name !== "7ZGI") {
                newSm.beacons.push({name: bNewName, signal: sm.beacons[j].signals[i]});
                totalBeaconsInserted++;
            } else {
                beaconsAvoided++;
            }

        }

        // print("inserted " + smInserted);
        smInserted++;
        // db.signalmaps.insert(newSm);

    }


});

print("inserted " + smInserted + " sms");
print("sms removed " + smRemoved);
print("total beacons " + totalBeacons);
print("total beacons inserted " + totalBeaconsInserted);
print("beacons avoided " + beaconsAvoided);