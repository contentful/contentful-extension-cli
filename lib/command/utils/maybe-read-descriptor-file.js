'use strict';

var Bluebird = require('bluebird');
var fs = require('fs');
var nodePath = require('path');

var readFileAsync = Bluebird.promisify(fs.readFile);
var statFileAsync = Bluebird.promisify(fs.stat);
var DEFAULT_WIDGET_FILE = 'widget.json';

module.exports = function (options) {
  if (options.descriptor) {
    return processFile(options.descriptor, options);
  }

  return processFile(DEFAULT_WIDGET_FILE, options)
    .catch(function (error) {
      if (error.code === 'ENOENT') {
        return;
      }

      throw error;
    });
};

function statFile (path) {
  return statFileAsync(path).return(path);
}

function processFile (path, options) {
  options.descriptor = nodePath.resolve(process.cwd(), path);

  return statFile(path)
    .then(function () {
      return readFileAsync(path);
    })
    .then(function (contents) {
      let descriptor;

      try {
        descriptor = JSON.parse(contents.toString());
      } catch (e) {
        throw new Error(`In file ${path}: ${e.message}`);
      }

      if (!descriptor.id) {
        throw new Error('Missing widget ID in descriptor file.');
      }

      if (!descriptor.src && !descriptor.srcdoc) {
        throw new Error('Missing "src" or "srcdoc" property in descriptor file.');
      }

      if (descriptor.srcdoc) {
        let projectRoot = nodePath.dirname(options.descriptor);

        descriptor.srcdoc = nodePath.resolve(projectRoot, descriptor.srcdoc);
      }

      return descriptor;
    });
}
