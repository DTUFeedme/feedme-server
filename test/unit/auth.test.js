const {auth, authorized, admin} = require("../../middleware/auth");
const {User, UserRole} = require("../../models/user");
const sinon = require('sinon');
const assert = require('assert');

let err;
let req;
let res;
let next;

describe("auth", () => {
    beforeEach(() => {
        err = {};
        res = {};
        req = {params: {}};
        res.status = sinon.fake.returns(res);
        res.send = sinon.fake();
        next = sinon.fake();
    });

    describe("admin", () => {

        beforeEach(() => {
            req.user = {role: UserRole.admin}
        });
        it('should call status with 403 if user not admin', () => {
            req.user = {role: UserRole.authorized};

            admin(req, res, next);

            assert(res.status.calledWith(403));
            assert(res.send.calledOnce);
        });

        it("Should call next when user admin", () => {
            admin(req, res, next);

            assert(next.calledOnce);
        });
    });

    describe("auth", () => {
        let user;
        let token;
        beforeEach(() => {
            user = new User();
            process.env.jwtPrivateKey = "secretKey";
            req.header = {};
            token = user.generateAuthToken;
            req.header["x-auth-token"] = token;
            req.header = sinon.fake.returns(token);

        });
        it('should call status 401 if id was not valid', () => {
            res.send = sinon.fake();
            auth(req, res, next);
            assert(res.status.calledWith(401));
            assert(res.send.getCalls());
            assert(res.send.calledOnce);
        });



    });
});


