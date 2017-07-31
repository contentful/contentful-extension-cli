'use strict';

var _ = require('lodash');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();

var store = {};

app.use(bodyParser.json({ type: 'application/vnd.contentful.management.v1+json' }));
app.use(function (req, res, next) {
  let accessToken = req.query.access_token;

  if (accessToken !== 'lol-token') {
    res.status(404);
    res.end();
  } else {
    next();
  }
});

app.all('/spaces/:space/extensions/:id', function (req, res, next) {
  if (req.params.id === 'not-found') {
    let error = buildError('NotFound', 'The resource can\'t be found.');

    res.status(404);
    res.send(error);
    res.end();
    return;
  }

  if (req.params.id === 'fail') {
    let error = buildError();

    res.status(500);
    res.send(error);
    res.end();
    return;
  }

  next();
});

app.post('/spaces/:space/extensions', function (req, res) {
  if (_.get(req, 'body.extension.fieldTypes[0].type') === 'Lol') {
    return respondWithValidationError(res, {
      path: ['extension', 'fieldTypes'],
      expected: ['Symbol', 'Yolo']
    });
  }

  let extension = createExtension(req.params.space, req.params.id, req.body);

  res.status(201);
  res.json(extension);
  res.end();
});

app.put('/spaces/:space/extensions/:id', function (req, res) {
  let extension = store[req.params.id];
  let versionInHeader = req.headers['x-contentful-version'];
  let xVersion = versionInHeader ? parseInt(versionInHeader, 10) : undefined;

  if (!extension) {
    if (req.params.id === 'too-long-name') {
      return respondWithValidationError(res, {path: ['extension', 'name']});
    } else if (req.params.id === 'so-invalid') {
      return respondWithValidationError(res);
    } else if (req.params.id === 'too-big') {
      return respondWithValidationError(res, {
        path: ['extension', 'srcdoc'],
        max: 7777
      });
    }

    let extension = createExtension(req.params.space, req.params.id, req.body);

    store[req.params.id] = extension;
    res.status(201);
    res.json(extension);
    res.end();
  } else {
    if (req.params.id === 'fail-update') {
      let error = buildError();

      res.status(500);
      res.send(error);
      res.end();
      return;
    }

    if (xVersion !== extension.sys.version) {
      res.status(409);
      res.end();
    } else {
      let sys = extension.sys;

      extension = req.body;
      extension.sys = sys;
      extension.sys.version = extension.sys.version + 1;
      store[req.params.id] = extension; // Update the store

      res.json(extension);
      res.status(200);
      res.end();
    }
  }
});

app.get('/spaces/:space/extensions', function (req, res) {
  let extensions = _.filter(store, {sys: {space: {sys: {id: req.params.space}}}});
  let response = { sys: {type: 'Array'}, total: extensions.length, items: extensions };

  if (req.params.space === 'fail') {
    let error = buildError();

    res.status(500);
    res.send(error);
    res.end();
    return;
  }

  res.status(200);
  res.json(response);
  res.end();
});

app.get('/spaces/:space/extensions/:id', function (req, res) {
  let extension = store[req.params.id];

  res.status(200);
  res.json(extension);
  res.end();
});

app.delete('/spaces/:space/extensions/:id', function (req, res) {
  let extension = store[req.params.id];
  let xVersion = parseInt(req.headers['x-contentful-version'], 10);

  if (req.params.id === 'fail-delete') {
    let error = buildError();

    res.status(500);
    res.send(error);
    res.end();
    return;
  }

  if (xVersion !== extension.sys.version) {
    res.status(409);
    res.end();
  } else {
    delete store[req.params.id];
    res.status(204);
    res.end();
  }
});

function createExtension (spaceId, id, payload) {
  return _.extend(payload, {
    sys: {
      version: 1,
      id: id || _.random(1000),
      space: {
        sys: {
          id: spaceId
        }
      },
      createdAt: (new Date()).toString(),
      updatedAt: (new Date()).toString()
    }
  });
}

function buildError (id, message, error) {
  return _.extend({
    sys: {
      id: id || 'ServerError'
    },
    message: message || 'Server failed to fulfill the request.',
    details: {errors: [error || {}]}
  });
}

function respondWithValidationError (res, err) {
  res.status(422);
  res.send(buildError('ValidationFailed', null, err));
  res.end();
}

var server;

exports.start = function start () {
  server = app.listen(3000);
};

exports.stop = function stop () {
  store = {};
  server.close();
};
