
var db = connect('127.0.0.1:27017/feedme');

const signalMaps = db.signalmaps.find();
const beacons = db.beacons.find();


beaconNameMap = {
    "7ZGI": "43300 - 17321",
}

beacons.forEach(b => {
    const newName = beaconNameMap[b.name];

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
        print(b._id.toString());
        if (b._id.toString() === "ObjectId(\"5db55d1256505b7106423e49\")"){
            print("whaat")
        }
        if (b._id.toString() === "ObjectId(\"5e37f456090d4f722ad1a21e\")"){
            print("whaaaat")
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
                    print("ok");
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