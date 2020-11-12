const request = require('supertest');
const {User} = require('../../models/user');
const {Room} = require('../../models/room');
const {Building} = require('../../models/building');
const {Question} = require('../../models/question');
const {Answer} = require('../../models/answer');
const mongoose = require('mongoose');
const assert = require('assert');
const app = require('../..');
const config = require('config');
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const expect = require('chai').expect;
const {v4: uuidv4} = require('uuid');

describe('/api/questions', () => {
    let server;
    let user;
    let url;

    before(async () => {
        server = await app.listen(config.get('port'));
        await mongoose.connect(config.get('db'), {useNewUrlParser: true, useUnifiedTopology: true});
    });
    after(async () => {
        await server.close();
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        user = new User({refreshToken: uuidv4()});
        await user.save();
    });
    afterEach(async () => {
        await User.deleteMany();
        await Building.deleteMany();
        await Room.deleteMany();
        await Question.deleteMany();
        await Answer.deleteMany();
    });

    describe('GET /', () => {

        let room;
        let building;
        let buildingId;
        let roomId;
        let token;
        let answerOption1;
        let answerOption2;
        let queryString;
        let question;

        const exec = () => {
            return request(server)
                .get('/api/questions' + queryString)
                .set({'x-auth-token': token, 'roomId': roomId});
        };

        beforeEach(async () => {
            building = new Building({name: '12345'});
            await building.save();
            buildingId = building._id;
            queryString = "";

            room = new Room({
                building: buildingId,
                name: "12345",
                location: "12345"
            });

            await room.save();
            roomId = room._id;
            token = user.generateAuthToken();
            answerOption1 = new Answer({value: "hej"});
            answerOption2 = new Answer({value: "hej2"});
            await answerOption1.save();
            await answerOption2.save();
            question = new Question({
                value: "12345",
                rooms: [roomId],
                answerOptions: [answerOption1, answerOption2]
            });

            await question.save();
        });

        it('Should return 401 if token not provided', async () => {
            token = null;
            const res = await exec();
            expect(res.statusCode).to.equal(401);

        });

        it('401 if wrong token format sent', async () => {
            token = "hej";
            const res = await exec();
            expect(res.statusCode).to.equal(401);
        });

        it('404 if user was not found', async () => {
            user = new User({refreshToken: uuidv4()});
            token = user.generateAuthToken();
            const res = await exec();
            expect(res.statusCode).to.equal(404);
        });

        it('400 if roomId not provided', async () => {
            roomId = null;
            const res = await exec();
            expect(res.statusCode).to.equal(400);
        });

        it('400 if roomId was wrong format', async () => {
            roomId = '12345';
            const res = await exec();
            expect(res.statusCode).to.equal(400);
        });

        it('404 if room was not found', async () => {

            roomId = mongoose.Types.ObjectId();
            const res = await exec();
            expect(res.statusCode).to.equal(404);

        });
        it('should return questions array with 1 length', async () => {
            const res = await exec();
            expect(res.body.length).to.be.equal(1);
        });

        it('should return 200 when getting questions array with valid parameters', async () => {
            const res = await exec();
            expect(res.status).to.be.equal(200);
        });

        it('should return question object with roomId field', async () => {
            const res = await exec();
            assert.strictEqual(res.body[0].rooms[0], roomId.toString());
        });

        it('should only return questions from detected room/building', async () => {

            const building2 = new Building({name: '56789'});
            await building2.save();

            const room2 = new Room({building: building2._id, name: "hej", location: "hej"});
            await room2.save();

            const question2 = new Question({
                value: "12345",
                rooms: [room2.id],
                answerOptions: [{
                    _id: mongoose.Types.ObjectId(),
                    value: "hej"
                }, {
                    _id: mongoose.Types.ObjectId(),
                    value: "hej2"
                }]
            });

            await question2.save();

            const res = await exec();
            assert.strictEqual(res.body.length, 1);
        });


        it("Should return answer options", async () => {
            const res = await exec();
            expect(res.body[0].answerOptions.length).to.equal(2);
        });

        it("Should return answer options with name", async () => {
            const res = await exec();
            expect(res.body[0].answerOptions[0].value).to.equal(answerOption1.value);
        });

        it("Should return answer options with id", async () => {
            const res = await exec();
            expect(res.body[0].answerOptions[0]._id).to.equal(answerOption1.id);
        });

        // TODO: Feature might be added in the future
        /*it("Should only return question which user hasn't answered", async () => {
            queryString = "/?notAnswered=true";
            question.usersAnswered.push(user._id);
            await question.save();

            const res = await exec();
            expect(res.body.length).to.equal(0);
        })*/
    });

    describe("GET /active", () => {
        let room;
        let building;
        let buildingId;
        let roomId;
        let token;

        const exec = () => {
            return request(server)
                .get('/api/questions/active')
                .set({'x-auth-token': token, 'roomId': roomId});
        };

        beforeEach(async () => {
            building = new Building({name: '12345'});
            await building.save();
            buildingId = building._id;

            room = new Room({
                building: buildingId,
                name: "12345",
                location: "12345"
            });

            await room.save();
            roomId = room._id;
            token = user.generateAuthToken();

            const question = new Question({
                value: "12345",
                rooms: [roomId],
                answerOptions: [{
                    value: "123",
                    _id: mongoose.Types.ObjectId()
                }, {
                    value: "1234",
                    _id: mongoose.Types.ObjectId()
                }]
            });

            await question.save();
        });

        it("Should only return active questions", async () => {
            const question2 = new Question({
                value: "12345",
                rooms: [roomId],
                isActive: false,
                answerOptions: [{
                    value: "123",
                    _id: mongoose.Types.ObjectId()
                }, {
                    value: "1234",
                    _id: mongoose.Types.ObjectId()
                }]
            });

            await question2.save();

            const res = await exec();
            expect(res.body.length).to.equal(1);
        });
    });

    describe('POST /', () => {

        url = '/api/questions';
        let building;
        let value;
        let buildingId;
        let roomId;
        let token;
        let answerOptions;
        let isActive;
        let rooms;

        beforeEach(async () => {
            value = '12345';
            building = new Building({name: value, admins: [user.id]});
            await building.save();
            buildingId = building._id;
            const room = new Room({name: '222', location: "123", building: buildingId});
            await room.save();
            roomId = room._id;
            user.role = 1;
            rooms = [roomId];
            answerOptions = ["Too hot", "Too cold"];

            token = user.generateAuthToken();
            await user.save();
        });

        const exec = () => {
            return request(server)
                .post(url)
                .set('x-auth-token', token)
                .send({rooms, value, answerOptions});
        };

        it('401 if token not provided', async () => {
            token = null;
            const res = await exec();
            expect(res.statusCode).to.equal(401);
        });

        it('401 if token not valid', async () => {
            token = '12345';
            const res = await exec();
            expect(res.statusCode).to.equal(401);
        });

        it('404 if user was not found', async () => {

            const user2 = new User({refreshToken: uuidv4()});
            token = user2.generateAuthToken();
            const res = await exec();
            expect(res.statusCode).to.equal(404);

        });

        it('400 if roomId not provided', async () => {
            rooms = [null];
            const res = await exec();
            expect(res.statusCode).to.equal(400);
        });

        it('400 if roomId not valid', async () => {
            rooms = ['12345'];
            const res = await exec();
            expect(res.statusCode).to.equal(400);
        });

        it("400 if question posted in rooms of different buildings", async () => {

            const building = await new Building({
                name: "heej",
                admins: [user.id]
            }).save();

            user.role = 1;
            token = user.generateAuthToken();
            await user.save();
            const room = await new Room({
                building: building.id,
                name: "hej"
            }).save();

            rooms = [roomId, room.id];
            const res = await exec();
            expect(res.statusCode).to.equal(400);
        });

        it("Should work", async () => {
            const room1 = new Room({name: "hey", _id: "5f466a7ed1978e571def36cd", building: buildingId});
            const room2 = new Room({name: "hej", _id: "5f466e65d1978e571def3719", building: buildingId});
            await room1.save();
            await room2.save();

            rooms = [room1.id,room2.id];
            value = "rI d";
            answerOptions = ["jj","hjyr"];

            const res = await exec();

            expect(res.statusCode).to.equal(200);
        });

        it('404 if roomId not found', async () => {
            rooms = [mongoose.Types.ObjectId()];
            const res = await exec();
            expect(res.statusCode).to.equal(404);
        });

        it('400 if value not provided', async () => {
            value = null;
            const res = await exec();
            expect(res.statusCode).to.equal(400);
        });

        it("Should return 403 if user not authorized role (1)", async () => {
            user.role = 0;
            await user.save();

            const res = await exec();
            expect(res.statusCode).to.equal(403);
        });

        it('403 if user not admin on building', async () => {
            building.admins = [];
            await  building.save();
            const res = await exec();
            expect(res.statusCode).to.equal(403);
        });

        it("Should return 400 if two or more answer options were not given", async () => {
            answerOptions = null;
            const res = await exec();
            expect(res.statusCode).to.equal(400);
        });

        it("Should return 400 if answeroptions did not have minimum 2 elements", async () => {
            answerOptions = ["Too hot"];
            const res = await exec();
            expect(res.statusCode).to.equal(400);
        });

        it('should return question object with proper room id', async () => {
            const res = await exec();
            assert.strictEqual(res.body.rooms[0], roomId.toString());
        });

        it('should only return 1 length array when posted question for two different rooms', async () => {
            const building2 = new Building({name: '12345'});
            await building2.save();

            const room2 = new Room({
                building: building2._id,
                name: "12345",
                location: "12345"
            });
            await room2.save();

            await request(server)
                .post(url)
                .set('x-auth-token', user.generateAuthToken())
                .send({rooms: [roomId], value: '12345', answerOptions: ["hej", "hej2"]});

            building2.admins = [user.id];
            await building2.save();

            await request(server)
                .post(url)
                .set('x-auth-token', user.generateAuthToken())
                .send({rooms: [room2.id], value: '12345', answerOptions: ["hej", "hej2"]});

            const res = await request(server)
                .get(url)
                .set({roomId: roomId, "x-auth-token": user.generateAuthToken(), answerOptions: ["hej", "hej2"]});

            assert.strictEqual(res.body.length, 1);
        });

        it("Should automatically set isActive to false if not set", async () => {
            const res = await exec();
            expect(res.body.isActive).to.be.true;
        });

        it("Should have answer options when question posted", async () => {
            const res = await exec();
            expect(res.body.answerOptions[0].value).to.equal(answerOptions[0]);
            expect(res.body.answerOptions[1].value).to.equal(answerOptions[1]);
        });

        it("Should trim answerOptions", async () => {
            answerOptions[0] = "       hej hej   ";
            const res = await exec();
            expect(res.body.answerOptions[0].value).to.equal("hej hej");
        });
    });

    describe("PATCH /:id change isActive of question", () => {

        let questionId;
        let token;
        let building;
        let buildingId;
        let room;
        let roomId;
        let isActive;
        let body;

        const exec = () => {
            return request(server)
                .patch('/api/questions/setActive/' + questionId)
                .set({'x-auth-token': token, 'roomId': roomId})
                .send(body);
        };

        beforeEach(async () => {
            building = new Building({name: '12345'});
            await building.save();
            buildingId = building._id;

            room = new Room({
                building: buildingId,
                name: "12345",
                location: "12345"
            });

            await room.save();
            roomId = room._id;
            token = user.generateAuthToken();

            const question = new Question({
                value: "12345",
                rooms: [roomId],
                isActive: false,
                answerOptions: [{
                    value: "123",
                    _id: mongoose.Types.ObjectId()
                }, {
                    value: "1234",
                    _id: mongoose.Types.ObjectId()
                }]
            });

            await question.save();
            questionId = question.id;

            body = {};
            body.isActive = true;
        });

        it("Should return 400 if isActive not provided", async () => {
            body = {};
            const res = await exec();
            expect(res.statusCode).to.equal(400);
        });
        it("Should change isActive", async () => {
            const res = await exec();
            expect(res.body.isActive).to.be.true;
        });
    });

    describe("DELETE /:id ", () => {
        let building;
        let buildingId;
        let room;
        let roomId;
        let token;
        let questionId;

        const exec = () => {
            return request(server)
                .delete('/api/questions/' + questionId)
                .set({'x-auth-token': token, 'roomId': roomId});
        };

        beforeEach(async () => {
            building = new Building({name: '12345', admins: [user.id]});
            await building.save();
            buildingId = building._id;

            room = new Room({
                building: buildingId,
                name: "12345",
                location: "12345"
            });

            await room.save();
            roomId = room._id;

            token = user.generateAuthToken();
            await user.save();

            const question = new Question({
                value: "12345",
                rooms: [roomId],
                isActive: false,
                answerOptions: [{
                    value: "123",
                    _id: mongoose.Types.ObjectId()
                }, {
                    value: "1234",
                    _id: mongoose.Types.ObjectId()
                }]
            });

            await question.save();
            questionId = question.id;
        });


        it("Should only contain one question in db after deleted one", async () => {
            await new Question({
                value: "12345",
                rooms: [roomId],
                isActive: false,
                answerOptions: [{
                    value: "123",
                    _id: mongoose.Types.ObjectId()
                }, {
                    value: "1234",
                    _id: mongoose.Types.ObjectId()
                }]
            }).save();

            await exec();
            const questions = await Question.find();
            expect(questions.length).to.equal(1);
        });

        it("Should return 403 if user was not admin on building with question", async () => {

            const newRoom = await new Room({
                building: mongoose.Types.ObjectId(),
                name: "12345",
                location: "12345"
            }).save();

            const newQuestion = await new Question({
                value: "12345",
                rooms: [newRoom.id],
                isActive: false,
                answerOptions: [{
                    value: "123",
                    _id: mongoose.Types.ObjectId()
                }, {
                    value: "1234",
                    _id: mongoose.Types.ObjectId()
                }]
            }).save();

            questionId = newQuestion.id;
            const res = await exec();
            expect(res.statusCode).to.equal(403);

        });
        it("Should delete all answers for that question", async () => {
            const q = await new Question({
                value: "12345",
                rooms: [roomId],
                isActive: false
            });

            const a1 = await new Answer({
                value: "123",
                question: q.id
            }).save();
            const a2 = await new Answer({
                value: "123",
                question: mongoose.Types.ObjectId()
            }).save();
            const a3 = await new Answer({
                value: "123",
                question: q.id
            }).save();

            q.answerOptions.push(a1);
            q.answerOptions.push(a3);


            await q.save();
            questionId = q.id;

            await exec();
            const answers = await Answer.find();

            expect(answers.length).to.equal(1);
        });

        it("Should return id of deleted question", async () => {
            const res = await exec();
            expect(res.body._id).to.equal(questionId.toString());
        });
    });
});
