export declare type Dict = Record<string, any>;
export declare type EpochMilliseconds = number;
export declare type EpochSeconds = number;
export declare type Seconds = number;
export declare function sortBy(): void;
export declare function readJson(path: string): Promise<any>;
export declare function writeJson(path: string, data: any): Promise<void>;
