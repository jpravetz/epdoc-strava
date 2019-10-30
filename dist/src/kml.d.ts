/// <reference types="node" />
import { SegmentData } from './models/segment-data';
import { DateRange, Main } from './main';
import { Activity } from './models/activity';
import * as fs from 'fs';
export declare type LineStyle = {
    color: string;
    width: number;
};
export declare type KmlOpts = {
    more?: boolean;
    dates?: DateRange[];
    imperial?: boolean;
    activities?: boolean;
    segments?: boolean;
    segmentsFlatFolder?: boolean;
    verbose?: number;
};
export declare type PlacemarkParams = {
    description?: string;
    coordinates?: any[];
    placemarkId?: string;
    name?: string;
    styleName?: string;
};
export declare class Kml {
    main: Main;
    opts: KmlOpts;
    lineStyles: Record<string, LineStyle>;
    verbose: number;
    buffer: string;
    stream: fs.WriteStream;
    trackIndex: number;
    constructor(opts?: KmlOpts);
    readonly imperial: boolean;
    readonly more: boolean;
    setLineStyles(styles: Record<string, LineStyle>): void;
    outputData(filepath: string, activities: Activity[], segments: SegmentData[]): Promise<void>;
    addActivities(activities: Activity[]): Promise<void>;
    _dateString(): string;
    addSegments(segments: SegmentData[]): Promise<void>;
    outputSegments(indent: number, segments: SegmentData[], country?: string, state?: string): void;
    getSegmentRegionList(segments: any): {};
    write(indent: string | number, s: string): void;
    writeln(indent: string | number, s: string): void;
    flush(): Promise<void>;
    _flush(): Promise<void>;
    outputActivity(indent: number, activity: Activity): void;
    _buildActivityDescription(activity: Activity): string;
    /**
     * Add one segment to the KML file.
     * @param segment
     * @returns {string}
     */
    outputSegment(indent: number, segment: SegmentData): void;
    buildSegmentDescription(segment: SegmentData): string;
    header(): Promise<void>;
    _addLineStyle(name: any, style: any): void;
    footer(): Promise<void>;
    placemark(indent: number, params: PlacemarkParams): void;
}
