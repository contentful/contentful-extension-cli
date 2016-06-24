'use strict';

var Extension = require('../extension');
var error = require('./utils/error');

var formatError = error.format('read');

module.exports = function (options, context) {
  if (options.id) {
    return new Extension(options, context).read()
    .then(function (extension) {
      console.log(JSON.stringify(extension));
    })
    .catch(function (err) {
      console.error(formatError(err));
      process.exit(1);
    });
  } else if (options.all) {
    return Extension.all(options, context)
      .then(function (extension) {
        console.log(JSON.stringify(extension));
      })
      .catch(function (err) {
        console.error(formatError(err));
        process.exit(1);
      });
  } else {
    console.error(formatError('missing one of --id or --all options'));
    process.exit(1);
  }
};
