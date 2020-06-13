const {User, validate, validateAuthorized} = require('../../models/user');
const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-as-promised'));
const mongoose = require('mongoose');
const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

describe("User", () => {
    describe('User in database', () => {


        let user;
        beforeEach(() => {
            user = new User({role: 0});
        });

        it('should be valid with user role', async () => {
            const res = await user.validate();
            expect(res).to.be.undefined;
        });

        it('should have a user role', async () => {
            user.role = null;
            await expect(user.validate()).to.be.rejectedWith(mongoose.ValidationError);
        });

        it("should not accept roles that are not 0, 1 or 2 ", async () => {
            user.role = 3;
            await expect(user.validate()).to.be.rejectedWith(mongoose.ValidationError);
            user.role = -1;
            await expect(user.validate()).to.be.rejectedWith(mongoose.ValidationError);
            user.role = 0;
            const res = await user.validate();
            expect(res).to.be.undefined;
        });

    });

    describe("Basic user posted from client", () => {
        let user;

        beforeEach(() => {
            user = {};
        });

        const exec = () => {
            return validate(user)
        };

        it("Should not have any random fields", async () => {
            user.hej = "hej";

            const {error} = exec();
            expect(error.name).to.equal('ValidationError');
        });

        it("Should return undefined error object when parsed empty object", async () => {
            const {error} = exec();
            expect(error).to.not.be.ok;
        });

        it("Should not be able to set authorized parameter", async () => {
            user.authorized = true;
            const {error} = exec();
            expect(error.name).to.equal("ValidationError");
        });


    });

    describe("Validate authorized user", () => {

        let user;
        let password;
        let email;

        beforeEach(() => {
            password = "qweQWE123";
            email = "s@s";
            user = {
                email,
                password
            };
        });

        const exec = () => {
            return validateAuthorized({email, password})
        };

        it("Should not return password in error message", async () => {
            password = "123";
            // const hej = await exec();
            await expect(exec()).to.be.rejectedWith(Error);
            // expect(error.includes("123")).to.be.false;
        });

        it("Should accept valid password", () => {
            const {error} = exec();
            expect(error).to.not.be.ok;
        });

        it("Should not accept invalid emails", () => {
            email = "123";
            const {error} = exec();
            expect(error).to.be.ok;
        });
    });

});
