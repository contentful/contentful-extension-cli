'use strict';

var sinon = require('sinon');
var Bluebird = require('bluebird');
var _ = require('lodash');

var expect = require('../../helper').expect;
var Extension = require('../../../lib/extension');

function buildExtensionPayload (options) {
  var extension = {};

  _.extend(extension, _.pick(options, ['src', 'srcdoc', 'fieldTypes']));

  if (options.fieldTypes) {
    extension.fieldTypes = [];

    options.fieldTypes.forEach(function (fieldType) {
      if (fieldType === 'Entries') {
        extension.fieldTypes.push({type: 'Array', items: {type: 'Link', linkType: 'Entry'}});
        return;
      }

      if (fieldType === 'Assets') {
        extension.fieldTypes.push({type: 'Array', items: {type: 'Link', linkType: 'Asset'}});
        return;
      }

      if (fieldType === 'Symbols') {
        extension.fieldTypes.push({type: 'Array', items: {type: 'Symbol'}});
        return;
      }

      if (fieldType === 'Entry' || fieldType === 'Asset') {
        extension.fieldTypes.push({type: 'Link', linkType: fieldType});
        return;
      }

      extension.fieldTypes.push({type: fieldType});
    });
  }

  return { extension };
}

describe('Extension', function () {
  let context, options, extension, http;

  beforeEach(function () {
    http = {
      post: sinon.stub().returns(Bluebird.resolve()),
      get: sinon.stub().returns(Bluebird.resolve()),
      delete: sinon.stub().returns(Bluebird.resolve()),
      put: sinon.stub().returns(Bluebird.resolve())
    };

    context = {http: http};
  });

  describe('#save', function () {
    describe('when an id has been provided', function () {
      beforeEach(function () {
        options = {
          spaceId: 123,
          src: 'the-src',
          id: 456
        };

        extension = new Extension(options, context);
      });

      it('it calls the http.put method with the expected arguments', function () {
        let payload = buildExtensionPayload({src: options.src});

        return extension.save().then(function () {
          expect(http.put).to.have.been.calledWith(
            {
              spaceId: options.spaceId,
              payload: payload,
              id: options.id
            },
            context
          );
        });
      });

      describe('when a version has been provided', function () {
        it('it calls the http.put method including the version', function () {
          let payload = buildExtensionPayload({src: options.src});

          options = _.extend(options, {version: 66});

          return extension.save().then(function () {
            expect(http.put).to.have.been.calledWith(
              {
                spaceId: options.spaceId,
                payload: payload,
                id: options.id,
                version: options.version
              },
              context
            );
          });
        });
      });
    });

    describe('when a srcdoc has been provided', function () {
      beforeEach(function () {
        options = {
          spaceId: 123,
          srcdoc: 'the-bundle'
        };

        extension = new Extension(options, context);
      });

      it('it saves a extension with the srcdoc property set', function () {
        let payload = buildExtensionPayload({srcdoc: options.srcdoc});

        return extension.save().then(function () {
          expect(http.post).to.have.been.calledWith(
            {
              spaceId: options.spaceId,
              payload: payload
            },
            context
          );
        });
      });
    });

    describe('when a URL has been provided', function () {
      beforeEach(function () {
        options = {
          spaceId: 123,
          src: 'the-url'
        };

        extension = new Extension(options, context);
      });

      it('it saves a extension with the src property set', function () {
        let payload = buildExtensionPayload({src: options.src});

        return extension.save().then(function () {
          expect(http.post).to.have.been.calledWith(
            {
              spaceId: options.spaceId,
              payload: payload
            },
            context
          );
        });
      });
    });

    describe('when fieldTypes have been provided', function () {
      beforeEach(function () {
        options = {
          spaceId: 123,
          src: 'the-url'
        };
      });

      [
        'Symbol', 'Text', 'Date', 'Integer', 'Number', 'Location', 'Boolean', 'Object',
        'Entry', 'Asset', 'Symbols', 'Assets', 'Entries'
      ].forEach(function (fieldType) {
        it(`saves the extension with the fieldType ${fieldType}`, function () {
          options.fieldTypes = [fieldType];
          let payload = buildExtensionPayload(options);

          extension = new Extension(options, context);

          return extension.save().then(function () {
            expect(http.post).to.have.been.calledWith(
              {
                spaceId: options.spaceId,
                payload: payload
              },
              context
            );
          });
        });
      });

      it('saves the extension with multiple fieldTypes', function () {
        options.fieldTypes = ['Symbol', 'Date', 'Symbols', 'Asset', 'Entries'];

        let payload = buildExtensionPayload(options);

        extension = new Extension(options, context);

        return extension.save().then(function () {
          expect(http.post).to.have.been.calledWith(
            {
              spaceId: options.spaceId,
              payload: payload
            },
            context
          );
        });
      });

      it('saves the extension with multiple fieldTypes (capitalizes lowercase)', function () {
        options.fieldTypes = ['symbol', 'entries'];

        extension = new Extension(options, context);

        return extension.save().then(function () {
          expect(http.post).to.have.been.calledWith(
            {
              spaceId: options.spaceId,
              payload: {
                extension: {
                  src: 'the-url',
                  fieldTypes: [
                    {type: 'Symbol'},
                    {type: 'Array', items: {type: 'Link', linkType: 'Entry'}}
                  ]
                }
              }
            },
            context
          );
        });
      });
    });
  });

  describe('#read', function () {
    beforeEach(function () {
      options = {
        spaceId: 123,
        id: 456
      };

      extension = new Extension(options, context);
    });

    it('calls the http module with the expected arguments', function () {
      return extension.read().then(function () {
        expect(http.get).to.have.been.calledWith(
          {
            spaceId: options.spaceId,
            id: options.id
          },
          context
        );
      });
    });
  });

  describe('#delete', function () {
    beforeEach(function () {
      options = {
        spaceId: 123,
        id: 456
      };

      extension = new Extension(options, context);
    });

    it('calls the http module with the expected arguments', function () {
      return extension.delete().then(function () {
        expect(http.delete).to.have.been.calledWith(
          {
            spaceId: options.spaceId,
            id: options.id
          },
          context
        );
      });
    });

    it('returns the return value from the http.delete method', function () {
      http.delete.returns(Bluebird.resolve('delete-response'));

      return extension.delete().then(function (response) {
        expect(response).to.eql('delete-response');
      });
    });
  });
});
