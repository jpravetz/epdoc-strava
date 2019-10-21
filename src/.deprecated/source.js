// source is an object with readStop() and readStart() methods,
// and an `ondata` member that gets called when it has data, and
// an `onend` member that gets called when the data is over.

var Readable = require('stream').Readable;
var util = require('util');
util.inherits(SourceWrapper, Readable);

function Source(options) {
  Readable.call(this, options);

  this._source = getLowlevelSourceObject();
  var self = this;

  // Every time there's data, we push it into the internal buffer.
  this._source.ondata = function(chunk) {
    // if push() returns false, then we need to stop reading from source
    if (!self.push(chunk)) self._source.readStop();
  };

  // When the source ends, we push the EOF-signalling `null` chunk
  this._source.onend = function() {
    self.push(null);
  };
}

// _read will be called when the stream wants to pull more data in
// the advisory size argument is ignored in this case.
SourceWrapper.prototype._read = function(size) {
  this._source.readStart();
};

Source.prototype.write = function(indent, s) {
  var indent = new Array(indent + 1).join('  ');
  this.push(indent);
  this.push(s);
};

Source.prototype.writeln = function(indent, s) {
  var indent = new Array(indent + 1).join('  ');
  this.push(indent);
  this.push(s);
  this.push('\n');
};

Source.prototype.end = function() {
  // When the source ends, we push the EOF-signalling `null` chunk
  this.push(null);
};
