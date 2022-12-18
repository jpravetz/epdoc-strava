import { EpochSeconds, Seconds } from './util';
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
export declare class StravaCreds {
    private data;
    private path;
    constructor(tokenFile: string);
    get expiresAt(): EpochSeconds;
    get refreshToken(): string;
    get accessToken(): string;
    areValid(t?: Seconds): boolean;
    static validCredData(val: any): val is StravaCredsData;
    read(): Promise<void>;
    write(data: any): Promise<void>;
}
