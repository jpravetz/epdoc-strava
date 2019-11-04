"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const segment_file_1 = require("./segment-file");
const activity_1 = require("./models/activity");
const strava_api_1 = require("./strava-api");
const kml_1 = require("./kml");
const server_1 = require("./server");
const bikelog_1 = require("./bikelog");
// let _ = require('underscore');
// let async = require('async');
// let dateutil = require('dateutil');
// let Strava = require('../lib/stravaV3api');
// let Bikelog = require('../lib/bikelog');
const REQ_LIMIT = 10;
class Main {
    constructor(options) {
        this.starredSegments = [];
        this.options = options;
        this.config = options.config;
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
            })
                .then(resp => {
                return this.strava.initCreds();
            });
        }
        else {
            return Promise.reject(new Error('No config file or config file does not contain client id and secret'));
        }
    }
    run() {
        return this.init()
            .then(resp => {
            if (!this.strava.creds.areValid()) {
                console.log('Authorization required. Opening web authorization page');
                let authServer = new server_1.Server(this.strava);
                return authServer.run().then(resp => {
                    console.log('Closing server');
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
            this.segFile = new segment_file_1.SegmentFile(this.options.segmentsFile, this.strava);
            return this.segFile.get({ refresh: this.options.refreshStarredSegments });
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
    /**
     * Read more information using the DetailedActivity object and add these
     * details to the Activity object.
     */
    addActivitiesDetails() {
        console.log(`Retrieving activity details for ${this.activities.length} Activities`);
        // Break into chunks to limit to REQ_LIMIT parallel requests.
        let activitiesChunks = [];
        for (let idx = 0; idx < this.activities.length; idx += REQ_LIMIT) {
            const tmpArray = this.activities.slice(idx, idx + REQ_LIMIT);
            activitiesChunks.push(tmpArray);
        }
        return activitiesChunks
            .reduce((promiseChain, activities) => {
            return promiseChain.then(() => {
                let jobs = [];
                activities.forEach(activity => {
                    let job = this.addActivityDetail(activity);
                    jobs.push(job);
                });
                return Promise.all(jobs);
            });
        }, Promise.resolve())
            .then(resp => {
            return Promise.resolve();
        });
    }
    addActivityDetail(activity) {
        return this.strava.getDetailedActivity(activity).then(data => {
            activity.addFromDetailedActivity(data);
        });
    }
    /**
     * Add coordinates for the activity or segment. Limits to REQ_LIMIT parallel requests.
     */
    addActivitiesCoordinates() {
        console.log(`Retrieving coordinates for ${this.activities.length} Activities`);
        // Break into chunks to limit to REQ_LIMIT parallel requests.
        let activitiesChunks = [];
        for (let idx = 0; idx < this.activities.length; idx += REQ_LIMIT) {
            const tmpArray = this.activities.slice(idx, idx + REQ_LIMIT);
            activitiesChunks.push(tmpArray);
        }
        return activitiesChunks
            .reduce((promiseChain, items) => {
            return promiseChain.then(() => {
                let jobs = [];
                items.forEach(item => {
                    let name = item.start_date_local;
                    let job = this.strava.getStreamCoords(strava_api_1.StravaStreamSource.activities, item.id, name).then(resp => {
                        item._coordinates = resp;
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
        console.log(`Retrieving coordinates for ${this.starredSegments.length} Starred Segments`);
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
    }
    saveXml() {
        let opts = {
            more: this.options.more,
            dates: this.options.dateRanges,
            imperial: this.options.imperial,
            bikes: this.options.config.bikes
        };
        if (this.options.segments === 'flat') {
            opts.segmentsFlatFolder = true;
        }
        let bikelog = new bikelog_1.Bikelog(opts);
        return bikelog.outputData(this.options.xml, this.activities, this.athlete.bikes);
    }
    saveKml(options = {}) {
        let opts = {
            more: this.options.more,
            dates: this.options.dateRanges,
            imperial: this.options.imperial,
            activities: options.activities,
            segments: options.segments
        };
        if (this.options.segments === 'flat') {
            opts.segmentsFlatFolder = true;
        }
        let kml = new kml_1.Kml(opts);
        return kml.outputData(this.options.kml, this.activities, this.starredSegments);
    }
}
exports.Main = Main;
//# sourceMappingURL=main.js.map