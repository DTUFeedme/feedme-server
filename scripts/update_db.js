var db = connect('127.0.0.1:27017/feedme-dev');

var users = db.users.find({});
var buildings = db.buildings.find();
var signalmaps = db.signalmaps.find();


// Id of Høje Taastrup school building: 5da41e00c525af695b69a72e

// Removing all buildings except for 5da41e00c525af695b69a72e,
// and all rooms, signalmaps, questions and feedback belonging to those buildings
buildings.forEach(b => {

    // if (b._id.toString() !== "ObjectId(\"5da41e00c525af695b69a72e\")") {
    if (b._id.toString() !== "ObjectId(\"5db746c4d4449b0aa6b77e69\")") {

        db.buildings.remove({_id: b._id});
        print("removed building with name " + b.name);
        var rooms = db.rooms.find({building: b._id});

        rooms.forEach(r => {
            db.rooms.remove({_id: r._id});
            print("removed room");

            var questions = db.questions.find({rooms: {$all: [r._id]}});
            questions.forEach(q => {
                db.questions.remove({_id: q._id});
                print("removed question " + q.value);

                q.answerOptions.forEach(ao => {
                    db.answers.remove({_id: ao._id});
                    print("removed answer");
                });
            });

            var feedbacks = db.feedbacks.find({room: r._id});
            feedbacks.forEach(f => {
                db.feedbacks.remove({_id: f._id});
                print("removed feedback");
            });

            var signalmaps = db.signalmaps.find({room: r._id});
            signalmaps.forEach(sm => {
                db.signalmaps.remove({_id: sm._id});
                print("removed sm");
            });
        });
    }
});

// Updating all buildings without admins array with empty array.
buildings.forEach(b => {
    if (!b.admins)
        db.buildings.updateOne({_id: b._id}, {$set: {admins: []}});
});

// Add admins to all buildings
users.forEach(user => {
    if (user.adminOnBuildings) {
        user.adminOnBuildings.forEach(bId => {
            db.buildings.updateOne({_id: bId}, {$push: {admins: user._id}})
        });
        db.users.updateOne({_id: user._id}, {$unset: {adminOnBuildings: ""}});
    }
});

// Convert signalmap with array of signals to individual signalmaps
signalmaps = db.signalmaps.find();

signalmaps.forEach(sm => {
    let signalLength = sm.beacons[0].signals.length;
    db.signalmaps.remove({_id: sm._id});

    for (let i = 0; i < sm.beacons[0].signals.length; i++) {
        var newSm = {
            isActive: true,
            room: sm.room,
            beacons: []
        }

        for (let j = 0; j < sm.beacons.length; j++) {
            if (sm.beacons[j].signals.length !== signalLength) {
                var room = db.rooms.findOne({_id: sm.room});
                print("ERROR WITH SM " + sm._id + " from building "+ room.building);
                return;
            }
            let beacon = db.beacons.findOne({name: sm.beacons[j].name});
            if (!beacon) {
                let room = db.rooms.findOne({_id: sm.room});
                db.beacons.insert({name: sm.beacons[j].name, building: room.building});
            }
            newSm.beacons.push({name: sm.beacons[j].name, signal: sm.beacons[j].signals[i]});
        }

         db.signalmaps.insert(newSm);
    }
});