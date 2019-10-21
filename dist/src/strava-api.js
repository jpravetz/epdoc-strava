"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const request = require("superagent");
const epdoc_util_1 = require("epdoc-util");
const STRAVA_URL_PREFIX = process.env.STRAVA_URL_PREFIX || 'https://www.strava.com/';
const STRAVA_URL = {
    authorize: STRAVA_URL_PREFIX + 'oauth/authorize',
    token: STRAVA_URL_PREFIX + 'oauth/token',
    athlete: STRAVA_URL_PREFIX + 'api/v3/athlete',
    picture: STRAVA_URL_PREFIX + 'api/v3/athlete/picture',
    activities: STRAVA_URL_PREFIX + 'api/v3/activities'
};
const defaultAuthOpts = {
    scope: '',
    state: '',
    approvalPrompt: 'force'
};
class StravaApi {
    constructor(opts) {
        this.authHeaders = function () {
            assert.ok(this.secret, 'An access token is required.');
            return {
                Authorization: 'access_token ' + this.token
            };
        };
        this.id = opts.id || parseInt(process.env.STRAVA_CLIENT_ID, 10);
        this.secret = opts.secret || process.env.STRAVA_CLIENT_SECRET;
        this.token = opts.token || process.env.STRAVA_ACCESS_TOKEN;
    }
    toString() {
        return '[Strava]';
    }
    getAuthorizationUrl(options) {
        assert.ok(this.id, 'A client ID is required.');
        let opts = Object.assign(defaultAuthOpts, options);
        return (`${STRAVA_URL.authorize}?client_id=${this.id}` +
            `&redirect_uri=${encodeURIComponent(opts.redirectUri)}` +
            `&scope=${opts.scope}` +
            `&state=${opts.state}` +
            `&approval_prompt=${opts.approvalPrompt}` +
            `&response_type=code`);
    }
    acquireToken(code) {
        assert.ok(this.id, 'A client ID is required.');
        assert.ok(this.secret, 'A client secret is required.');
        const query = {
            client_id: this.id,
            client_secret: this.secret,
            code: code
        };
        return request
            .post(STRAVA_URL.token)
            .query(query)
            .then(resp => {
            return Promise.resolve(resp.body.access_token);
        })
            .catch(err => {
            return Promise.reject(err);
        });
    }
    getAthlete(athleteId) {
        let url = STRAVA_URL.athlete;
        if (epdoc_util_1.isNumber(athleteId)) {
            url = url + '/' + athleteId;
        }
        return request.get(url).set('Authorization', 'access_token ' + this.token);
    }
    getActivities(options, callback) {
        let url = STRAVA_URL.activities;
        if (epdoc_util_1.isNumber(options.athleteId)) {
            url = url + '/' + options.athleteId;
        }
        return request
            .get(url)
            .set('Authorization', 'access_token ' + this.token)
            .query(options.query)
            .then(resp => {
            if (!Array.isArray(resp)) {
                throw new Error(JSON.stringify(resp));
            }
            return Promise.resolve(resp);
        })
            .catch(err => {
            err.message = 'Activities - ' + err.message;
            throw err;
        });
    }
}
exports.StravaApi = StravaApi;
//# sourceMappingURL=strava-api.js.map