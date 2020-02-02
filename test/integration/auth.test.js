const jwt = require("jsonwebtoken");
const {User} = require('../../models/user');
const request = require('supertest');
const expect = require("chai").expect;
const app = require('../..');
let server;
const config = require('config');
const bcrypt = require("bcryptjs");
const mongoose = require('mongoose');


describe('/api/auth', () => {

    before(async () => {
        server = app.listen(config.get('port'));
        await mongoose.connect(config.get('db'), {useNewUrlParser: true});
    });
    after(async () => {
        await server.close();
        await mongoose.connection.close();
    });

    describe("POST /", () => {
        let email;
        let password;
        let hashedPassword;
        let userId;

        beforeEach(async () => {
            email = "asd@asd.as";
            password = "Asdf12345";
            const salt = await bcrypt.genSalt();
            hashedPassword = await bcrypt.hash(password, salt);
            const user = new User({email, password: hashedPassword});
            await user.save();
            userId = user.id;
        });

        afterEach(async () => {
            await User.deleteMany();
        });

        const exec = () => {
            return request(server)
              .post("/api/auth")
              .send({email, password});
        };

        it("should return 400 if email not set", async () => {
            email = null;
            try {
                await exec();
            } catch (e) {
                // console.log(e);
                return expect(e.status).to.be.equal(400);
            }

            expect.fail("Should have failed");
        });

        it("Should return 400 if password not set", async () => {
            password = null;
            try {
                await exec();
            } catch (e) {
                // console.log(e);
                return expect(e.status).to.be.equal(400);
            }
            expect.fail("Should have failed");
        });

        it("Should return 400 if password invalid", async () => {
            password = "123";

            try {
                await exec();
            } catch (e) {
                // console.log(e);
                return expect(e.status).to.be.equal(400);
            }

            expect.fail("Should have failed");

        });

        it("Should return 400 if password wasn't correct", async () => {
            password = "Qwert12345";

            try {
                await exec();
            } catch (e) {
                // console.log(e);
                return expect(e.status).to.be.equal(400);
            }

            expect.fail("Should have failed but did not receive error");
        });

        it("Should return 200 if email and password valid", async () => {
            const res = await exec();
            expect(res.status).to.be.equal(200);
        });

        it("Should return 400 if user did not exist", async () => {
            email = "asd@asd.dk";
            let res;
            try {
                res = await exec();
            } catch (e) {
                // console.log(e);
                return expect(e.status).to.be.equal(400);
            }

            expect.fail("Should have failed but gave status " + res.status);
        });

        it("Should return json web token that can be decoded to valid mongoose _id", async () => {
            const res = await exec();

            console.log(res.text);
            const decodedToken = jwt.decode(res.header["x-auth-token"]);
            expect(mongoose.Types.ObjectId.isValid(decodedToken._id)).to.be.true;

        });
    });
});
