"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const athlete_1 = require("./models/athlete");
const assert = __importStar(require("assert"));
const request = require("superagent");
const epdoc_util_1 = require("epdoc-util");
const strava_creds_1 = require("./strava-creds");
const detailed_activity_1 = require("./models/detailed-activity");
const summary_segment_1 = require("./models/summary-segment");
const STRAVA_URL_PREFIX = process.env.STRAVA_URL_PREFIX || 'https://www.strava.com/';
const STRAVA_API_PREFIX = STRAVA_URL_PREFIX + 'api/v3/';
const STRAVA_URL = {
    authorize: STRAVA_URL_PREFIX + 'oauth/authorize',
    token: STRAVA_URL_PREFIX + 'oauth/token',
    athlete: STRAVA_API_PREFIX + 'athlete',
    picture: STRAVA_API_PREFIX + 'athlete/picture',
    activities: STRAVA_API_PREFIX + 'activities',
    starred: STRAVA_API_PREFIX + 'segments/starred'
};
var StravaStreamSource;
(function (StravaStreamSource) {
    StravaStreamSource["activities"] = "activities";
    StravaStreamSource["segments"] = "segments";
    StravaStreamSource["routes"] = "routes";
    StravaStreamSource["segmentEfforts"] = "segment_efforts";
})(StravaStreamSource = exports.StravaStreamSource || (exports.StravaStreamSource = {}));
var StravaStreamType;
(function (StravaStreamType) {
    StravaStreamType["latlong"] = "latlong";
    StravaStreamType["distance"] = "distance";
    StravaStreamType["altitude"] = "altitude";
})(StravaStreamType = exports.StravaStreamType || (exports.StravaStreamType = {}));
const defaultAuthOpts = {
    scope: 'read_all,activity:read_all,profile:read_all',
    state: '',
    approvalPrompt: 'auto',
    redirectUri: 'https://localhost'
};
class StravaApi {
    constructor(clientConfig, credsFile) {
        this.authHeaders = function () {
            assert.ok(this.secret, 'An access token is required.');
            return {
                Authorization: 'access_token ' + this.creds.accessToken
            };
        };
        this.id = clientConfig.id || parseInt(process.env.STRAVA_CLIENT_ID, 10);
        this.secret = clientConfig.secret || process.env.STRAVA_CLIENT_SECRET;
        // this.token = opts.token || process.env.STRAVA_ACCESS_TOKEN;
        this._credsFile = credsFile;
    }
    toString() {
        return '[Strava]';
    }
    initCreds() {
        this._creds = new strava_creds_1.StravaCreds(this._credsFile);
        return this._creds.read();
    }
    get creds() {
        return this._creds;
    }
    getAuthorizationUrl(options = {}) {
        assert.ok(this.id, 'A client ID is required.');
        let opts = Object.assign(defaultAuthOpts, options);
        return (`${STRAVA_URL.authorize}?client_id=${this.id}` +
            `&redirect_uri=${encodeURIComponent(opts.redirectUri)}` +
            `&scope=${opts.scope}` +
            `&state=${opts.state}` +
            `&approval_prompt=${opts.approvalPrompt}` +
            `&response_type=code`);
    }
    getTokenUrl(options = {}) {
        let opts = Object.assign(defaultAuthOpts, options);
        return (`${STRAVA_URL.token}?client_id=${this.id}` +
            `&secret=${this.secret}` +
            `&code=${opts.code}` +
            `&grant_type=authorization_code`);
    }
    /**
     * Exchanges code for refresh and access tokens from Strava. Writes these
     * tokens to ~/.strava/credentials.json.
     * @param code
     */
    getTokens(code) {
        let payload = {
            code: code,
            client_id: this.id,
            client_secret: this.secret,
            grant_type: 'authorization_code'
        };
        console.log('getTokens request', payload);
        return request
            .post(STRAVA_URL.token)
            .send(payload)
            .then(resp => {
            console.log('getTokens response', resp.body);
            return this.creds.write(resp.body);
        })
            .then(resp => {
            console.log('Credentials written to local storage');
        });
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
        return request
            .get(url)
            .set('Authorization', 'access_token ' + this.creds.accessToken)
            .then(resp => {
            if (resp && athlete_1.Athelete.isInstance(resp.body)) {
                return Promise.resolve(athlete_1.Athelete.newFromResponseData(resp.body));
            }
            throw new Error('Invalid Athelete return value');
        });
    }
    getActivities(options, callback) {
        let url = STRAVA_URL.activities;
        if (epdoc_util_1.isNumber(options.athleteId)) {
            url = url + '/' + options.athleteId;
        }
        return request
            .get(url)
            .set('Authorization', 'access_token ' + this.creds.accessToken)
            .query(options.query)
            .then(resp => {
            if (!resp || !Array.isArray(resp.body)) {
                throw new Error(JSON.stringify(resp.body));
            }
            return Promise.resolve(resp.body);
        })
            .catch(err => {
            err.message = 'Activities - ' + err.message;
            throw err;
        });
    }
    getStarredSegments() {
        return request
            .get(STRAVA_URL.starred)
            .query({ per_page: 200 })
            .set('Authorization', 'access_token ' + this.creds.accessToken)
            .then(resp => {
            if (resp && Array.isArray(resp.body)) {
                let result = resp.body.map(item => {
                    return summary_segment_1.SummarySegment.newFromResponseData(item);
                });
                return Promise.resolve(result);
            }
            throw new Error('Invalid starred segments return value');
        });
    }
    getSegmentCoords(segId) {
        let result = [];
        let query = {
            keys: StravaStreamType.latlong,
            key_by_type: true
        };
        return this.getStream(StravaStreamSource.segments, segId, query)
            .then(resp => {
            if (Array.isArray(resp)) {
                resp.forEach(item => {
                    if (item && item.type === 'latlng' && item.data) {
                        item.data.forEach(pt => {
                            result.push(pt);
                        });
                    }
                });
            }
            return Promise.resolve(result);
        })
            .catch(err => {
            err.message = `Get segment coordinates ` + err.message;
            throw err;
        });
    }
    getStreamCoords(source, objId) {
        let result = [];
        let query = {
            keys: StravaStreamType.latlong,
            key_by_type: true
        };
        return this.getStream(source, objId, query)
            .then(resp => {
            if (Array.isArray(resp)) {
                resp.forEach(item => {
                    if (item && item.type === 'latlng' && item.data) {
                        item.data.forEach(pt => {
                            result.push(pt);
                        });
                    }
                });
            }
            return Promise.resolve(result);
        })
            .catch(err => {
            err.message = `Get ${source} coordinates ` + err.message;
            throw err;
        });
    }
    getDetailedActivity(activity) {
        return request
            .get(STRAVA_URL.activities + '/' + activity.id)
            .set('Authorization', 'access_token ' + this.creds.accessToken)
            .then(resp => {
            if (resp && detailed_activity_1.DetailedActivity.isInstance(resp.body)) {
                return Promise.resolve(detailed_activity_1.DetailedActivity.newFromResponseData(resp.body));
            }
            throw new Error('Invalid DetailedActivity return value');
        })
            .catch(err => {
            err.message = `getActivity ${activity.id} ${err.message} (${activity.toString()})`;
            throw err;
        });
    }
    /**
     * Retrieve data for the designated type of stream
     * @param objId The activity or segement ID
     * @param types An array, usually [ 'latlng' ]
     * @param options Additional query string parameters, if any
     * @param callback
     * @returns {*}
     */
    getStream(type, objId, options) {
        return request
            .get(`${STRAVA_API_PREFIX}/${type}/${objId}/streams`)
            .set('Authorization', 'access_token ' + this.creds.accessToken)
            .query(options);
    }
    getSegment(segmentId) {
        return request
            .get(STRAVA_API_PREFIX + 'segments/' + segmentId)
            .set('Authorization', 'access_token ' + this.creds.accessToken);
    }
    getSegmentEfforts(segmentId, params) {
        return request.get(STRAVA_API_PREFIX + 'segments/' + segmentId + '/all_efforts').query(params);
    }
}
exports.StravaApi = StravaApi;
//# sourceMappingURL=strava-api.js.map