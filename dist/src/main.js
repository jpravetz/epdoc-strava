"use strict";
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
exports.Main = void 0;
const bikelog_1 = require("./bikelog");
const kml_1 = require("./kml");
const activity_1 = require("./models/activity");
const segment_file_1 = require("./segment-file");
const server_1 = require("./server");
const strava_api_1 = require("./strava-api");
// let _ = require('underscore');
// let async = require('async');
// let dateutil = require('dateutil');
// let Strava = require('../lib/stravaV3api');
// let Bikelog = require('../lib/bikelog');
const REQ_LIMIT = 10;
class Main {
    constructor(options) {
        this.starredSegments = [];
        this.bikes = {};
        this.options = options;
        this._config = options.config;
        this._log = options.log ? options.log : (msg) => { };
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.config && this.config.client) {
                this.strava = new strava_api_1.StravaApi(this.config.client, this.config.credentials);
                return Promise.resolve()
                    .then(resp => {
                    if (this.options.kml) {
                        // Run this first to validate line styles before pinging strava APIs
                        this.kml = new kml_1.Kml({ verbose: this.options.verbose });
                        if (this.options.config.lineStyles) {
                            this.kml.setLineStyles(this.options.config.lineStyles);
                        }
                    }
                })
                    .then(resp => {
                    return this.strava.initCreds();
                });
            }
            else {
                return Promise.reject(new Error('No config file or config file does not contain client id and secret'));
            }
        });
    }
    get config() {
        return this._config;
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.init()
                .then(resp => {
                if (!this.strava.creds.areValid()) {
                    this._log('Authorization required. Opening web authorization page');
                    const authServer = new server_1.Server(this.strava);
                    return authServer.run().then(resp => {
                        this._log('Closing server');
                        authServer.close();
                    });
                }
                else {
                    this._log('Authorization not required');
                }
            })
                .then(resp => {
                if (!this.strava.creds.areValid()) {
                    throw new Error('Invalid credentials');
                }
            })
                .then(resp => {
                this.segFile = new segment_file_1.SegmentFile(this.options.segmentsFile, this.strava, { log: this._log });
                return this.segFile.get({ refresh: this.options.refreshStarredSegments });
            })
                .then(resp => {
                if (this.options.kml && !this.options.activities && !this.options.segments) {
                    throw new Error('When writing kml select either segments, activities or both');
                }
            })
                .then(resp => {
                if (this.options.athlete || this.options.xml || this.options.kml) {
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
                        this._log(`Found ${resp.length} Activities`);
                        if (!this.options.xml) {
                            resp.forEach(i => {
                                this._log('  ' + i.toString());
                            });
                        }
                    });
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
            })
                .then(resp => {
                if (this.options.kml && this.options.activities) {
                    return this.addActivitiesCoordinates();
                }
            })
                .then(resp => {
                if (this.options.kml && this.options.segments) {
                    return this.addStarredSegmentsCoordinates();
                }
            })
                .then(resp => {
                if (this.options.kml) {
                    let opts = {
                        activities: true,
                        segments: this.options.segments ? true : false
                    };
                    return this.saveKml(opts);
                }
            });
        });
    }
    getAthlete() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.strava
                .getAthlete(this.options.athleteId)
                .then(resp => {
                this.athlete = resp;
                this.registerBikes(this.athlete.bikes);
            })
                .catch(err => {
                err.message = 'Athlete ' + err.message;
                throw err;
            });
        });
    }
    logAthlete() {
        this._log('Athlete ' + JSON.stringify(this.athlete, null, '  '));
    }
    getActivities() {
        return __awaiter(this, void 0, void 0, function* () {
            let results = [];
            const dateRanges = Array.isArray(this.options.dates) ? this.options.dates : [];
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
        });
    }
    getActivitiesForDateRange(dateRange) {
        return __awaiter(this, void 0, void 0, function* () {
            const params = {
                athleteId: this.options.athleteId,
                query: {
                    per_page: 200,
                    after: dateRange.after,
                    before: dateRange.before
                }
            };
            return this.strava.getActivities(params).then(resp => {
                const activities = resp;
                const results = [];
                resp.forEach(data => {
                    const activity = activity_1.Activity.newFromResponseData(data, this);
                    if (activity) {
                        results.push(activity);
                    }
                });
                return Promise.resolve(results);
            });
        });
    }
    filterActivities(activities) {
        const filter = {
            commuteOnly: this.options.commuteOnly,
            nonCommuteOnly: this.options.nonCommuteOnly,
            include: this.options.activityFilter
        };
        const results = activities.filter(activity => {
            return activity.include(filter);
        });
        return results;
    }
    /**
     * Read more information using the DetailedActivity object and add these
     * details to the Activity object.
     */
    addActivitiesDetails() {
        return __awaiter(this, void 0, void 0, function* () {
            this._log(`Retrieving activity details for ${this.activities.length} Activities`);
            // Break into chunks to limit to REQ_LIMIT parallel requests.
            const activitiesChunks = [];
            for (let idx = 0; idx < this.activities.length; idx += REQ_LIMIT) {
                const tmpArray = this.activities.slice(idx, idx + REQ_LIMIT);
                activitiesChunks.push(tmpArray);
            }
            return activitiesChunks
                .reduce((promiseChain, activities) => {
                return promiseChain.then(() => {
                    const jobs = [];
                    activities.forEach(activity => {
                        const job = this.addActivityDetail(activity);
                        jobs.push(job);
                    });
                    return Promise.all(jobs);
                });
            }, Promise.resolve())
                .then(resp => {
                return Promise.resolve();
            });
        });
    }
    addActivityDetail(activity) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.strava.getDetailedActivity(activity).then(data => {
                activity.addFromDetailedActivity(data);
            });
        });
    }
    /**
     * Add coordinates for the activity or segment. Limits to REQ_LIMIT parallel requests.
     */
    addActivitiesCoordinates() {
        this._log(`Retrieving coordinates for ${this.activities.length} Activities`);
        // Break into chunks to limit to REQ_LIMIT parallel requests.
        const activitiesChunks = [];
        for (let idx = 0; idx < this.activities.length; idx += REQ_LIMIT) {
            const tmpArray = this.activities.slice(idx, idx + REQ_LIMIT);
            activitiesChunks.push(tmpArray);
        }
        return activitiesChunks
            .reduce((promiseChain, items) => {
            return promiseChain.then(() => {
                const jobs = [];
                items.forEach(item => {
                    const activity = item;
                    const name = activity.startDateLocal;
                    const job = this.strava.getStreamCoords(strava_api_1.StravaStreamSource.activities, activity.id, name).then(resp => {
                        activity.coordinates = resp;
                    });
                    jobs.push(job);
                });
                return Promise.all(jobs);
            });
        }, Promise.resolve())
            .then(resp => {
            return Promise.resolve();
        });
    }
    /**
     * Call only when generating KML file with all segments
     */
    addStarredSegmentsCoordinates() {
        return __awaiter(this, void 0, void 0, function* () {
            this._log(`Retrieving coordinates for ${this.starredSegments.length} Starred Segments`);
            return this.starredSegments
                .reduce((promiseChain, item) => {
                return promiseChain.then(() => {
                    return this.strava.getStreamCoords(strava_api_1.StravaStreamSource.segments, item.id, item.name).then(resp => {
                        item.coordinates = resp;
                    });
                });
            }, Promise.resolve())
                .then(resp => {
                return Promise.resolve();
            });
        });
    }
    registerBikes(bikes) {
        if (bikes && bikes.length) {
            bikes.forEach(bike => {
                this.bikes[bike.id] = bike;
            });
        }
    }
    saveXml() {
        const opts = {
            more: this.options.more,
            dates: this.options.dateRanges,
            imperial: this.options.imperial,
            selectedBikes: this.options.config.bikes,
            bikes: this.bikes
        };
        if (this.options.segments === 'flat') {
            opts.segmentsFlatFolder = true;
        }
        const bikelog = new bikelog_1.Bikelog(opts);
        return bikelog.outputData(this.options.xml, this.activities);
    }
    saveKml(options = {}) {
        const opts = {
            more: this.options.more,
            dates: this.options.dateRanges,
            imperial: this.options.imperial,
            activities: options.activities,
            segments: options.segments,
            bikes: this.bikes
        };
        if (this.options.segments === 'flat') {
            opts.segmentsFlatFolder = true;
        }
        const kml = new kml_1.Kml(opts);
        return kml.outputData(this.options.kml, this.activities, this.starredSegments);
    }
}
exports.Main = Main;
//# sourceMappingURL=main.js.map