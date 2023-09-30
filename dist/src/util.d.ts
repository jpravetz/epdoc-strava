import { Dict } from 'epdoc-util';
export declare function compare(a: Dict, b: Dict, key: string): 0 | 1 | -1;
export type FilePath = string;
export type FolderPath = string;
export type FileName = string;
export type FileExt = string;
export declare function isFilePath(val: any): val is FilePath;
export declare function isFolderPath(val: any): val is FolderPath;
export declare function isFileName(val: any): val is FileName;
export type EpochMilliseconds = number;
export type EpochSeconds = number;
export type Seconds = number;
export type Metres = number;
export type Kilometres = number;
export type IsoDateString = string;
export declare function isEpochSeconds(val: any): val is EpochSeconds;
export type LogFunction = (msg: string) => void;
export declare function readJson(path: string): Promise<any>;
export declare function writeJson(path: string, data: any): Promise<void>;
export declare function precision(num: any, r: any, unit: any): string;
export declare function fieldCapitalize(name: any): any;
export declare function escapeHtml(unsafe: any): any;
export declare function getDistanceString(value: number, imperial?: boolean): string;
export declare function getElevationString(value: number, imperial?: boolean): string;
export declare function getTemperatureString(value: number, imperial?: boolean): string;
