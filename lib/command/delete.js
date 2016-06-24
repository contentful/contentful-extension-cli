'use strict';

var Extension = require('../extension');
var error = require('./utils/error');

var formatError = error.format('delete');

module.exports = function (options, context) {
  if (!options.version) {
    if (!options.force) {
      console.error(formatError('to delete without version use the --force flag'));
      process.exit(1);
    }

    return new Extension(options, context).read()
      .catch(function (err) {
        console.error(formatError(err));
        process.exit(1);
      })
      .then(function (response) {
        let version = response.sys.version;

        options.version = version;

        return new Extension(options, context).delete()
          .then(function () {
            console.log('Successfully deleted extension');
          })
          .catch(function (err) {
            console.error(formatError(err));
            process.exit(1);
          });
      });
  } else {
    return new Extension(options, context).delete()
    .then(function () {
      console.log('Successfully deleted extension');
    })
    .catch(function (err) {
      console.error(formatError(err));
      process.exit(1);
    });
  }
};
