var db = connect('127.0.0.1:27017/feedme-dev');

const signalMaps = db.signalmaps.find();
const beacons = db.beacons.find();

beaconNameMap = {
    "7ZGI": "43300 - 17321",
}

beacons.forEach(b => {
    const newName = beaconNameMap[b.name];

    if (newName) {
        db.beacons.updateOne({_id: b._id}, {name: newName});
    } else {
        print("hmm");
    }
});