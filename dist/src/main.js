"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const activity_1 = require("./models/activity");
const fs_1 = __importDefault(require("fs"));
const strava_api_1 = require("./strava-api");
const kml_1 = require("./kml");
const util_1 = require("./util");
const server_1 = require("./server");
const bikelog_1 = require("./bikelog");
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
                return authServer.run().then(resp => {
                    authServer.close();
                });
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
            if (this.options.athlete || this.options.xml) {
                return this.getAthlete().then(resp => {
                    if (!this.options.xml) {
                        this.logAthlete();
                    }
                });
            }
        })
            .then(resp => {
            if (this.options.activities || this.options.xml) {
                return this.getActivities().then(resp => {
                    this.activities = resp;
                    console.log(`Found ${resp.length} Activities`);
                    if (!this.options.xml) {
                        resp.forEach(i => {
                            console.log('  ' + i.toString());
                        });
                    }
                });
            }
        })
            .then(resp => {
            if (this.options.xml) {
                return this.getStarredSegmentList();
            }
        })
            .then(resp => {
            if (this.options.xml) {
                return this.addActivitiesDetails();
            }
        })
            .then(resp => {
            if (this.options.xml) {
                return this.saveXml();
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
                        this.segmentConfig = util_1.readJson(segmentsFile);
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
            this.athlete = resp;
        })
            .catch(err => {
            err.message = 'Athlete ' + err.message;
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
            results = this.filterActivities(results);
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
                let activity = activity_1.Activity.newFromResponseData(data, this);
                if (activity) {
                    results.push(activity);
                }
            });
            return Promise.resolve(results);
        });
    }
    filterActivities(activities) {
        let filter = {
            commuteOnly: this.options.commuteOnly,
            nonCommuteOnly: this.options.nonCommuteOnly,
            include: this.options.activityFilter
        };
        let results = activities.filter(activity => {
            return activity.include(filter);
        });
        return results;
    }
    getStarredSegmentList() {
        this.starredSegment = [];
        return this.strava.getStarredSegments().then(resp => {
            this.segments = resp;
            console.log('Found %s starred segments', resp ? resp.length : 0);
            this.segments.forEach(seg => {
                // @ts-ignore
                this.starredSegment.push(seg.name);
            });
        });
    }
    addActivitiesDetails() {
        let jobs = [];
        this.activities.forEach(activity => {
            let job = this.addActivityDetail(activity);
            jobs.push(job);
        });
        return Promise.all(jobs);
    }
    addActivityDetail(activity) {
        return this.strava.getDetailedActivity(activity).then(data => {
            activity.addFromDetailedActivity(data);
        });
    }
    saveXml() {
        let opts = {
            more: this.options.more,
            dates: this.options.dateRanges,
            imperial: this.options.imperial
        };
        if (this.options.segments === 'flat') {
            opts.segmentsFlatFolder = true;
        }
        let bikelog = new bikelog_1.Bikelog(opts);
        return bikelog.outputData(this.activities, this.athlete.bikes, this.options.xml);
    }
}
exports.Main = Main;
//# sourceMappingURL=main.js.map