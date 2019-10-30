import { StravaCoord } from './strava-api';
import { Athelete } from './models/athlete';
import { Activity } from './models/activity';
import { Dict, EpochSeconds } from './util';
import request = require('superagent');
import { StravaCreds } from './strava-creds';
import { DetailedActivity } from './models/detailed-activity';
import { SummarySegment } from './models/summary-segment';
export declare type StravaCode = string;
export declare type StravaSecret = string;
export declare type StravaAccessToken = string;
export declare type StravaRefreshToken = string;
export declare type StravaClientId = number;
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
export declare type StravaObjId = number;
export declare type StravaSegmentId = StravaObjId;
export declare type Query = Dict;
export declare type StravaCoord = [number, number];
export declare type StravaCoordData = {
    type: string;
    data: StravaCoord[];
};
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
    getStarredSegments(): Promise<SummarySegment[]>;
    getStreamCoords(source: StravaStreamSource, objId: StravaObjId, name: string): Promise<any[]>;
    getDetailedActivity(activity: Activity): Promise<DetailedActivity>;
    /**
     * Retrieve data for the designated type of stream
     * @param objId The activity or segement ID
     * @param types An array, usually [ 'latlng' ]
     * @param options Additional query string parameters, if any
     * @param callback
     * @returns {*}
     */
    getStreams(source: StravaStreamSource, objId: StravaSegmentId, options: Query): Promise<Record<string, any>>;
    getSegment(segmentId: StravaSegmentId): request.SuperAgentRequest;
    getSegmentEfforts(segmentId: StravaSegmentId, params: Query): request.SuperAgentRequest;
}
