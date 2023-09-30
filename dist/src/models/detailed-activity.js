"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DetailedActivity = void 0;
const epdoc_util_1 = require("epdoc-util");
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
        return val && (0, epdoc_util_1.isNumber)(val.id) && (0, epdoc_util_1.isBoolean)(val.commute);
    }
}
exports.DetailedActivity = DetailedActivity;
//# sourceMappingURL=detailed-activity.js.map