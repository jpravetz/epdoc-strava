import { Dict } from 'epdoc-util';
import { DateRange } from './main';
import { Activity } from './models/activity';
import { SegmentData } from './models/segment-data';
import { LogOpts } from './util';
import { LineStylesDict } from './settings';
export type LineStyle = {
    color: string;
    width: number;
};
export type KmlOpts = LogOpts & {
    more?: boolean;
    dates?: DateRange[];
    imperial?: boolean;
    activities?: boolean;
    segments?: boolean;
    segmentsFlatFolder?: boolean;
    bikes?: Dict;
};
export type PlacemarkParams = {
    description?: string;
    coordinates?: any[];
    placemarkId?: string;
    name?: string;
    styleName?: string;
};
export declare class Kml {
    private main;
    private opts;
    private lineStyles;
    private buffer;
    private stream;
    private trackIndex;
    private _log;
    constructor(opts: KmlOpts);
    get imperial(): boolean;
    get more(): boolean;
    setLineStyles(styles: LineStylesDict): void;
    outputData(filepath: string, activities: Activity[], segments: SegmentData[]): Promise<void>;
    private addActivities;
    private _dateString;
    addSegments(segments: SegmentData[]): Promise<void>;
    outputSegments(indent: number, segments: SegmentData[], country?: string, state?: string): void;
    private getSegmentRegionList;
    outputActivity(indent: number, activity: Activity): void;
    private _buildActivityDescription;
    /**
     * Add one segment to the KML file.
     * @param segment
     * @returns {string}
     */
    private outputSegment;
    private buildSegmentDescription;
    private _addLineStyle;
    private placemark;
    private header;
    private footer;
    private write;
    private writeln;
    flush(): Promise<void>;
    private _flush;
}
