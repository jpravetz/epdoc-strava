import { Dict, EpochSeconds } from './util/file';
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
    constructor(opts: StravaApiOpts);
    toString(): string;
    getAuthorizationUrl(options: AuthorizationUrlOpts): string;
    acquireToken(code: string): Promise<string>;
    authHeaders: () => Record<string, any>;
    getAthlete(athleteId?: number): Dict;
    getActivities(options: StravaActivityOpts, callback: any): Promise<Dict[]>;
}
