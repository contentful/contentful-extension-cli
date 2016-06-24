'use strict';

const _ = require('lodash');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const context = {http: {}, client: {}};
const setupContextStub = sinon.stub().returns(context);
const extensionMethodSpies = {};
const extensionConstructorSpy = sinon.spy();

function ExtensionStub () {
  extensionConstructorSpy.apply(null, arguments);
  _.extend(this, extensionMethodSpies);
}

ExtensionStub.all = sinon.spy();

const api = proxyquire('../../..', {
  './extension': ExtensionStub,
  './context': setupContextStub
});

describe('API', function () {
  describe('initialization', function () {
    it('passes token and host to context creation fn', function () {
      api.createClient({
        accessToken: 'token-lol',
        host: 'http://api.test.com'
      });

      sinon.assert.calledOnce(setupContextStub.withArgs({
        token: 'token-lol',
        host: 'http://api.test.com'
      }));
    });
  });

  describe('instance methods', function () {
    beforeEach(function () {
      extensionMethodSpies.read = sinon.spy();
      extensionMethodSpies.save = sinon.spy();
      extensionMethodSpies.delete = sinon.spy();
      this.client = api.createClient({spaceId: 'spaceid'});
    });

    it('#getAll()', function () {
      this.client.getAll();
      sinon.assert.calledOnce(ExtensionStub.all.withArgs({spaceId: 'spaceid'}));
    });

    it('#get(id)', function () {
      const options = {spaceId: 'spaceid', id: 'tid'};

      this.client.get('tid');
      sinon.assert.calledOnce(extensionConstructorSpy.withArgs(options, context));
      sinon.assert.calledOnce(extensionMethodSpies.read);
    });

    it('#save(extension)', function () {
      const extension = {id: 'tid', name: 'test', version: 123};
      const options = _.extend({spaceId: 'spaceid'}, extension);

      this.client.save(extension);
      sinon.assert.calledOnce(extensionConstructorSpy.withArgs(options, context));
      sinon.assert.calledOnce(extensionMethodSpies.save);
    });

    it('#delete(id, version)', function () {
      const options = {spaceId: 'spaceid', id: 'tid', version: 123};

      this.client.delete('tid', 123);
      sinon.assert.calledOnce(extensionConstructorSpy.withArgs(options, context));
      sinon.assert.calledOnce(extensionMethodSpies.delete);
    });
  });
});
