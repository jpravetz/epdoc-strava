import { SegmentBase } from './segment-base';
import { SegmentData } from './segment-data';
import { Dict } from './../util';
import { StravaObjId } from '../strava-api';
export type SegmentEffortId = StravaObjId;
export declare class SegmentEffort extends SegmentBase {
    klass: string;
    country: string;
    state: string;
    coordinates: any;
    more: boolean;
    efforts: Dict[];
    elevation_high: number;
    elevation_low: number;
    average_grade: number;
    constructor(data: any);
    static newFromResponseData(data: any): SegmentEffort;
    static isInstance(val: any): val is SegmentEffort;
    toSegmentData(): SegmentData;
    buildKmlDescription(): string;
    static kvString(k: any, v: any): string;
    static timeString(seconds: any): any;
}
