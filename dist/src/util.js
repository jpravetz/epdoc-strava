"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
function sortBy() { }
exports.sortBy = sortBy;
function formatHMS(s, options) {
    options || (options = {});
    let seconds = s % 60;
    let minutes = Math.floor(s / 60) % 60;
    let hours = Math.floor(s / (60 * 60));
    let result = this.pad(hours) + ':';
    result += this.pad(minutes);
    if (options.seconds !== false) {
        result += ':' + this.pad(seconds);
    }
    return result;
}
exports.formatHMS = formatHMS;
function formatMS(s, options) {
    let seconds = s % 60;
    let minutes = Math.floor(s / 60);
    let result = minutes + ':';
    result += this.pad(seconds);
    return result;
}
exports.formatMS = formatMS;
function readJson(path) {
    return new Promise((resolve, reject) => {
        fs_1.default.readFile(path, 'utf8', (err, data) => {
            if (err) {
                reject(err);
            }
            else {
                try {
                    let json = JSON.parse(data.toString());
                    resolve(json);
                }
                catch (error) {
                    reject(error);
                }
            }
        });
    });
}
exports.readJson = readJson;
function writeJson(path, data) {
    return new Promise((resolve, reject) => {
        let buf = new Buffer(JSON.stringify(data, null, '  '));
        fs_1.default.writeFile(path, buf, err => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}
exports.writeJson = writeJson;
function julianDate(d) {
    return Math.floor(d.getTime() / 86400000 - d.getTimezoneOffset() / 1440 + 2440587.5) + 1;
}
exports.julianDate = julianDate;
//# sourceMappingURL=util.js.map