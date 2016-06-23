'use strict';

var Bluebird = require('bluebird');
var fs = require('fs');

var readFile = Bluebird.promisify(fs.readFile);

module.exports = function (options) {
  if (!options.srcdoc) {
    return Bluebird.resolve(options);
  }

  return readFile(options.srcdoc)
    .then(function (contents) {
      options.srcdoc = contents.toString();
      return options;
    }, function (err) {
      throw new Error(
        `Cannot read the file defined as the "srcdoc" property (${err.path}).`
      );
    });
};
