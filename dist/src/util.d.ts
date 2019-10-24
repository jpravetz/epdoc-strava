export declare function sortBy(): void;
export declare type Dict = Record<string, any>;
export declare type EpochMilliseconds = number;
export declare type EpochSeconds = number;
export declare type Seconds = number;
export declare type Metres = number;
export declare type Kilometres = number;
export declare type IsoDateString = string;
export declare type formatHMSOpts = {
    seconds?: boolean;
};
export declare function formatHMS(s: Seconds, options?: formatHMSOpts): string;
export declare function formatMS(s: Seconds, options?: any): string;
export declare function readJson(path: string): Promise<any>;
export declare function writeJson(path: string, data: any): Promise<void>;
export declare function julianDate(d: Date): number;
