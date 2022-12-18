"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StravaApi = exports.StravaStreamType = exports.StravaStreamSource = void 0;
const assert = __importStar(require("assert"));
const epdoc_util_1 = require("epdoc-util");
const athlete_1 = require("./models/athlete");
const detailed_activity_1 = require("./models/detailed-activity");
const summary_segment_1 = require("./models/summary-segment");
const strava_creds_1 = require("./strava-creds");
const request = require("superagent");
const STRAVA_URL_PREFIX = process.env.STRAVA_URL_PREFIX || 'https://www.strava.com';
const STRAVA_API_PREFIX = STRAVA_URL_PREFIX + '/api/v3';
const STRAVA_URL = {
    authorize: STRAVA_URL_PREFIX + '/oauth/authorize',
    token: STRAVA_URL_PREFIX + '/oauth/token',
    athlete: STRAVA_API_PREFIX + '/athlete',
    picture: STRAVA_API_PREFIX + '/athlete/picture',
    activities: STRAVA_API_PREFIX + '/activities',
    starred: STRAVA_API_PREFIX + '/segments/starred'
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
    StravaStreamType["latlng"] = "latlng";
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
        const opts = Object.assign(defaultAuthOpts, options);
        return (`${STRAVA_URL.authorize}?client_id=${this.id}` +
            `&redirect_uri=${encodeURIComponent(opts.redirectUri)}` +
            `&scope=${opts.scope}` +
            `&state=${opts.state}` +
            `&approval_prompt=${opts.approvalPrompt}` +
            `&response_type=code`);
    }
    getTokenUrl(options = {}) {
        const opts = Object.assign(defaultAuthOpts, options);
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
        return __awaiter(this, void 0, void 0, function* () {
            const payload = {
                // tslint:disable-next-line: object-literal-shorthand
                code: code,
                client_id: this.id,
                client_secret: this.secret,
                grant_type: 'authorization_code'
            };
            // console.log('getTokens request', payload);
            return request
                .post(STRAVA_URL.token)
                .send(payload)
                .then(resp => {
                // console.log('getTokens response', resp.body);
                console.log('Authorization obtained.');
                return this.creds.write(resp.body);
            })
                .then(resp => {
                console.log('Credentials written to local storage');
            });
        });
    }
    acquireToken(code) {
        return __awaiter(this, void 0, void 0, function* () {
            assert.ok(this.id, 'A client ID is required.');
            assert.ok(this.secret, 'A client secret is required.');
            const query = {
                client_id: this.id,
                client_secret: this.secret,
                // tslint:disable-next-line: object-literal-shorthand
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
        });
    }
    authHeaders() {
        assert.ok(this.secret, 'An access token is required.');
        return {
            Authorization: 'access_token ' + this.creds.accessToken
        };
    }
    getAthlete(athleteId) {
        return __awaiter(this, void 0, void 0, function* () {
            let url = STRAVA_URL.athlete;
            if ((0, epdoc_util_1.isNumber)(athleteId)) {
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
        });
    }
    getActivities(options) {
        return __awaiter(this, void 0, void 0, function* () {
            let url = STRAVA_URL.activities;
            if ((0, epdoc_util_1.isNumber)(options.athleteId)) {
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
        });
    }
    getStarredSegments(accum, page = 1) {
        return __awaiter(this, void 0, void 0, function* () {
            const perPage = 200;
            return request
                .get(STRAVA_URL.starred)
                .query({ per_page: perPage, page: page })
                .set('Authorization', 'access_token ' + this.creds.accessToken)
                .then(resp => {
                if (resp && Array.isArray(resp.body)) {
                    console.log(`  Retrieved ${resp.body.length} starred segments for page ${page}`);
                    resp.body.forEach(item => {
                        const result = summary_segment_1.SummarySegment.newFromResponseData(item);
                        accum.push(result);
                    });
                    if (resp.body.length >= perPage) {
                        return this.getStarredSegments(accum, page + 1);
                    }
                    return Promise.resolve();
                }
                throw new Error('Invalid starred segments return value');
            });
        });
    }
    getStreamCoords(source, objId, name) {
        const result = [];
        const query = {
            keys: StravaStreamType.latlng,
            key_by_type: ''
        };
        return this.getStreams(source, objId, query)
            .then(resp => {
            if (Array.isArray(resp.latlng)) {
                console.log(`  Get ${name} Found ${resp.latlng.length} coordinates`);
                return Promise.resolve(resp.latlng);
            }
            console.log(`  Get ${name} did not contain any coordinates`);
            return Promise.resolve([]);
        })
            .catch(err => {
            console.log(`  Get ${name} coordinates ${err.message}`);
            return Promise.resolve([]);
        });
    }
    getDetailedActivity(activity) {
        return __awaiter(this, void 0, void 0, function* () {
            return request
                .get(STRAVA_URL.activities + '/' + activity.data.id)
                .set('Authorization', 'access_token ' + this.creds.accessToken)
                .then(resp => {
                if (resp && detailed_activity_1.DetailedActivity.isInstance(resp.body)) {
                    return Promise.resolve(detailed_activity_1.DetailedActivity.newFromResponseData(resp.body));
                }
                throw new Error('Invalid DetailedActivity return value');
            })
                .catch(err => {
                err.message = `getActivity id='${activity.data.id}' ${err.message} (${activity.toString()})`;
                throw err;
            });
        });
    }
    /**
     * Retrieve data for the designated type of stream
     * @param objId The activity or segement ID
     * @param types An array, usually [ 'latlng' ]
     * @param options Additional query string parameters, if any
     * @returns {*}
     */
    getStreams(source, objId, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return request
                .get(`${STRAVA_API_PREFIX}/${source}/${objId}/streams`)
                .set('Authorization', 'access_token ' + this.creds.accessToken)
                .query(options)
                .then(resp => {
                if (resp && Array.isArray(resp.body)) {
                    const result = {};
                    resp.body.forEach(item => {
                        if (Array.isArray(item.data)) {
                            result[item.type] = item.data;
                        }
                    });
                    return Promise.resolve(result);
                }
                throw new Error(`Invalid data returned for ${source}`);
            });
        });
    }
    getSegment(segmentId) {
        return __awaiter(this, void 0, void 0, function* () {
            return request
                .get(STRAVA_API_PREFIX + '/segments/' + segmentId)
                .set('Authorization', 'access_token ' + this.creds.accessToken);
        });
    }
    getSegmentEfforts(segmentId, params) {
        return __awaiter(this, void 0, void 0, function* () {
            return request.get(STRAVA_API_PREFIX + '/segments/' + segmentId + '/all_efforts').query(params);
        });
    }
}
exports.StravaApi = StravaApi;
//# sourceMappingURL=strava-api.js.map