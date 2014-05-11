/*************************************************************************
 * Copyright(c) 2012-2014 Jim Pravetz <jpravetz@epdoc.com>
 * May be freely distributed under the MIT license.
 **************************************************************************/

var Path = require('path');

var fontPath = Path.resolve(process.env['HOME'], 'Library/Fonts');

module.exports = function (doc) {

    this.doc = doc;
    this.font = {};

    this.font = function (name) {
        if( !this.font[name] ) {
            var font = doc.font(Path.resolve(fontPath, name + '.ttf' ));
            this.font[name] = font;
        }
        return this.font[name];
    };

};