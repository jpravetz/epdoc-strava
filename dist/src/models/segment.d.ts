import { StravaCoord, StravaObjId } from './../strava-api';
import { SegmentBase } from './segment-base';
export type SegmentId = StravaObjId;
export declare class Segment extends SegmentBase {
    klass: string;
    elevation_high: number;
    elevation_low: number;
    average_grade: number;
    country: string;
    state: string;
    _coordinates: StravaCoord[];
    constructor(data: any);
    static newFromResponseData(data: any): Segment;
    static isInstance(val: any): val is Segment;
}
