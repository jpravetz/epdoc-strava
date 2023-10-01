import { Dict } from 'epdoc-util';
import { Activity } from './models/activity';
import { SegmentFile } from './segment-file';
import { StravaConfig } from './strava-config';
import { EpochSeconds, LogFunctions } from './util';
export type SegmentConfig = {
    description: string;
    alias: Dict;
    data: Dict;
};
export type DateRange = {
    before: EpochSeconds;
    after: EpochSeconds;
};
export type MainOpts = {
    home: string;
    cwd: string;
    config?: StravaConfig;
    auth?: boolean;
    segmentsFile?: string;
    refreshStarredSegments?: boolean;
    credentialsFile?: string;
    athlete?: string;
    athleteId?: number;
    selectedBikes?: string[];
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
    log?: LogFunctions;
};
export declare class Main {
    private options;
    private _config;
    private strava;
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
    bikes: Dict;
    private _log;
    constructor(options: MainOpts);
    init(): Promise<void>;
    get config(): StravaConfig;
    get log(): LogFunctions;
    auth(): Promise<void>;
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
    private registerBikes;
    private saveXml;
    private saveKml;
}
