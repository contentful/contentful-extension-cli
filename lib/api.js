'use strict';

const setupContext = require('./context');
const Extension = require('./extension');
const _ = require('lodash');

module.exports = {createClient};

function createClient (options) {
  options = options || {};
  const context = setupContext({
    token: options.accessToken,
    host: options.host
  });

  function get (id) {
    return prepareExtension({id}).read();
  }

  function getAll () {
    return Extension.all(getOptions(), context);
  }

  function save (opts) {
    return prepareExtension(opts).save();
  }

  function del (id, version) {
    return prepareExtension({id, version}).delete();
  }

  function prepareExtension (opts) {
    return new Extension(getOptions(opts), context);
  }

  function getOptions (opts) {
    return _.extend({spaceId: options.spaceId}, opts || {});
  }

  return {get: get, getAll, save, delete: del};
}
