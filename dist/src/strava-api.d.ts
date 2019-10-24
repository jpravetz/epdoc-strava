import { Athelete } from './models/athlete';
import { Activity } from './models/activity';
import { Dict, EpochSeconds } from './util';
import { StravaCreds } from './strava-creds';
import { DetailedActivity } from './models/detailed-activity';
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
    /**
     * Exchanges code for refresh and access tokens from Strava. Writes these
     * tokens to ~/.strava/credentials.json.
     * @param code
     */
    getTokens(code: StravaCode): Promise<void>;
    acquireToken(code: string): Promise<string>;
    authHeaders: () => Record<string, any>;
    getAthlete(athleteId?: number): Promise<Athelete>;
    getActivities(options: StravaActivityOpts, callback: any): Promise<Dict[]>;
    getStarredSegments(): Promise<any[]>;
    getDetailedActivity(activity: Activity): Promise<DetailedActivity>;
}
