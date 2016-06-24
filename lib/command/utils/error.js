'use strict';

const _ = require('lodash');

const DOCS_LINE =
  'See https://www.contentful.com/developers/docs/references/errors for more information.';

exports.format = function (command) {
  return function (res) {
    if (typeof res === 'object' && res.request) {
      return serverError(res);
    } else {
      return textError(res);
    }
  };

  function textError (err) {
    return `Failed to ${command} the extension: ${err.toString()}`;
  }

  function serverError (res) {
    const err = processServerError(res);

    return `${err.method} (${command}) ` +
      `request failed because of ${err.id} error.` +
      `\n${err.reasons.join('\n')}\n${DOCS_LINE}`;
  }
};

function processServerError (res) {
  const errorId = _.get(res, 'error.sys.id', 'Unknown');
  const error = _.get(res, 'error.details.errors[0]', {});
  const method = res.request.method.toUpperCase();
  let reasons = [];

  if (errorId === 'NotFound') {
    reasons.push('Check used CMA access token / space ID combination.');
    if (method !== 'POST') {
      reasons.push('Check the extension ID.');
    }
  } else if (errorId === 'ValidationFailed') {
    reasons.push(getValidationErrorReason((error)));
  } else {
    reasons.push(res.error.message || errorId);
  }

  return {id: errorId, method, reasons};
}

function getValidationErrorReason (error) {
  const property = _.get(error, 'path[1]');

  if (property === 'name') {
    return 'Provide a valid extension name (1-255 characters).';
  } else if (error.expected) {
    return `The "${property}" extension property expects: ${error.expected}`;
  } else if (error.max) {
    return `The "${property}" extension property must have at most ${error.max} characters.`;
  } else {
    return 'An unknown validation error occurred.';
  }
}
