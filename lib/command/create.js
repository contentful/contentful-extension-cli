'use strict';

var Widget = require('../widget');
var error = require('./utils/error');
var maybeReadDescriptor = require('./utils/maybe-read-descriptor-file');
var maybeExtendOptions = require('./utils/maybe-extend-options');
var maybeReadSrcdocFile = require('./utils/maybe-read-srcdoc-file');

var formatError = error.format('create');

module.exports = function (options, context) {
  return maybeReadDescriptor(options)
    .then(function (descriptor) {
      let required = ['name', 'fieldTypes', {or: ['src', 'srcdoc']}];

      return maybeExtendOptions(options, descriptor, required);
    })
    .then(function () {
      return maybeReadSrcdocFile(options);
    })
    .then(function () {
      return new Widget(options, context).save()
      .catch(function (e) {
        console.error(formatError(e));
        process.exit(1);
      });
    })
    .then(function (widget) {
      console.log(`Successfully created widget, id: ${widget.sys.id} name: ${widget.widget.name}`);
    })
    .catch(function (err) {
      console.error(formatError(err.message));
      process.exit(1);
    });
};
