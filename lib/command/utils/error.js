'use strict';

exports.format = function (command) {
  return function (msg) {
    if (typeof msg === 'object' && msg.request) {
      return serverError(msg);
    } else {
      return textError(msg);
    }
  };

  function textError (msg) {
    return `Failed to ${command} the widget: ${msg.toString()}`;
  }

  function serverError (msg) {
    let seeDocs =
      'See https://www.contentful.com/developers/docs/references/errors for more information';
    let errorMessage = msg.error.message || msg.error.id;

    return (`${msg.request.method.toUpperCase()} request failed ` +
      `(${msg.error.sys.id} Error)\n${errorMessage}\n${seeDocs}`);
  }
};
