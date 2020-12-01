
var db = connect('127.0.0.1:27017/feedme');

const signalMaps = db.signalmaps.find();
const beacons = db.beacons.find();


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

// beacons.forEach(b => {
//     // print("what " + b._id.toString() + " signalMaps"  + signalMaps.length);
//     let foundBeacon = false;
//
//     const sms = db.signalmaps.find();
//
//     sms.forEach(sm => {
//         let foundBInSm = false;
//
//         sm.beacons.forEach(beacon => {
//             if (foundBInSm)
//                 return;
//
//             if (beacon._id.toString() === b._id.toString()){
//                 print("Found beacon " + beacon._id.toString() + " in sm " + sm._id.toString());
//                 foundBeacon = true;
//                 foundBInSm = true;
//             }
//         });
//         if (!foundBInSm)
//             print("beacon " + b._id.toString() + " not found in sm " + sm._id.toString());
//     });
//
//     if (!foundBeacon)
//         print("beacon " + b._id.toString() + " not found in any sm");
// });

signalMaps.forEach(sm => {
    sm.beacons.forEach(b => {
        if (b.name === "7ZGI"){
            print("whaaaat " + sm._id );
        }

    });

    // db.signalmaps.update({_id: sm._id}, {
    //     $set: {
    //         beacons
    //     },
    // });

});