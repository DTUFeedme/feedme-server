var db = connect('127.0.0.1:27017/feedme-dev');

// const users = db.users.find({});
// console.log(users);

var users = db.users.find({});
var buildings = db.buildings.find();
var signalmaps = db.signalmaps.find();


// buildings.forEach(b => {
//     if (!b.admins)
//         db.buildings.updateOne({_id: b._id}, {$set: {admins: []}});
// });
//
// users.forEach(user => {
//
//     if (user.adminOnBuildings){
//         user.adminOnBuildings.forEach(bId => {
//             db.buildings.updateOne({_id: bId}, {$push: {admins: user._id}})
//         });
//         db.users.updateOne({_id: user._id}, {$unset: {adminOnBuildings: ""}});
//     }
// });
// feedme on server: 5da41e00c525af695b69a72e
buildings.forEach(b => {
    if (b._id.toString() !== "ObjectId(\"5da41e00c525af695b69a72e\")"){
        // db.buildings.remove({_id: b._id});
        var rooms = db.rooms.find({building: b._id});
        rooms.forEach(r => {
            // db.rooms.remove({_id: r._id});
            var questions = db.questions.find({rooms: {$all: [r._id]}});
            questions.forEach(q => {
                printjson(q);
            });
            // printjson(questions);
        });
        // print("hey");
    }

});

signalmaps.forEach(sm => {

    let signalLength = sm.beacons[0].signals.length;
    // print(sm.room);

    for (let i = 0; i < sm.beacons.length; i++) {


        // if (sm.beacons[i].signals.length !== signalLength){

                // let room = db.rooms.findOne({_id: sm.room});
                // let buildings = db.buildings.findOne({_id: room.building});
                // print(buildings[0].name);
                // print(sm._id);
                // print(room.name);
                // print(room.building);
                // print(sm._id);
                // print(sm.beacons[i].name);
                // print(sm.beacons[i]._id);
                // print("ERROR!!! signal length was different");
                // print("")
        // }
        // printjson(sm.beacons[i]);
    }
    // sm.beacons.forEach(b => {
    //
    //     printjson(b);
    // });
    // printjson(sm);
});