'use strict';

const setupContext = require('./context');
const Widget = require('./widget');
const _ = require('lodash');

module.exports = {createClient};

function createClient (options) {
  options = options || {};
  const context = setupContext({
    token: options.accessToken,
    host: options.host
  });

  function get (id) {
    return widget({id}).read();
  }

  function getAll () {
    return Widget.all(getOpts(), context);
  }

  function save (opts) {
    return widget(opts).save();
  }

  function del (id, version) {
    return widget({id, version}).delete();
  }

  function widget (opts) {
    return new Widget(getOpts(opts), context);
  }

  function getOpts (opts) {
    return _.extend({spaceId: options.spaceId}, opts || {});
  }

  return {get: get, getAll, save, delete: del};
}
