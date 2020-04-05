const {User} = require('../../models/user');
const {Building} = require('../../models/building');
const {Question} = require('../../models/question');
const {Feedback} = require('../../models/feedback');
const {Room} = require('../../models/room');
const {Beacon} = require('../../models/beacon');
const {Answer} = require('../../models/answer');
const logger = require('../../startup/logger');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../..');
const config = require('config');
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const expect = require('chai').expect;
const jwt = require("jsonwebtoken");

describe('/api/feedback', () => {
    let server;
    let user;
    let room;
    let question;
    let building;
    let token;
    let roomId;
    let answer;
    let questionId;
    let answerId;

    before(async () => {
        server = await app.listen(config.get('port'));
        await mongoose.connect(config.get('db'), {useNewUrlParser: true});
    });
    after(async () => {
        await server.close();
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        user = new User();
        await user.save();
    });
    afterEach(async () => {
        await User.deleteMany();
        await Building.deleteMany();
        await Room.deleteMany();
        await Question.deleteMany();
        await Beacon.deleteMany();
        await Feedback.deleteMany();
    });

    describe(' POST /', () => {

        const exec = () => {
            return request(server)
              .post('/api/feedback')
              .set({'x-auth-token': token})
              .send({roomId, questionId, answerId})
        };

        beforeEach(async () => {
            building = new Building({name: '324'});
            await building.save();

            token = user.generateAuthToken();

            room = new Room({
                name: '123',
                location: '123',
                building: building._id
            });
            await room.save();

            roomId = room._id;

            question = new Question({
                value: '123',
                rooms: [room._id],
                answerOptions: [{
                    value: "123",
                    _id: mongoose.Types.ObjectId()
                }, {
                    value: "1234",
                    _id: mongoose.Types.ObjectId()
                }]
            });
            await question.save();
            questionId = question._id;

            answer = new Answer({value: "perfect", question: question._id});
            answerId = answer._id;
            await answer.save();

        });

        it('should return 401 if token not provided', async () => {
            token = "";
            await expect(exec()).to.be.rejectedWith("Unauthorized");
        });

        it('should return 401 if invalid token', async () => {
            token = '123';
            await expect(exec()).to.be.rejectedWith("Unauthorized");
        });


        it('401 if invalid token', async () => {
            token = jwt.sign({hej: "hej"}, "hej");
            await expect(exec()).to.be.rejectedWith("Unauthorized");

        });

        it('400 if roomId not provided', async () => {
            roomId = null;
            await expect(exec()).to.be.rejectedWith("Bad Request");
        });

        it('400 if question not provided', async () => {
            questionId = null;
            await expect(exec()).to.be.rejectedWith("Bad Request");
        });

        it('400 if questionId not set', async () => {
            questionId = null;
            await expect(exec()).to.be.rejectedWith("Bad Request");
        });


        it('400 if one question was not from same building as room', async () => {
            const building2 = new Building({name: '1234'});
            await building2.save();

            const room2 = new Room({name: "123", location: "h123", building: building2._id});
            await room2.save();

            const question2 = new Question({
                value: '12345', rooms: [room2._id],
                answerOptions: [{
                    _id: mongoose.Types.ObjectId(),
                    value: "123"
                }, {
                    _id: mongoose.Types.ObjectId(),
                    value: "123"
                }]
            });
            await question2.save();

            questionId = question2.id;

            await expect(exec()).to.be.rejectedWith("Bad Request");
        });

        it('400 if question array length was not the same as room question array length', async () => {

        });

        it("Should return 400 if question was from other room than feedback", async () => {
            question.rooms = [mongoose.Types.ObjectId()];
            await question.save();
            await expect(exec()).to.be.rejectedWith("Bad Request");
        });

        it("Should be ok if question was posted to other rooms as well", async () => {
          question.rooms.push(mongoose.Types.ObjectId());
          await question.save();
          try {
              const res = await exec();
              expect(res.status).to.be.equal(200);
          } catch (e) {
              logger.error(e.response.text);
              throw e;
          }
        });

        it('should return 200 if all fields provided correctly', async () => {
            try {
                const res = await exec();
                expect(res.status).to.be.equal(200);
            } catch (e) {


                throw e;
            }
        });

        it("Should add user to usersAnswered list of question", async () => {
            await exec();
            const q = await Question.findById(questionId);
            expect(q.usersAnswered[0].toString()).to.equal(user.id);
        });

        it("Should not be allowed (400) for users to answer question which are already on usersAnswered list", async () => {

            question.usersAnswered.push(user.id);
            await question.save();
            await expect(exec()).to.be.rejectedWith("Bad Request");

        });

    });

    /*describe(' GET /roomFeedback/:id', () => {

        let roomId;
        let feedback;
        let building;
        let baseUrl;
        let queryStrings;
        let jsonToken;

        const exec = () => {
            return request(server)
              .get(baseUrl + roomId + queryStrings)
              .set('x-auth-token', jsonToken);
        };

        beforeEach(async () => {
            baseUrl = '/api/feedback/roomFeedback/';
            queryStrings = "/";
            building = new Building({name: '324'});
            await building.save();
            jsonToken = user.generateAuthToken();
            const room = new Room({name: '222', location: '123', building: building._id});
            await room.save();

            roomId = room._id;

            const question = new Question({value: '123',  room: roomId});
            const answer = new Answer({value: "123", question: question._id});

            feedback = new Feedback({
                answer: answer._id,
                question: question._id,
                user: user._id, room: roomId
            });

            await feedback.save();

        });

        it('should return 404 if room not found', async () => {
            roomId = mongoose.Types.ObjectId();
            await expect(exec()).to.be.rejectedWith("Not Found");
        });

        it('should return feedback with roomId', async () => {
            const res = await exec();
            const returnedRoomId = res.body[0].room;
            expect(returnedRoomId).to.be.equal(roomId.toString());
        });

        it('should return only feedback objects from given room and not others', async () => {
            const room2 = new Room({name: '222', location: '123', building: building._id});
            await room2.save();

            const question = new Question({value: '123', room: room2._id});
            const answer = new Answer({value: "hey", question: question._id});

            const feedback2 = new Feedback({
                question: question._id,
                answer: answer.id,
                room: room2._id,
                user: user._id
            });

            await feedback2.save();

            const res = await exec();
            expect(res.body.length).to.be.equal(1);
        });

        it("should only return users feedback when query string param parsed", async () => {
            queryStrings = "/?user=me";

            let feedback2 = new Feedback({
                answer: mongoose.Types.ObjectId(),
                question: mongoose.Types.ObjectId(),
                user: mongoose.Types.ObjectId(), room: roomId
            });
            await feedback2.save();

            const res = await exec();
            expect(res.body.length).to.equal(1);
        });

        it("should still return all feedback when user query with all string param parsed", async () => {
            queryStrings = "/?user=all";

            let feedback2 = new Feedback({
                answer: mongoose.Types.ObjectId(),
                question: mongoose.Types.ObjectId(),
                user: mongoose.Types.ObjectId(), room: roomId
            });
            await feedback2.save();

            const res = await exec();
            expect(res.body.length).to.equal(2);
        });



        it("should only return feedback objects from user and within a week", async () => {
            queryStrings = "/?t=week&user=me";
            let today = new Date();

            let dateOverOneMonthAgo = new Date();
            dateOverOneMonthAgo.setDate(today.getDate() - 8);

            let feedback2 = new Feedback({
                answer: mongoose.Types.ObjectId(),
                question: mongoose.Types.ObjectId(),
                user: user.id,
                room: roomId,
                createdAt: dateOverOneMonthAgo
            });

            let feedback3 = new Feedback({
                answer: mongoose.Types.ObjectId(),
                question: mongoose.Types.ObjectId(),
                user: mongoose.Types.ObjectId(),
                room: roomId,
            });
            await feedback2.save();
            await feedback3.save();

            const res = await exec();
            expect(res.body.length).to.equal(1);
        });

    });*/

    describe("GET requests", () => {

        let baseUrl;
        let queryStrings;
        let roomId;
        let feedback;
        let building;
        let jsonToken;
        let answer;
        let question;

        const exec = () => {
            return request(server)
              .get(baseUrl + queryStrings)
              .set('x-auth-token', jsonToken);
        };

        beforeEach(async () => {
            baseUrl = '/api/feedback';
            queryStrings = "/";
            building = new Building({name: '324'});
            await building.save();
            jsonToken = user.generateAuthToken();
            const room = new Room({name: '222', location: '123', building: building._id});
            await room.save();

            roomId = room._id;

            question = new Question({
                value: '123',
                rooms: [roomId],
                answerOptions: [{
                    value: "123",
                    _id: mongoose.Types.ObjectId()
                }, {
                    value: "1234",
                    _id: mongoose.Types.ObjectId()
                }]
            });
            answer = new Answer({value: "123", question: question._id});

            feedback = new Feedback({
                answer: answer._id,
                question: question._id,
                user: user._id, room: roomId
            });

            await feedback.save();
            await answer.save();
            await question.save();
        });

        describe(" GET /", () => {

            it("Should return array with one feedback", async () => {
                const res = await exec();
                expect(res.body.length).to.equal(1);
            });

            it("Should return 400 if bad query parsed", async () => {
                queryStrings = "?user=hej";
                await expect(exec()).to.be.rejectedWith("Bad Request");
            });

            it("Should only return one length array when user query parsed", async () => {
                queryStrings = "/?user=me";

                const feedback2 = new Feedback({
                    answer: mongoose.Types.ObjectId(),
                    question: mongoose.Types.ObjectId(),
                    user: mongoose.Types.ObjectId(),
                    room: roomId
                });

                await feedback2.save();

                const res = await exec();

                expect(res.body.length).to.equal(1);

            });

            it("Should return only feedback from given room if query parsed", async () => {
                queryStrings = "/?room=" + roomId;

                const feedback2 = new Feedback({
                    answer: mongoose.Types.ObjectId(),
                    question: mongoose.Types.ObjectId(),
                    user: mongoose.Types.ObjectId(),
                    room: mongoose.Types.ObjectId()
                });

                await feedback2.save();

                const res = await exec();

                expect(res.body.length).to.equal(1);

            });

            it("Should only return feedback within a month when time query parsed in url", async () => {
                queryStrings = "/?t=month";
                let today = new Date();

                let dateOverOneMonthAgo = new Date();
                dateOverOneMonthAgo.setDate(today.getDate() - 32);

                let feedback2 = new Feedback({
                    answer: mongoose.Types.ObjectId(),
                    question: mongoose.Types.ObjectId(),
                    user: mongoose.Types.ObjectId(),
                    room: roomId,
                    createdAt: dateOverOneMonthAgo
                });
                await feedback2.save();

                const res = await exec();
                expect(res.body.length).to.equal(1);
            });

            it("should only return feedback within a year when year restriction set in query", async () => {
                queryStrings = "/?t=year";
                let today = new Date();

                let dateOverOneMonthAgo = new Date();
                dateOverOneMonthAgo.setMonth(today.getMonth() - 13);

                let feedback2 = new Feedback({
                    answer: mongoose.Types.ObjectId(),
                    question: mongoose.Types.ObjectId(),
                    user: mongoose.Types.ObjectId(),
                    room: roomId,
                    createdAt: dateOverOneMonthAgo
                });
                await feedback2.save();

                const res = await exec();
                expect(res.body.length).to.equal(1);
            });

            it("should only return feedback within a week when week restriction set in query", async () => {
                queryStrings = "/?t=week";
                let today = new Date();

                let dateOverOneMonthAgo = new Date();
                dateOverOneMonthAgo.setDate(today.getDate() - 8);

                let feedback2 = new Feedback({
                    answer: mongoose.Types.ObjectId(),
                    question: mongoose.Types.ObjectId(),
                    user: mongoose.Types.ObjectId(),
                    room: roomId,
                    createdAt: dateOverOneMonthAgo
                });
                await feedback2.save();

                const res = await exec();
                expect(res.body.length).to.equal(1);
            });

            it("should only return feedback from today when today-restriction set in query", async () => {
                queryStrings = "/?t=day";
                let today = new Date();

                let dateOverOneMonthAgo = new Date();
                dateOverOneMonthAgo.setHours(today.getHours() - 25);

                let feedback2 = new Feedback({
                    answer: mongoose.Types.ObjectId(),
                    question: mongoose.Types.ObjectId(),
                    user: mongoose.Types.ObjectId(),
                    room: roomId,
                    createdAt: dateOverOneMonthAgo
                });
                await feedback2.save();

                const res = await exec();
                expect(res.body.length).to.equal(1);
            });

        });

        describe("GET /questionStatistics", () => {
            beforeEach(() => {
                baseUrl = "/api/feedback/questionStatistics/" + question.id;
            });

            it("Should return array with answer object", async () => {
                const res = await exec();
                expect(res.body[0].hasOwnProperty("answer")).to.be.ok;
            });

            it("Should return array with timesAnswered property", async () => {
                const res = await exec();
                expect(res.body[0].hasOwnProperty("timesAnswered")).to.be.ok;
            });

            it("Should return valid timesAnswered for question", async () => {
                feedback = new Feedback({
                    answer: answer._id,
                    question: question._id,
                    user: user._id, room: roomId
                });
                await feedback.save();

                feedback = new Feedback({
                    answer: answer._id,
                    question: question._id,
                    user: user._id, room: roomId
                });
                await feedback.save();

                const res = await exec();
                expect(res.body[0].timesAnswered).to.equal(3);
            });

            it("Should also regulate timesAnswered if user filter (query) parsed in url", async () => {
                queryStrings = "/?user=me";

                feedback = new Feedback({
                    answer: answer._id,
                    question: question._id,
                    user: mongoose.Types.ObjectId(), room: roomId
                });
                await feedback.save();

                const res = await exec();
                expect(res.body[0].timesAnswered).to.equal(1);

            });
        });

        describe("GET /answeredQuestions/", () => {

            const exec = () => {
                return request(server)
                  .get(baseUrl + queryStrings)
                  .set('x-auth-token', jsonToken);
            };

            beforeEach(async () => {
                baseUrl = '/api/feedback/answeredQuestions';
                queryStrings = "/";

            });

            it("Should return all unique questions with feedback", async () => {
                feedback = new Feedback({
                    answer: answer._id,
                    question: question._id,
                    user: user._id, room: roomId
                });
                await feedback.save();

                const res = await exec();
                expect(res.body.length).to.equal(1);
            });

            it("question in array should have value", async () => {
                const res = await exec();
                expect(res.body[0].question.hasOwnProperty("value")).to.be.ok;
            });

            it("Should have a property timesAnswered", async () => {
                const res = await exec();
                expect(res.body[0].hasOwnProperty("timesAnswered")).to.be.ok;
            });

            it("Should return times answered", async () => {
                feedback = new Feedback({
                    answer: answer._id,
                    question: question._id,
                    user: user._id, room: roomId
                });
                await feedback.save();
                feedback = new Feedback({
                    answer: answer._id,
                    question: question._id,
                    user: user._id, room: roomId
                });
                await feedback.save();

                const res = await exec();
                expect(res.body[0].timesAnswered).to.equal(3);
            });

            it("Should be possible to send queries and limit the result", async () => {

                let question2 = new Question({
                    value: '123',
                    rooms: [roomId],
                    answerOptions: [{
                        value: "123",
                        _id: mongoose.Types.ObjectId()
                    }, {
                        value: "1234",
                        _id: mongoose.Types.ObjectId()
                    }]
                });
                await question2.save();

                feedback = new Feedback({
                    answer: answer._id,
                    question: question2._id,
                    user: mongoose.Types.ObjectId(), room: roomId
                });
                await feedback.save();
                queryStrings = "/?user=me";
                const res = await exec();
                expect(res.body.length).to.equal(1);

            });

        });
    });

    describe("PATCH /change-answer/:id", () => {

        let feedback;
        let baseUrl = "/api/feedback/change-answer/";
        let feedbackId;
        let newAnswerId;
        let body;

        const exec = () => {
            return request(server)
                .patch(baseUrl + feedbackId)
                .set('x-auth-token', token)
                .send(body);
        };

        beforeEach(async () => {
            building = new Building({name: '324'});
            await building.save();

            token = user.generateAuthToken();

            room = new Room({
                name: '123',
                location: '123',
                building: building._id
            });
            await room.save();

            roomId = room._id;

            answerId =   mongoose.Types.ObjectId();
            newAnswerId = mongoose.Types.ObjectId();
            question = new Question({
                value: '123',
                rooms: [room._id],
                answerOptions: [{
                    value: "123",
                    _id: answerId
                }, {
                    value: "1234",
                    _id: newAnswerId
                }]
            });
            await question.save();
            questionId = question._id;

            answer = new Answer({value: "perfect", question: question._id});
            answerId = answer._id;
            await answer.save();

            feedback = new Feedback({
                answer: answer._id,
                question: question._id,
                user: user._id, room: roomId
            });

            await feedback.save();
            feedbackId = feedback.id;

            body = {answerId: newAnswerId}

        });

        it("Should update answer ", async () => {
            await exec();
            const feedback = await Feedback.findById(feedbackId);
            expect(feedback.answer.toString()).to.equal(newAnswerId.toString());
        });

        it("Should return 400 if answerId did not belong to question ", async () => {
            newAnswerId = mongoose.Types.ObjectId();
            const res = await exec();
            expect(res.statusCode).to.equal(400);
        });

        it("Should not be allowed to send anything else than answerId", async () => {

            body = {answerId: newAnswerId, "hej": "hej"};
            const res = await exec();
            expect(res.statusCode).to.equal(400);
        });

        it("Should return 404 if feedback object was not found", async () => {
            feedbackId = mongoose.Types.ObjectId();

            const res = await exec();
            expect(res.statusCode).to.equal(404);
        })
    });

});
