"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const epdoc_util_1 = require("epdoc-util");
class Athelete {
    constructor(data) {
        Object.assign(this, data);
    }
    static newFromResponseData(data) {
        return new Athelete(data);
    }
    static isInstance(val) {
        return val && epdoc_util_1.isNumber(val.id) && epdoc_util_1.isString(val.username);
    }
}
exports.Athelete = Athelete;
//# sourceMappingURL=athlete.js.map