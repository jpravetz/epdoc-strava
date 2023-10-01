import { Dict } from 'epdoc-util';
import { MainOpts } from './main';
import { Activity } from './models/activity';
import { DetailedActivity } from './models/detailed-activity';
import { SummarySegment } from './models/summary-segment';
import { StravaCreds } from './strava-creds';
import { EpochSeconds } from './util';
export type StravaCode = string;
export type StravaSecret = string;
export type StravaAccessToken = string;
export type StravaRefreshToken = string;
export type StravaClientId = number;
export declare enum StravaStreamSource {
    activities = "activities",
    segments = "segments",
    routes = "routes",
    segmentEfforts = "segment_efforts"
}
export declare enum StravaStreamType {
    latlng = "latlng",
    distance = "distance",
    altitude = "altitude"
}
export type StravaObjId = number;
export type StravaSegmentId = StravaObjId;
export type Query = Dict;
export type StravaCoord = [number, number];
export type StravaCoordData = {
    type: string;
    data: StravaCoord[];
};
export type StravaClientSecret = {
    id: StravaClientId;
    secret: StravaSecret;
};
export declare function isStravaClientSecret(val: any): val is StravaClientSecret;
export type StravaApiOpts = StravaClientSecret & {
    token: StravaAccessToken;
};
export type AuthorizationUrlOpts = {
    redirectUri?: string;
    scope?: string;
    state?: string;
    approvalPrompt?: string;
};
export type TokenUrlOpts = {
    code?: string;
};
export type StravaActivityOpts = {
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
    private _creds;
    private _log;
    constructor(clientConfig: StravaClientSecret, creds: StravaCreds, opts: MainOpts);
    toString(): string;
    /**
     * Read OAUTH token file and places result in creds. This should be done
     * before trying to authenticate with Strava.
     * @returns
     */
    private initCreds;
    /**
     * The OAUTH tokens that were read by initCreds(). If these creds are valid
     * (creds.isValid) then authentication is not required.  If these creds are
     * invalid, the caller will need to create an HTTP server (Server.ts) to use
     * to retrieve updated tokens.
     */
    get creds(): StravaCreds;
    private getAuthorizationUrl;
    private getTokenUrl;
    /**
     * Exchanges code for refresh and access tokens from Strava. Writes these
     * tokens to ~/.strava/credentials.json.
     * @param code
     */
    private getTokens;
    private acquireToken;
    private authHeaders;
    private getAthlete;
    getActivities(options: StravaActivityOpts): Promise<Dict[]>;
    getStarredSegments(accum: SummarySegment[], page?: number): Promise<void>;
    getStreamCoords(source: StravaStreamSource, objId: StravaObjId, name: string): Promise<any[]>;
    getDetailedActivity(activity: Activity): Promise<DetailedActivity>;
    /**
     * Retrieve data for the designated type of stream
     * @param objId The activity or segement ID
     * @param types An array, usually [ 'latlng' ]
     * @param options Additional query string parameters, if any
     * @returns {*}
     */
    private getStreams;
    private getSegment;
    private getSegmentEfforts;
}
