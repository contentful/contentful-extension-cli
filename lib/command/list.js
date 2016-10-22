'use strict';

var Extension = require('../extension');
var Table = require('cli-table');
var error = require('./utils/error');
var formatError = error.format('create');

module.exports = function (options, context) {
  return Extension.all(options, context)
    .then(function (extensions) {
      var table = extensions.items.reduce(function (table, extension) {
        table.push(
          [
            extension.extension.name,
            extension.sys.id,
            extension.sys.createdAt,
            extension.sys.updatedAt
          ]
        );

        return table;
      }, new Table({ head: ['Name', 'Id', 'createdAt', 'updatedAt'] }));

      console.log(table.toString());
    })
    .catch(function (err) {
      console.error(formatError(err.message));
      process.exit(1);
    });
};
