'use strict';

function path (spaceId, id) {
  // @todo maybe in the future we should rename this endpoint
  let base = `/spaces/${spaceId}/extensions`;

  if (id) {
    return `${base}/${id}`;
  } else {
    return base;
  }
}

function request (method) {
  return function (options, context) {
    let requestOpts = {
      method: method
    };
    let resourcePath = path(options.spaceId, options.id);

    if (options.payload) {
      requestOpts.data = JSON.stringify(options.payload);
    }

    if (options.version) {
      requestOpts.headers = {};
      requestOpts.headers['X-Contentful-Version'] = options.version;
    }

    return context.client.request(resourcePath, requestOpts);
  };
}


['post', 'put', 'get', 'delete'].forEach(function (method) {
  exports[method] = request(method);
});
