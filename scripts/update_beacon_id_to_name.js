
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

beacons.forEach(b => {
    let foundBeacon = false;
    signalMaps.forEach(sm => {
        let foundBInSm = false;
        if (sm.beacons.length === 0) {
            print("wait")
            return;
        }

        sm.beacons.forEach(beacon => {
            if (foundBeacon)
                return;

            if (beacon._id.toString() === b._id.toString()){
                print("Found");
                foundBeacon = true;
                foundBInSm = true;
            }
        });
        if (!foundBInSm)
            print("beacon " + b._id.toString() + " not found in sm " + sm._id.toString());
    });
    if (!foundBeacon)
        print("beacon " + b._id.toString() + " not found in any sm");

    // const newName = beaconNameMap[b.name];

    // if (newName) {
    //     print("updated beacon from " + b.name + " to " + newName);
    //     db.beacons.update({_id: b._id}, {$set: {name: newName}});
    // } else {
    //     print("Couldn't find beacon with name " + b.name);
    // }
});
signalMaps.forEach(sm => {
    const beacons = []
    sm.beacons.forEach(b => {
        // print(b._id.toString());
        if (b._id.toString() === "ObjectId(\"5e37f440090d4f722ad1a21d\")"){
            print("whaat " + sm._id + " " + b._id);
        }
        if (b._id.toString() === "ObjectId(\"5e37f456090d4f722ad1a21e\")"){
            print("whaaaat " + sm._id + " " + b._id);
        }
        if (b._id.toString() === "ObjectId(\"5da421fa4626d722db476ab4\")"){
            // print("whaaaat " + sm._id + " " + b._id);
        }

        if (!b.name) {
            if (!b._id){
                print("wtf ");
                printjson(b);
            } else {
                const room = db.rooms.findOne({_id: sm.room});
                const beacon = db.beacons.findOne({_id: b._id});

                if (room.building.toString() !== beacon.building.toString()){
                    print(" weird " + room.building + " " + beacon.building + " sm: " + sm._id + " beacon: " + b._id);
                } else {
                    // print("ok");
                }
            }
        } else {
            print("b with name " + sm._id);
        }
        // const newName = beaconNameMap[b.name];
        //
        // if (newName) {
        //     print("updated beacon with name " + b.name + " to " + newName);
        //     beacons.push({signal: b.signal, name: newName});
        // } else {
        //     print("Couldn't find beacon with name " + b.name);
        //     beacons.push({signal: b.signal, name: b.name});
        // }
    });

    // db.signalmaps.update({_id: sm._id}, {
    //     $set: {
    //         beacons
    //     },
    // });

});