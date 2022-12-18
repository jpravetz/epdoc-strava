"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const epdoc_util_1 = require("epdoc-util");
const util_1 = require("./util");
const defaultStravaToken = {
    token_type: null,
    expires_at: 0,
    expires_in: 0,
    refresh_token: null,
    access_token: null,
    athlete: {}
};
class StravaCreds {
    constructor(tokenFile) {
        this.data = defaultStravaToken;
        this.path = tokenFile;
    }
    get expiresAt() {
        return this.data.expires_at;
    }
    get refreshToken() {
        return this.data.refresh_token;
    }
    get accessToken() {
        return this.data.access_token;
    }
    areValid(t = 2 * 60 * 60) {
        const tLimit = Date.now() / 1000 + t;
        return this.data && this.data.token_type === 'Bearer' && this.data.expires_at > tLimit;
    }
    static validCredData(val) {
        return val && val.token_type === 'Bearer' && epdoc_util_1.isNumber(val.expires_at);
    }
    read() {
        return util_1.readJson(this.path)
            .then(resp => {
            if (StravaCreds.validCredData(resp)) {
                this.data = resp;
            }
            else {
                console.log('Invalid token auth response');
            }
        })
            .catch(err => {
            console.log('No local credentials cached');
            return Promise.resolve();
        });
    }
    write(data) {
        if (StravaCreds.validCredData(data)) {
            this.data = data;
            return util_1.writeJson(this.path, this.data);
        }
        else {
            throw new Error('No token data to write');
        }
    }
}
exports.StravaCreds = StravaCreds;
//# sourceMappingURL=strava-creds.js.map