/*************************************************************************
 * Copyright(c) 2012-2014 Jim Pravetz <jpravetz@epdoc.com>
 * May be freely distributed under the MIT license.
 **************************************************************************/

"use strict";

var assert = require("assert");
var util = require("util");
var request = require("crequest");

var STRAVA_URL_PREFIX = process.env.STRAVA_URL_PREFIX || "https://www.strava.com/";

/**
 * Swap the order of callback args to increase the data's prominence.
 */
var swapArgs = function (callback) {
    return function (err, res, body) {
        return callback(err, body, res);
    };
};

var Strava = function (options) {
    this.id = options.id || process.env.STRAVA_CLIENT_ID;
    this.secret = options.secret || process.env.STRAVA_CLIENT_SECRET;
    this.token = options.token || process.env.STRAVA_ACCESS_TOKEN;
};

Strava.prototype.toString = function () {
    return "[Strava]";
};

Strava.prototype.getAuthorizationUrl = function (options) {
    assert.ok(this.id, "A client ID is required.");

    return util.format("%s?client_id=%s&redirect_uri=%s&scope=%s&state=%s&approval_prompt=%s" +
        "&response_type=%s",
        STRAVA_URL_PREFIX + "oauth/authorize",
        this.id,
        encodeURIComponent(options.redirectUri),
        options.scope || "",
        options.state || "",
        options.approvalPrompt || "force",
        "code");
};

Strava.prototype.acquireToken = function (code, callback) {
    assert.ok(this.id, "A client ID is required.");
    assert.ok(this.secret, "A client secret is required.");

    return request.post({
        url: STRAVA_URL_PREFIX + "oauth/token",
        qs: {
            client_id: this.id,
            client_secret: this.secret,
            code: code
        }
    }, function (err, rsp, body) {
        if (err) {
            return callback(err);
        }

        return callback(null, body.access_token);
    });
};

/**
 * OAuth 2 support.
 */
Strava.prototype.authHeaders = function () {
    assert.ok(this.secret, "An access token is required.");

    return {
        "Authorization": "access_token " + this.token
    };
};

//
// Athletes
//

Strava.prototype.getAthlete = function (athleteId, callback) {
    var url = STRAVA_URL_PREFIX + "api/v3/athlete";

    switch (arguments.length) {
        case 1:
            callback = arguments[0];
            athleteId = null;
            break;
    }

    if (athleteId) {
        url = util.format("%sapi/v3/athletes/%s",
            STRAVA_URL_PREFIX, athleteId);
    }

    return request.get({
        url: url,
        headers: this.authHeaders()
    }, swapArgs(callback));
};

Strava.prototype.updateAthlete = function (options, callback) {
    return request.put({
        url: STRAVA_URL_PREFIX + "api/v3/athlete",
        headers: this.authHeaders(),
        form: options
    }, swapArgs(callback));
};

Strava.prototype.deleteProfilePicture = function (callback) {
    // TODO crequest needs to support delete for this to work
    return request.del({
        url: STRAVA_URL_PREFIX + "api/v3/athlete/picture",
        headers: this.authHeaders()
    }, swapArgs(callback));
};

Strava.prototype.getBikes = function (athleteId, callback) {
    // TODO extract this as just get() w/ boolean for including headers
    return request.get({
        url: util.format("%sathletes/%d/gear", STRAVA_URL_PREFIX, athleteId),
        headers: this.authHeaders()
    }, swapArgs(callback));
};

//
// Activities
//

Strava.prototype.getActivities = function (options, callback) {
    callback = Array.prototype.slice.call(arguments).pop();

    var url = STRAVA_URL_PREFIX + "api/v3/activities";

    if (options.athleteId) {
        url = util.format("%sapi/v3/athletes/%s/activities",
            STRAVA_URL_PREFIX,
            options.athleteId);

        delete options.athleteId;
    }

    return request.get({
        url: url,
        qs: options,
        headers: this.authHeaders()
    }, swapArgs(callback));
};

Strava.prototype.getActivity = function (activityId, callback) {
    return request.get({
        url: STRAVA_URL_PREFIX + "api/v3/activities/" + activityId,
        headers: this.authHeaders()
    }, swapArgs(callback));
};

/**
 * Retrieve data for the designated type of stream
 * @param type Must be one of 'activities' or 'segments'
 * @param objId The activity or segement ID
 * @param types An array, usually [ 'latlng' ]
 * @param options Additional query string parameters, if any
 * @param callback
 * @returns {*}
 */
Strava.prototype.getStream = function ( type, objId, types, options, callback) {
    var url = util.format("%sapi/v3/%s/%s/streams/%s",
        STRAVA_URL_PREFIX, type, objId, types);

    return request.get({
        url: url,
        qs: options,
        headers: this.authHeaders()
    }, swapArgs(callback));
};

Strava.prototype.getSegment = function (segmentId, callback) {
    return request.get({
        url: STRAVA_URL_PREFIX + "api/v3/segments/" + segmentId,
        headers: this.authHeaders()
    }, swapArgs(callback));
};

Strava.prototype.getSegmentEfforts = function (segmentId, params, callback) {
    return request.get({
        url: STRAVA_URL_PREFIX + "api/v3/segments/" + segmentId + "/all_efforts",
        qs: params,
        headers: this.authHeaders()
    }, swapArgs(callback));
};

Strava.prototype.getStarredSegments = function (callback) {
    return request.get({
        url: STRAVA_URL_PREFIX + "api/v3/segments/starred" + "?per_page=200",
        headers: this.authHeaders()
    }, swapArgs(callback));
};

/**
 * Get a customized leaderboard for the specified segment. This means top 10
 * plus you ± 2 (if you're not in the top 10).
 */
Strava.prototype.getSegmentLeaderboard = function (segmentId, callback) {
    return request.get({
        url: STRAVA_URL_PREFIX + "api/v3/segments/" + segmentId + "/leaderboard",
        headers: this.authHeaders()
    }, swapArgs(callback));
};

Strava.prototype.getFriends = function (options, callback) {
    callback = Array.prototype.slice.call(arguments).pop();

    var url = STRAVA_URL_PREFIX + "api/v3/athlete/friends";

    if (options.athleteId) {
        url = util.format("%sapi/v3/athletes/%s/friends",
            STRAVA_URL_PREFIX,
            options.athleteId);

        delete options.athleteId;
    }

    return request.get({
        url: url,
        qs: options,
        headers: this.authHeaders()
    }, swapArgs(function(err, data){
        if( err ) {
            callback(err);
        } else if( options.more === true ) {
            callback(err, data);
        } else {
            var summary = [];
            for( var idx=0; idx<data.length; ++idx ) {
                summary.push( "" + data[idx].id + ": " + data[idx].firstname + " " + data[idx].lastname );
            }
            callback( err, summary );
        }
    }));
};



module.exports = Strava;

/*
Strava.prototype.getActivityStream = function (activityId, types, options, callback) {
    var url = util.format("%sapi/v3/activities/%s/streams/%s",
        STRAVA_URL_PREFIX, activityId, types);

    return request.get({
        url: url,
        qs: options,
        headers: this.authHeaders()
    }, swapArgs(callback));
};
*/
