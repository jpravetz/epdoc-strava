var Path = require('path');

var fontPath = Path.resolve(process.env['HOME'], 'Library/Fonts');

module.exports = function(doc) {
  this.doc = doc;
  this.font = {};

  this.font = function(name) {
    if (!this.font[name]) {
      var font = doc.font(Path.resolve(fontPath, name + '.ttf'));
      this.font[name] = font;
    }
    return this.font[name];
  };
};
