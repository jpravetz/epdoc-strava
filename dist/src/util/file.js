"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
function sortBy() { }
exports.sortBy = sortBy;
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
//# sourceMappingURL=file.js.map