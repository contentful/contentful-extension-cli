'use strict';

var Extension = require('../extension');
var error = require('./utils/error');
var maybeReadDescriptor = require('./utils/maybe-read-descriptor-file');
var maybeExtendOptions = require('./utils/maybe-extend-options');
var maybeReadSrcdocFile = require('./utils/maybe-read-srcdoc-file');

var formatError = error.format('update');

module.exports = function (options, context) {
  return maybeReadDescriptor(options)
    .then(function (descriptor) {
      let required = ['id', 'fieldTypes', 'name', { or: ['src', 'srcdoc'] }];

      return maybeExtendOptions(options, descriptor, required);
    })
    .then(function () {
      return maybeReadSrcdocFile(options);
    })
    .then(function () {
      if (options.version) {
        return options;
      } else {
        if (!options.force) {
          throw new Error('to update without version use the --force flag');
        }

        return loadCurrentVersion(options, context)
        .catch(function (err) {
          console.error(formatError(err));
          process.exit(1);
        });
      }
    }).then(function (options) {
      return new Extension(options, context).save()
      .catch(function (err) {
        console.error(formatError(err));
        process.exit(1);
      })
      .then(function (extension) {
        console.log(
          'Successfully updated extension, ' +
          `id: ${extension.sys.id} name: ${extension.extension.name}`
        );
      });
    })
    .catch(function (err) {
      console.error(formatError(err.message));
      process.exit(1);
    });
};

/**
 * GETs the extension from the server and extends `options` with the
 * current version.
 */
function loadCurrentVersion (options, context) {
  return new Extension(options, context).read()
    .then(function (response) {
      let version = response.sys.version;

      options.version = version;
      return options;
    });
}
