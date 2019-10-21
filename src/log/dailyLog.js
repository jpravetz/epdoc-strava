/*************************************************************************
 * Copyright(c) 2012-2014 Jim Pravetz <jpravetz@epdoc.com>
 * May be freely distributed under the MIT license.
 **************************************************************************/

module.exports = function (doc) {

    this.doc = doc;

    this.box = {
        margin: 5,
        linespacing: 10
    };

    this.add = function ( date, x, y, width, height ) {
        var doc = this.doc;
        this.doc.font('Times-Roman').fontSize(12);
        this.doc.lineWidth(1).roundedRect(x,y,width,height,3).stroke('#000000');
//        for( var idx=0; idx<7; ++idx ) {
//            doc.lineWidth(0)
//                .moveTo( x + this.box.margin, y + this.box.linespacing * idx)
//                .lineTo( x + width-this.box.margin, y + this.box.linespacing * idx)
//                .stroke("#cccccc");
//        }
    };

};