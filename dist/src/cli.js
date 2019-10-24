"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const env = process.env['NODE_ENV'] || 'development';
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const commander_1 = require("commander");
const package_json_1 = __importDefault(require("../package.json"));
const settings_json_1 = __importDefault(require("./config/settings.json"));
const main_1 = require("./main");
const file_1 = require("./util/file");
let dateutil = require('dateutil');
const DAY = 24 * 3600 * 1000;
// let root = Path.resolve(__dirname, '..');
const home = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
//let Config = require('a5config').init(env, [__dirname + '/../config/project.settings.json'], {excludeGlobals: true});
//let config = Config.get();
function run() {
    const segmentsFile = path_1.default.resolve(home, '.strava', 'segments.json');
    const credentialsFile = path_1.default.resolve(home, '.strava', 'credentials.json');
    // if (!fs.existsSync(configFile)) {
    //   console.log('Error: config file does not exist: %s', configFile);
    //   process.exit(1);
    // }
    let segments;
    return Promise.resolve()
        .then(resp => {
        if (fs_1.default.existsSync(segmentsFile)) {
            return file_1.readJson(segmentsFile);
        }
        return Promise.resolve({});
    })
        .then(resp => {
        segments = resp;
        let program = new commander_1.Command('strava');
        program
            .version(package_json_1.default.version)
            .option('-d, --dates <dates>', "Comma separated list of activity date or date ranges in format '20141231-20150105,20150107'. " +
            'If the last entry in the list is a single date then everything from that date until today will be included.', dateList)
            .option('-i, --id <athleteId>', 'Athlete ID. Defaults to your login')
            .option('-u, --athlete', 'Show athlete details including list of bikes')
            .option('-g, --friends [opt]', 'Show athlete friends list (Use --more a complete summary, otherwise id and name are displayed)')
            .option('-k, --kml <file>', 'Create KML file for specified date range')
            .option('-x, --xml <file>', 'Create Acroforms XML file for specified date range, this is specific to a particular unpublished PDF form document')
            .option('-a, --activities [filter]', "Output activities to kml file, optionally filtering by activity type (as defined by Strava, 'Ride', 'Hike', 'Walk', etc), plus 'commute' and 'nocommute')", commaList)
            //.option('-f, --filter <types>', "Filter based on comma-separated list of activity types (as defined by Strava, 'Ride', 'Hike', 'Walk', etc), plus 'commute' and 'nocommute'", commaList)
            //.option('-p, --prompt', "With --show, when adding segments, prompt user whether to include or exclude a segment.")
            .option('-s, --segments [opts]', "Output starred segments to KML, adding efforts within date range to description if --more. Segments are grouped into folders by location unless opts is set to 'flat'.")
            .option('-m, --more', 'When generating KML file, include additional detail info in KML description field')
            .option('-y, --imperial', 'Use imperial units')
            .option('-p, --path <cwd>', 'Current folder')
            .option('--auth', 'Return authorization URL that can be used in a browser to authorize this application')
            .option('-v, --verbose', 'Verbose messages')
            .parse(process.argv);
        let opts = {
            home: home,
            cwd: program.cwd,
            config: settings_json_1.default,
            auth: program.auth,
            segmentsFile: segmentsFile,
            credentialsFile: credentialsFile,
            athleteId: parseInt(program.id, 10) || settings_json_1.default.athleteId,
            athlete: program.athlete,
            bikes: program.bikes,
            friends: program.friends,
            dates: program.dates || [],
            more: program.more,
            kml: program.kml,
            xml: program.xxml,
            activities: program.activities,
            // activityFilter: _.without(program.filter || [], 'commute', 'nocommute'),
            commuteOnly: (program.filter || []).indexOf('commute') >= 0 ? true : false,
            nonCommuteOnly: (program.filter || []).indexOf('nocommute') >= 0 ? true : false,
            imperial: program.imperial,
            segments: program.segments,
            verbose: program.verbose || 9
        };
        opts.dateRanges = []; // used for kml file
        if (opts.dates && opts.dates.length) {
            console.log('Date ranges: ');
            opts.dates.forEach(range => {
                let tAfter = dateutil.toSortableString(1000 * range.after).replace(/\//g, '-');
                let tBefore = dateutil.toSortableString(1000 * range.before).replace(/\//g, '-');
                console.log('  From ' + tAfter + ' to ' + tBefore);
                opts.dateRanges.push({ after: tAfter.slice(0, 10), before: tBefore.slice(0, 10) });
            });
        }
        let main = new main_1.Main(opts);
        return main.run();
    })
        .then(resp => {
        console.log('done');
        // process.exit(0);     // don't do this else files will not be saved
    })
        .catch(err => {
        console.log('Error: ' + err.message);
    });
}
function commaList(val) {
    return val.split(',');
}
function dateList(val) {
    let result = [];
    let ranges = val.split(',');
    for (let idx = 0; idx < ranges.length; ++idx) {
        let range = ranges[idx];
        let p = range.split('-');
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
    let p = s.match(/^(\d{4})(\d\d)(\d\d)$/);
    if (p) {
        return new Date(parseInt(p[1], 10), parseInt(p[2], 10) - 1, parseInt(p[3], 10)).getTime();
    }
    else {
        throw new Error('Invalid date');
    }
}
run();
//function promptSingleLine(str, fn) {
//    process.stdout.write(str);
//    process.stdin.setEncoding('utf8');
//    process.stdin.once('data', function (val) {
//        fn(val);
//    }).resume();
//}
[];
//# sourceMappingURL=cli.js.map