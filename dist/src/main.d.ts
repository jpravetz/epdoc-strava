import { BikeDef } from './bikelog';
import { LineStyle } from './kml';
import { Activity } from './models/activity';
import { SegmentName } from './models/segment-base';
import { SegmentFile } from './segment-file';
import { StravaClientConfig } from './strava-api';
import { Dict, EpochSeconds } from './util';
export declare type SegmentConfig = {
    description: string;
    alias: Dict;
    data: Dict;
};
export declare type StravaConfig = {
    description: string;
    client: StravaClientConfig;
    athleteId?: number;
    cachePath?: string;
    lineStyles?: Record<string, LineStyle>;
    bikes?: BikeDef[];
    aliases?: Record<SegmentName, SegmentName>;
};
export declare type DateRange = {
    before: EpochSeconds;
    after: EpochSeconds;
};
export declare type MainOpts = {
    home: string;
    cwd: string;
    config?: StravaConfig;
    auth?: boolean;
    segmentsFile?: string;
    refreshStarredSegments?: boolean;
    credentialsFile?: string;
    athlete?: string;
    athleteId?: number;
    bikes?: string[];
    friends?: string[];
    dates?: DateRange[];
    dateRanges?: DateRange[];
    more?: boolean;
    kml?: string;
    xml?: string;
    activities?: string[];
    activityFilter?: string[];
    commuteOnly?: boolean;
    nonCommuteOnly?: boolean;
    imperial?: boolean;
    segments?: boolean | string;
    verbose?: number;
};
export declare class Main {
    private options;
    private _config;
    private strava;
    private stravaCreds;
    private kml;
    private athlete;
    private activities;
    private segments;
    private segmentsFileLastModified;
    private segmentConfig;
    private gear;
    private segmentEfforts;
    private starredSegments;
    segFile: SegmentFile;
    constructor(options: MainOpts);
    init(): Promise<void>;
    readonly config: StravaConfig;
    run(): Promise<void>;
    getAthlete(): Promise<void>;
    logAthlete(): void;
    getActivities(): Promise<Activity[]>;
    getActivitiesForDateRange(dateRange: DateRange): Promise<Activity[]>;
    filterActivities(activities: Activity[]): Activity[];
    /**
     * Read more information using the DetailedActivity object and add these
     * details to the Activity object.
     */
    addActivitiesDetails(): Promise<any>;
    addActivityDetail(activity: Activity): Promise<void>;
    /**
     * Add coordinates for the activity or segment. Limits to REQ_LIMIT parallel requests.
     */
    private addActivitiesCoordinates;
    /**
     * Call only when generating KML file with all segments
     */
    private addStarredSegmentsCoordinates;
    private saveXml;
    private saveKml;
}
