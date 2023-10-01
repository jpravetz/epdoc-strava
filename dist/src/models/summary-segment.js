"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummarySegment = void 0;
const segment_base_1 = require("./segment-base");
class SummarySegment extends segment_base_1.SegmentBase {
    constructor(data) {
        super(data);
        this._isSummarySegment = true;
        this.coordinates = [];
    }
    static newFromResponseData(data) {
        return new SummarySegment(data);
    }
    get isSummarySegment() {
        return this._isSummarySegment;
    }
    static isInstance(val) {
        return val && val.isSummarySegment;
    }
    asCacheEntry() {
        return {
            name: this.name ? this.name.trim() : '',
            distance: this.distance,
            gradient: this.average_grade,
            elevation: this.elevation_high - this.elevation_low,
        };
    }
}
exports.SummarySegment = SummarySegment;
//# sourceMappingURL=summary-segment.js.map