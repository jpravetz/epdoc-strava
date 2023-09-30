import { Dict } from 'epdoc-util';
import { StravaCoord, StravaObjId } from './../strava-api';
import { SegmentBase } from './segment-base';
export type SegmentId = StravaObjId;
export declare class Segment extends SegmentBase {
    private _isSegment;
    elevation_high: number;
    elevation_low: number;
    average_grade: number;
    country: string;
    state: string;
    _coordinates: StravaCoord[];
    constructor(data: Dict);
    static newFromResponseData(data: Dict): Segment;
    get isSegment(): boolean;
    static isInstance(val: any): val is Segment;
}
