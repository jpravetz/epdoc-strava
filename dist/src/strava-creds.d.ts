import { EpochSeconds, FilePath, Seconds } from './util';
export type StravaCredsData = {
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
export declare function isStravaCredsData(val: any): val is StravaCredsData;
export declare class StravaCreds {
    private _data;
    private _path;
    constructor(tokenFile: FilePath);
    get expiresAt(): EpochSeconds;
    get refreshToken(): string;
    get accessToken(): string;
    areValid(t?: Seconds): boolean;
    static validCredData(val: any): val is StravaCredsData;
    read(): Promise<void>;
    write(data: any): Promise<void>;
}
