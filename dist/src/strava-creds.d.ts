import { EpochSeconds, Seconds } from './util';
export declare type StravaCredsData = {
    token_type: string;
    expires_at: EpochSeconds;
    expires_in: EpochSeconds;
    refresh_token: string;
    access_token: string;
    athlete: {
        id?: string;
        username?: string;
        [key: string]: any;
    };
};
export declare class StravaCreds {
    data: StravaCredsData;
    path: string;
    constructor(tokenFile: string);
    readonly expiresAt: EpochSeconds;
    readonly refreshToken: string;
    readonly accessToken: string;
    areValid(t?: Seconds): boolean;
    static validCredData(val: any): val is StravaCredsData;
    read(): Promise<void>;
    write(data: any): Promise<void>;
}
