import { EpochSeconds, Dict, Seconds } from './util/file';
export declare type StravaCredsData = {
    token_type: string;
    expires_at: EpochSeconds;
    expires_in: EpochSeconds;
    refresh_token: string;
    access_token: string;
    athlete: Dict;
};
export declare class StravaCreds {
    data: StravaCredsData;
    path: string;
    constructor(tokenFile: string);
    readonly expiresAt: EpochSeconds;
    readonly refreshToken: string;
    readonly accessToken: string;
    areValid(t?: Seconds): boolean;
    read(): Promise<void>;
    write(data: StravaCredsData): Promise<void>;
}
