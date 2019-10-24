"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Activity {
    constructor(data) {
        this.keys = ['distance', 'total_elevation_gain', 'moving_time', 'elapsed_time', 'average_temp', 'device_name'];
        Object.assign(this, data);
    }
    static newFromResponseData(data, opts) {
        if ((!opts.commuteOnly && !opts.nonCommuteOnly) ||
            (opts.commuteOnly && data.commute) ||
            (opts.nonCommuteOnly && !data.commute)) {
            if (opts.activityFilter && Array.isArray(opts.activityFilter)) {
                if (opts.activityFilter.indexOf(data.type) >= 0) {
                    return new Activity(data);
                }
            }
            else {
                return new Activity(data);
            }
        }
    }
    static compareStartDate(a, b) {
        if (a.start_date < b.start_date) {
            return -1;
        }
        if (a.start_date > b.start_date) {
            return 1;
        }
        return 0;
    }
}
exports.Activity = Activity;
//# sourceMappingURL=activity.js.map