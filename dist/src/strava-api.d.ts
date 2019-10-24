import { Dict, EpochSeconds } from './util/file';
import { StravaCreds } from './strava-creds';
export declare type StravaCode = string;
export declare type StravaSecret = string;
export declare type StravaAccessToken = string;
export declare type StravaRefreshToken = string;
export declare type StravaClientId = number;
export declare type StravaClientConfig = {
    id: StravaClientId;
    secret: StravaSecret;
};
export declare type StravaApiOpts = StravaClientConfig & {
    token: StravaAccessToken;
};
export declare type AuthorizationUrlOpts = {
    redirectUri?: string;
    scope?: string;
    state?: string;
    approvalPrompt?: string;
};
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
    id: StravaClientId;
    secret: StravaSecret;
    private _credsFile;
    private _creds;
    constructor(clientConfig: StravaClientConfig, credsFile: string);
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
