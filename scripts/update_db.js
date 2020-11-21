var db = connect('127.0.0.1:27017/feedme');

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


signalmaps.forEach(sm => {


    let signalLength = sm.beacons[0].signals.length;
    for (let i = 0; i < sm.beacons.length; i++) {
        if (sm.beacons[i].signals.length !== signalLength){
            if (sm.room){
                let rooms = db.rooms.find({_id: sm.room});
                let buildings = db.buildings.find({_id: rooms[0].building});
                print(buildings[0].name);
                print(sm._id);
                print(rooms[0].name);
                print(rooms[0].building);
                print(sm._id);
                print(sm.beacons[i].name);
                print(sm.beacons[i]._id);
                print("ERROR!!! signal length was different");
                print("")
            }
        }
        // printjson(sm.beacons[i]);
    }
    // sm.beacons.forEach(b => {
    //
    //     printjson(b);
    // });
    // printjson(sm);
});