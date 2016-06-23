'use strict';

var url = require('url');
var Contentful = require('contentful-management');
var http = require('./http');

module.exports = function setupContext (options) {
  let urlInfo = url.parse(options.host || 'https://api.contentful.com');
  let host = urlInfo.host;
  let isSecure = urlInfo.protocol === 'https:';

  let client = Contentful.createClient({
    accessToken: options.token,
    host: host,
    secure: isSecure
  });

  return {
    client: client,
    http: http
  };
};
