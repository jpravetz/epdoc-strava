"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const segment_base_1 = require("./segment-base");
class Segment extends segment_base_1.SegmentBase {
    // more: boolean;
    // efforts: Dict[];
    constructor(data) {
        super(data);
        this.klass = 'Segment';
    }
    static newFromResponseData(data) {
        return new Segment(data);
    }
    static isInstance(val) {
        return val && val.klass === 'Segment';
    }
}
exports.Segment = Segment;
//# sourceMappingURL=segment.js.map