const jwt = require("jsonwebtoken");
const {User} = require('../../models/user');
const request = require('supertest');
const expect = require("chai").expect;
const app = require('../../index');
let server;
const config = require('config');
const bcrypt = require("bcryptjs");
const mongoose = require('mongoose');
const { v4: uuidv4 , validate} = require('uuid');



describe('/api/auth', () => {

    before(async () => {
        server = app.listen(config.get('port'));
        await mongoose.connect(config.get('db'), {useNewUrlParser: true, useUnifiedTopology: true});
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
        let refreshToken;

        beforeEach(async () => {
            email = "asd@asd.as";
            password = "Asdf12345";
            const salt = await bcrypt.genSalt();
            hashedPassword = await bcrypt.hash(password, salt);
            refreshToken = uuidv4();
            const user = new User({email, password: hashedPassword, refreshToken});
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

            const res = await exec();
            expect(res.statusCode).to.equal(400);
        });

        it("Should return 400 if password not set", async () => {
            password = null;
            const res = await exec();
            expect(res.statusCode).to.equal(400);
        });

        it("Should return 400 if password invalid", async () => {
            password = "123";
            const res = await exec();
            expect(res.statusCode).to.equal(400);
        });

        it("Should return 400 if password wasn't correct", async () => {
            password = "Qwert12345";

            const res = await exec();
            expect(res.statusCode).to.equal(400);
        });

        it("Should return 200 if email and password valid", async () => {
            const res = await exec();
            expect(res.status).to.be.equal(200);
        });

        it("Should return 400 if user did not exist", async () => {
            email = "asd@asd.dk";
            const res = await exec();
            expect(res.statusCode).to.equal(400);
        });

        it("Should return json web token that can be decoded to valid mongoose _id", async () => {
            const res = await exec();

            console.log(res.text);
            const decodedToken = jwt.decode(res.header["x-auth-token"]);
            expect(mongoose.Types.ObjectId.isValid(decodedToken._id)).to.be.true;
        });

        it("Should return refreshToken upon login", async () => {
            const res = await exec();
            expect(res.body.refreshToken).to.be.ok;
        });

        it("Should update refresh token in db upon login", async () => {
            await exec();
            const updatedUser = await User.findById(userId);
            expect(updatedUser.refreshToken).to.not.equal(refreshToken);
        });


    });

    describe("POST /refresh", async () => {
        let token;
        let refreshToken;
        let user;
        let key;

        beforeEach(async () => {

            key = "private";
            process.env.jwtPrivateKey = key;
            refreshToken = uuidv4();

            user = new User({refreshToken});
            await user.save();
            // One hour old token
            token = user.generateAuthToken();
        });

        const exec = () => {
            return request(server)
                .post("/api/auth/refresh")
                .set('x-auth-token', token)
                .send({refreshToken});
        };

        it("Should return a jwt", async () => {
            const res = await exec();
            expect(res.header["x-auth-token"]).to.be.ok;
        });

        it("Should return valid jwt", async () => {
            const res = await exec();
            const decoded = jwt.verify(res.header["x-auth-token"], key);
            expect(decoded).to.be.ok;
        });

        it("Should send back jwt matching user", async () => {
            const res = await exec();
            const decoded = jwt.verify(res.header["x-auth-token"], key);
            expect(decoded._id).to.equal(user.id);
        });

        it("Should return 401 if jwt was not valid", async () => {
            token = "hej";
            const res = await exec();
            expect(res.statusCode).to.equal(401);
        });

        it("Should not return error even if token is expired", async () => {
            token = user.generateAuthToken(Date.now() / 1000 - 60 * 60);
            const res = await exec();
            expect(res.statusCode).to.equal(200);
        });

        it("Should return 400 if no refresh token provided", async () => {
            refreshToken = undefined;
            const res = await exec();
            expect(res.statusCode).to.equal(400);
        });

        it("Refresh token should be a valid uuid", async () => {
            refreshToken = "not-valid";
            const res = await exec();
            expect(res.statusCode).to.equal(400);
        });

        it("Should return 401 if refresh token was not correct", async () => {
            refreshToken = uuidv4();
            const res = await exec();
            expect(res.statusCode).to.equal(401);
        });

        it("Should return valid refresh token", async () => {
            const res = await exec();
            expect(validate(res.body.refreshToken)).to.be.ok;
        });

        it("Should set refreshtoken in db", async () => {
            await exec();
            const newUser = await User.findById(user.id);
            const newRefreshToken = newUser.refreshToken;
            expect(newRefreshToken).to.be.ok;
        });

        it("Should update user's refresh token in db", async () => {
            const oldRefreshToken = user.refreshToken;
            await exec();

            const newUser = await User.findById(user.id);
            const newRefreshToken = newUser.refreshToken;

            expect(oldRefreshToken).to.not.equal(newRefreshToken);
        });

        it("Should send back jwt with updated expiry date", async () => {

            // Set token to one hour ago
            token = user.generateAuthToken(Date.now() / 1000 - 60 * 60);

            const res = await exec();
            const oldTokenDecoded = jwt.verify(token, key, {clockTimestamp: Date.now() / 1000 - 60 * 60});
            const newTokenDecoded = jwt.verify(res.header["x-auth-token"], key);

            expect(newTokenDecoded.exp).to.be.above(oldTokenDecoded.exp);
        });
    });
});
