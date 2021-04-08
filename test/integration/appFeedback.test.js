const request = require('supertest');
const expect = require("chai").expect;
const app = require('../../index');
let server;
const mongoose = require('mongoose');
const {v4: uuidv4, validate} = require('uuid');
const {AppFeedback} = require('../../models/appFeedback');
const {User} = require('../../models/user');
const config = require('config');




describe('/api/app-feedback', () => {
    let token;
    let user;

    before(async () => {
        server = app.listen(config.get('port'));
        await mongoose.connect(config.get('db'), {useNewUrlParser: true, useUnifiedTopology: true});
    });
    after(async () => {
        await server.close();
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        user = new User({refreshToken: uuidv4()});
        token = user.generateAuthToken();
        await user.save();
    });

    afterEach(async () => {
        await User.deleteMany();
        await AppFeedback.deleteMany();
    });

    describe("POST /", () => {
        let feedback;

        beforeEach(async () => {
            feedback = "Lots of goods and badss";
        });

        afterEach(async () => {
            await User.deleteMany();
        });

        const exec = () => {
            return request(server)
                .post("/api/app-feedback")
                .set('x-auth-token', token)
                .send({feedback});
        };

        it("Should be ok", async () => {
            const res = await exec();
            expect(res.statusCode).to.equal(200);
        });

        it("Should return 400 if feedback string not sent", async () => {
            feedback = undefined;
            const res = await exec();
            expect(res.statusCode).to.equal(400);
        });

        it("Shouldn't be a longer text than 4000 characters", async () => {
            feedback = "";
            for (let i = 0; i < 4002; i++) {
                feedback += "i";
            }
            const res = await exec();
            expect(res.statusCode).to.equal(400);
        });

        it("Should save the feedback in db", async () => {
            await exec();
            const appFeedback = await AppFeedback.find();

            expect(appFeedback.length).to.equal(1);
            expect(appFeedback[0].feedback).to.equal(feedback);
            expect(appFeedback[0].user.toString()).to.equal(user.id);
        });

    });

});
