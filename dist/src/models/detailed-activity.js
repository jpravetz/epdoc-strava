"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
/**
 * We fetch DetailedActivity from Strava and pick data from this object and add
 * it to Activity object.
 */
class DetailedActivity {
    constructor(data) {
        Object.assign(this, data);
    }
    static newFromResponseData(data) {
        return new DetailedActivity(data);
    }
    static isInstance(val) {
        return val && util_1.isNumber(val.id) && util_1.isBoolean(val.commute);
    }
}
exports.DetailedActivity = DetailedActivity;
//# sourceMappingURL=detailed-activity.js.map