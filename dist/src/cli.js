"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const env = process.env['NODE_ENV'] || 'development';
const commander_1 = require("commander");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const package_json_1 = __importDefault(require("../package.json"));
const project_settings_json_1 = __importDefault(require("./config/project.settings.json"));
const main_1 = require("./main");
const util_1 = require("./util");
const dateutil = require('dateutil');
const DAY = 24 * 3600 * 1000;
// let root = Path.resolve(__dirname, '..');
const home = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
//let Config = require('a5config').init(env, [__dirname + '/../config/project.settings.json'], {excludeGlobals: true});
//let config = Config.get();
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        const segmentsFile = path_1.default.resolve(home, '.strava', 'segments.json');
        const credentialsFile = path_1.default.resolve(home, '.strava', 'credentials.json');
        const userSettingsFile = path_1.default.resolve(home, '.strava', 'user.settings.json');
        // if (!fs.existsSync(configFile)) {
        //   console.log('Error: config file does not exist: %s', configFile);
        //   process.exit(1);
        // }
        let segments;
        return Promise.resolve()
            .then((resp) => {
            if (fs_1.default.existsSync(segmentsFile)) {
                return (0, util_1.readJson)(segmentsFile);
            }
            return Promise.resolve({});
        })
            .then((resp) => {
            segments = resp;
            if (fs_1.default.existsSync(userSettingsFile)) {
                return (0, util_1.readJson)(userSettingsFile);
            }
            return Promise.resolve({});
        })
            .then((resp) => {
            const userConfig = resp;
            const config = Object.assign({}, project_settings_json_1.default, userConfig);
            const program = new commander_1.Command('strava');
            program
                .version(package_json_1.default.version)
                .option('-d, --dates <dates>', "Comma separated list of activity date or date ranges in format '20141231-20150105,20150107'. " +
                'If the last entry in the list is a single date then everything from that date until today will be included.', dateList)
                .option('-i, --id <athleteId>', 'Athlete ID. Defaults to your login')
                .option('-u, --athlete', 'Show athlete details including list of bikes')
                .option('-g, --friends [opt]', 'Show athlete friends list (Use --more a complete summary, otherwise id and name are displayed)')
                .option('-k, --kml <file>', 'Create KML file for specified date range')
                .option('-x, --xml <file>', 'Create Acroforms XML file for specified date range, this is specific to a particular unpublished PDF form document')
                .option('-r, --refresh', 'Refresh list of starred segments rather than using local stored copy. Will automatically refresh from server if there is no locally stored copy.')
                .option('-a, --activities [filter]', "Output activities to kml file, optionally filtering by activity type (as defined by Strava, 'Ride', 'EBikeRide', 'Hike', 'Walk', etc), plus 'commute', 'nocommute' and 'moto')", commaList)
                // .option('-f, --filter <types>', "Filter based on comma-separated list of activity types (as defined by Strava, 'Ride', 'Hike', 'Walk', etc), plus 'commute' and 'nocommute'", commaList)
                // .option('-p, --prompt', "With --show, when adding segments, prompt user whether to include or exclude a segment.")
                .option('-s, --segments [opts]', "Output starred segments to KML, adding efforts within date range to description if --more. Segments are grouped into folders by location unless opts is set to 'flat'.")
                .option('-m, --more', 'When generating KML file, include additional detail info in KML description field')
                // .option('--auth', 'Authenticate to Strava API (this is run automatically when required)')
                .option('-y, --imperial', 'Use imperial units')
                .option('-p, --path <cwd>', 'Current folder')
                .option('-v, --verbose', 'Verbose messages')
                .parse(process.argv);
            const cmdOpts = program.opts();
            const opts = {
                home: home,
                cwd: cmdOpts.cwd,
                config: config,
                refreshStarredSegments: cmdOpts.refresh,
                segmentsFile: segmentsFile,
                credentialsFile: credentialsFile,
                athleteId: parseInt(cmdOpts.id, 10) || config.athleteId,
                athlete: cmdOpts.athlete,
                selectedBikes: cmdOpts.bikes,
                friends: cmdOpts.friends,
                dates: cmdOpts.dates || [],
                more: cmdOpts.more,
                kml: cmdOpts.path && cmdOpts.kml ? path_1.default.resolve(cmdOpts.path, cmdOpts.kml) : cmdOpts.kml,
                xml: cmdOpts.path && cmdOpts.xml ? path_1.default.resolve(cmdOpts.path, cmdOpts.xml) : cmdOpts.xml,
                activities: cmdOpts.activities,
                // activityFilter: _.without(cmdOpts.filter || [], 'commute', 'nocommute'),
                commuteOnly: (cmdOpts.filter || []).indexOf('commute') >= 0 ? true : false,
                nonCommuteOnly: (cmdOpts.filter || []).indexOf('nocommute') >= 0 ? true : false,
                imperial: cmdOpts.imperial,
                auth: cmdOpts.auth,
                segments: cmdOpts.segments,
                verbose: cmdOpts.verbose || 9,
            };
            opts.dateRanges = []; // used for kml file
            if (opts.dates && opts.dates.length) {
                console.log('Date ranges: ');
                opts.dates.forEach((range) => {
                    const tAfter = dateutil.toSortableString(1000 * range.after).replace(/\//g, '-');
                    const tBefore = dateutil.toSortableString(1000 * range.before).replace(/\//g, '-');
                    console.log('  From ' + tAfter + ' to ' + tBefore);
                    opts.dateRanges.push({ after: tAfter.slice(0, 10), before: tBefore.slice(0, 10) });
                });
            }
            const main = new main_1.Main(opts);
            return main.run();
        })
            .then((resp) => {
            console.log('done');
            // process.exit(0);     // don't do this else files will not be saved
        })
            .catch((err) => {
            console.log('Error: ' + err.message);
        });
    });
}
function commaList(val) {
    return val.split(',');
}
function dateList(val) {
    const result = [];
    const ranges = val.split(',');
    for (let idx = 0; idx < ranges.length; ++idx) {
        const range = ranges[idx];
        const p = range.split('-');
        let t0;
        let t1;
        try {
            if (p && p.length > 1) {
                t0 = dateStringToDate(p[0]);
                t1 = dateStringToDate(p[1]) + DAY;
            }
            else if (idx === ranges.length - 1) {
                t0 = dateStringToDate(range);
                t1 = new Date().getTime(); // now
            }
            else {
                t0 = dateStringToDate(range);
                t1 = t0 + DAY;
            }
        }
        catch (e) {
            console.log(e.toString());
            process.exit(1);
        }
        result.push({ after: t0 / 1000, before: t1 / 1000 });
    }
    return result;
}
function dateStringToDate(s) {
    const p = s.match(/^(\d{4})(\d\d)(\d\d)$/);
    if (p) {
        return new Date(parseInt(p[1], 10), parseInt(p[2], 10) - 1, parseInt(p[3], 10)).getTime();
    }
    else {
        throw new Error('Invalid date');
    }
}
run();
// function promptSingleLine(str, fn) {
//    process.stdout.write(str);
//    process.stdin.setEncoding('utf8');
//    process.stdin.once('data', function (val) {
//        fn(val);
//    }).resume();
// }
// [];
//# sourceMappingURL=cli.js.map