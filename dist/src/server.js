"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const koa_1 = __importDefault(require("koa"));
const koa_router_1 = __importDefault(require("koa-router"));
const open_1 = __importDefault(require("open"));
const request = require("superagent");
class Server {
    constructor(strava) {
        this.strava = strava;
    }
    run() {
        const app = new koa_1.default();
        const router = new koa_router_1.default();
        let authOpts = {
            redirectUri: 'http://localhost:3000/token'
        };
        const authUrl = this.strava.getAuthorizationUrl(authOpts);
        router.get('/token', (ctx) => __awaiter(this, void 0, void 0, function* () {
            const code = ctx.query.code;
            const err = ctx.query.error;
            let tokenOpts = {
                code: ctx.query.code
            };
            let tokenUrl = this.strava.getTokenUrl(tokenOpts);
            let s = '<html><body><h1>Credential Exchange</h1>';
            return Promise.resolve()
                .then(resp => {
                if (err === 'access_denied') {
                    s += '<p>Error, access denied</p>';
                }
                else {
                    s += `<p>Authorization code: ${code}</p>`;
                    s += '<p>Retrieving session tokens ...</p>';
                    return this.getTokens(code)
                        .then(resp => {
                        s += '<p>Tokens retrieved. Please return to command line.</p>';
                    })
                        .catch(err => {
                        s += `<p>Error retrieving tokens: ${err.message}</p>`;
                    });
                }
            })
                .then(resp => {
                s += '</body></html>';
                ctx.body = s;
            });
        }));
        router.get('/*', (ctx) => __awaiter(this, void 0, void 0, function* () {
            ctx.body = `<html><body><a href="${authUrl}">Click to authenticate</a></body></html>`;
        }));
        app.use(router.routes());
        app.listen(3000);
        console.log('Server running on port 3000');
        open_1.default(authUrl, { wait: true }).then(resp => {
            console.log('browser is open');
        });
    }
    getTokens(code) {
        let tokenOpts = {
            code: code
        };
        let tokenUrl = this.strava.getTokenUrl(tokenOpts);
        return request
            .post(tokenUrl)
            .then(resp => {
            return this.strava.creds.write(resp);
        })
            .then(resp => {
            console.log('Credentials written to local storage');
        });
    }
}
exports.Server = Server;
//# sourceMappingURL=server.js.map