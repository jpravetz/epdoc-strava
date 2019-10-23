import { Dict, EpochSeconds } from './util/file';
import { StravaCreds } from './strava-creds';
export declare type StravaApiOpts = {
    id: number;
    secret: string;
    token: string;
};
export declare type AuthorizationUrlOpts = {
    redirectUri?: string;
    scope?: string;
    state?: string;
    approvalPrompt?: string;
};
export declare type StravaCode = string;
export declare type TokenUrlOpts = {
    code?: string;
};
export declare type StravaActivityOpts = {
    athleteId: number;
    query: {
        after: EpochSeconds;
        before: EpochSeconds;
        per_page: number;
        page?: number;
    };
};
export declare class StravaApi {
    id: number;
    secret: string;
    token: string;
    private _credsFile;
    private _creds;
    constructor(opts: StravaApiOpts, credsFile: string);
    toString(): string;
    initCreds(): Promise<void>;
    readonly creds: StravaCreds;
    getAuthorizationUrl(options?: AuthorizationUrlOpts): string;
    getTokenUrl(options?: TokenUrlOpts): string;
    getTokens(code: StravaCode): Promise<void>;
    getTokenPayload(options?: TokenUrlOpts): string;
    acquireToken(code: string): Promise<string>;
    authHeaders: () => Record<string, any>;
    getAthlete(athleteId?: number): Dict;
    getActivities(options: StravaActivityOpts, callback: any): Promise<Dict[]>;
}
