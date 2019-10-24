import { Dict } from '../util';
export declare class DetailedActivity {
    description?: string;
    segment_efforts?: Dict[];
    constructor(data: any);
    static newFromResponseData(data: any): DetailedActivity;
    static isInstance(val: any): val is DetailedActivity;
}
