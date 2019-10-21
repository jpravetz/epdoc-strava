export declare type LineStyle = {
    color: string;
    width: number;
};
export declare type KmlOpts = {
    verbose?: number;
};
export declare class Kml {
    lineStyles: Record<string, LineStyle>;
    verbose: number;
    constructor(opts?: KmlOpts);
    setLineStyles(styles: Record<string, LineStyle>): void;
}
