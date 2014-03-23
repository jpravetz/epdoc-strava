var Path = require('path');
var DailyLog = require('./dailyLog');

module.exports = function(doc,options) {

    this.doc = doc;
    this.page;
    this.options = options;
    this.fontPath = Path.resolve(process.env['HOME'],'Library/Fonts');

    this.margins = {
        top: 50,
        bottom: 50,
        left: 20,
        right: 20
    };
    this.spacing = {
        horizontal: 7,
        vertical: 7
    };


    this.drawPage = function() {
        var dailyLog = new DailyLog(doc);
        var yoffset = this.margins.top;
        var width = (this.doc.page.width - this.margins.left - this.margins.right - 3*this.spacing.horizontal)/4;
        var height = (this.doc.page.height - this.margins.top - this.margins.bottom - 3*this.spacing.vertical)/4;
        for( var ydx=0; ydx<4; ++ydx ) {
            var xoffset = this.margins.left;
            for( var xdx=0; xdx<4; ++xdx ) {
                dailyLog.add( null, xoffset, yoffset, width, height );
                xoffset += width + this.spacing.horizontal;
            }
            yoffset += height + this.spacing.vertical;
        }
    };

}
