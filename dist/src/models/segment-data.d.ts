import { StravaCoord } from './../strava-api';
import { Metres, Seconds } from './../util';
import { SegmentId } from './segment';
import { SegmentName } from './segment-base';
export declare class SegmentData {
    private _isSegmentData;
    id: SegmentId;
    name: SegmentName;
    elapsedTime: Seconds;
    movingTime: Seconds;
    distance: Metres;
    coordinates: StravaCoord[];
    country: string;
    state: string;
    constructor(data: any);
    get isSegmentData(): boolean;
    static isInstance(val: any): val is SegmentData;
}
