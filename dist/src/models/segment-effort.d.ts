import { Dict } from 'epdoc-util';
import { StravaObjId } from '../strava-api';
import { SegmentBase } from './segment-base';
import { SegmentData } from './segment-data';
export type SegmentEffortId = StravaObjId;
export declare class SegmentEffort extends SegmentBase {
    private _isSegmentEffort;
    country: string;
    state: string;
    coordinates: any;
    more: boolean;
    efforts: Dict[];
    elevation_high: number;
    elevation_low: number;
    average_grade: number;
    constructor(data: Dict);
    static newFromResponseData(data: Dict): SegmentEffort;
    get isSegmentEffort(): boolean;
    static isInstance(val: any): val is SegmentEffort;
    toSegmentData(): SegmentData;
    buildKmlDescription(): string;
    static kvString(k: any, v: any): string;
    static timeString(seconds: any): string;
}
