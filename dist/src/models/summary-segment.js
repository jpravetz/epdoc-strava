"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const segment_base_1 = require("./segment-base");
class SummarySegment extends segment_base_1.SegmentBase {
    constructor(data) {
        super(data);
        this.coordinates = [];
    }
    static newFromResponseData(data) {
        return new SummarySegment(data);
    }
    static isInstance(val) {
        return val && val.klass === 'SummarySegment';
    }
}
exports.SummarySegment = SummarySegment;
//# sourceMappingURL=summary-segment.js.map