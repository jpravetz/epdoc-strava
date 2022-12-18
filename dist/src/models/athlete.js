"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Athelete = void 0;
const epdoc_util_1 = require("epdoc-util");
class Athelete {
    constructor(data) {
        Object.assign(this, data);
    }
    static newFromResponseData(data) {
        return new Athelete(data);
    }
    static isInstance(val) {
        return val && (0, epdoc_util_1.isNumber)(val.id) && (0, epdoc_util_1.isString)(val.username);
    }
}
exports.Athelete = Athelete;
//# sourceMappingURL=athlete.js.map