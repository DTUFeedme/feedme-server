var db = connect('127.0.0.1:27017/feedme-dev');

const signalMaps = db.signalmaps.find();
const beacons = db.beacons.find();

beaconNameMap = {
    "7ZGI": "43300 - 17321",
}

beacons.forEach(b => {
    const newName = beaconNameMap[b.name];

    if (newName) {
        print("updated beacon from " + b.name + " to " + newName);
        db.beacons.update({_id: b._id}, {$set: {name: newName}});
    } else {
        print("Couldn't find beacon with name " + b.name);
    }
});

signalMaps.forEach(sm => {
    const beacons = []
    sm.beacons.forEach(b => {
        const newName = beaconNameMap[b.name];

        if (newName) {
            print("updated beacon with name " + b.name + " to " + newName);
            beacons.push({signal: b.signal, name: newName});
        } else {
            print("Couldn't find beacon with name " + b.name);
            beacons.push({signal: b.signal, name: b.name});
        }
    });

    db.signalmaps.update({_id: sm._id}, {
        $set: {
            beacons
        },
    });

});