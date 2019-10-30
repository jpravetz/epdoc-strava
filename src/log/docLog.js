/*************************************************************************
 * Copyright(c) 2012-2014 Jim Pravetz <jpravetz@epdoc.com>
 * May be freely distributed under the MIT license.
 **************************************************************************/

var PdfDocument = require('pdfkit');
//var PdfResources = require('pdfResources');
var _u = require('underscore');
var PageLog = require('./pageLog')
var Path = require('path');

module.exports = function(options) {

    var self = this;


    this.doc;
    //this.cache = new PdfResources();
    this.info = {
        Title:'Cycling Log Book'
    };
    if( options && options.info ) {
        this.info = _u.extend( this.info, options.info );
    }
    this.fontPath = Path.resolve(process.env['HOME'],'Library/Fonts');

    this.create = function() {
        this.doc = new PdfDocument({info:this.info});
        this.doc.compress = false;
        var pageLog = new PageLog(this.doc);
        pageLog.drawPage();
        // Write the PDF file to disk
        this.doc.write('output.pdf');
    }

}


/*
var Path = require('path');


var doc = new PdfDocument({info:info});

var fontPath = Path.resolve(process.env['HOME'],'Library/Fonts');

// Embed a font, set the font size, and render some text
doc.font(Path.resolve(fontPath,'Lato-Regular.ttf'))
    .fontSize(25)
    .text('Some text with an embedded font!', 100, 100);

// Add another page
doc.addPage()
    .fontSize(25)
    .text('Here is some vector graphics...', 100, 100);

// Draw a triangle
doc.save()
    .moveTo(100, 150)
    .lineTo(100, 250)
    .lineTo(200, 250)
    .fill("#FF3300");

// Apply some transforms and render an SVG path with the 'even-odd' fill rule
doc.scale(0.6)
    .translate(470, -380)
    .path('M 250,75 L 323,301 131,161 369,161 177,301 z')
    .fill('red', 'even-odd')
    .restore();

// Add some text with annotations
doc.addPage()
    .fillColor("blue")
    .text('Here is a link!', 100, 100)
    .underline(100, 100, 160, 27, {color: "#0000FF"})
    .link(100, 100, 160, 27, 'http://google.com/');

// Write the PDF file to disk
doc.write('output.pdf');
    */