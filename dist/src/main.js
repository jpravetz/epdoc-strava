"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const athlete_1 = require("./models/athlete");
const activity_1 = require("./models/activity");
const fs_1 = __importDefault(require("fs"));
const strava_api_1 = require("./strava-api");
const kml_1 = require("./kml");
const file_1 = require("./util/file");
const server_1 = require("./server");
class Main {
    constructor(options) {
        this.options = options;
    }
    init() {
        if (this.options.config && this.options.config.client) {
            this.strava = new strava_api_1.StravaApi(this.options.config.client, this.options.credentialsFile);
            return Promise.resolve()
                .then(resp => {
                if (this.options.kml) {
                    // Run this first to validate line styles before pinging strava APIs
                    this.kml = new kml_1.Kml({ verbose: this.options.verbose });
                    if (this.options.config.lineStyles) {
                        this.kml.setLineStyles(this.options.config.lineStyles);
                    }
                }
                if (this.options.segmentsFile) {
                    return this.readSegmentsFile(this.options.segmentsFile);
                }
                else {
                    return Promise.resolve();
                }
            })
                .then(resp => {
                return this.strava.initCreds();
            });
        }
        else {
            return Promise.reject(new Error('No config file specified'));
        }
    }
    run() {
        return this.init()
            .then(resp => {
            if (!this.strava.creds.areValid()) {
                console.log('Authorization required. Opening web authorization page');
                let authServer = new server_1.Server(this.strava);
                return authServer.run();
            }
            else {
                console.log('Authorization not required');
            }
        })
            .then(resp => {
            if (!this.strava.creds.areValid()) {
                throw new Error('Invalid credentials');
            }
        })
            .then(resp => {
            if (this.options.kml && !this.options.activities && !this.options.segments) {
                throw new Error('When writing kml select either segments, activities or both');
            }
        })
            .then(resp => {
            if (this.options.athlete) {
                return this.getAthlete().then(resp => {
                    this.logAthlete();
                });
            }
        })
            .then(resp => {
            if (this.options.activities) {
                return this.getActivities().then(resp => {
                    console.log('Activities', JSON.stringify(resp, null, '  '));
                });
            }
        });
    }
    readSegmentsFile(segmentsFile) {
        return new Promise((resolve, reject) => {
            if (fs_1.default.existsSync(segmentsFile)) {
                fs_1.default.stat(segmentsFile, (err, stats) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        this.segmentsFileLastModified = stats.mtime;
                        this.segmentConfig = file_1.readJson(segmentsFile);
                        this.segmentConfig || (this.segmentConfig = {});
                        this.segmentConfig.alias || (this.segmentConfig.alias = {});
                        this.segmentConfig.data || (this.segmentConfig.data = {});
                        resolve();
                    }
                });
            }
            else {
                this.segmentConfig = { description: 'Strava segments', alias: {}, data: {} };
                resolve();
            }
        });
    }
    getAthlete() {
        return this.strava
            .getAthlete(this.options.athleteId)
            .then(resp => {
            this.athlete = athlete_1.Athelete.newFromResponseData(resp);
        })
            .catch(err => {
            err.message = 'Athlete - ' + err.message;
            throw err;
        });
    }
    logAthlete() {
        console.log('Athlete', JSON.stringify(this.athlete, null, '  '));
    }
    getActivities() {
        let results = [];
        let count = 0;
        let dateRanges = Array.isArray(this.options.dates) ? this.options.dates : [];
        return dateRanges
            .reduce((promiseChain, dateRange) => {
            return promiseChain.then(() => {
                let job = this.getActivitiesForDateRange(dateRange).then(resp => {
                    results = results.concat(resp);
                });
                return job;
            });
        }, Promise.resolve())
            .then(resp => {
            results = results.sort(activity_1.Activity.compareStartDate);
            return Promise.resolve(results);
        });
    }
    getActivitiesForDateRange(dateRange) {
        let params = {
            athleteId: this.options.athleteId,
            query: {
                per_page: 200,
                after: dateRange.after,
                before: dateRange.before
            }
        };
        return this.strava.getActivities(params).then(resp => {
            let activities = resp;
            let results = [];
            resp.forEach(data => {
                let activity = activity_1.Activity.newFromResponseData(data, this.options);
                if (activity) {
                    results.push(activity);
                }
            });
            return Promise.resolve(results);
        });
    }
}
exports.Main = Main;
//# sourceMappingURL=main.js.map