'use strict';

const _ = require('lodash');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const context = {http: {}, client: {}};
const setupContextStub = sinon.stub().returns(context);
const widgetMethodSpies = {};
const widgetConstructorSpy = sinon.spy();

function WidgetStub () {
  widgetConstructorSpy.apply(null, arguments);
  _.extend(this, widgetMethodSpies);
}

WidgetStub.all = sinon.spy();

const api = proxyquire('../../..', {
  './widget': WidgetStub,
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
      widgetMethodSpies.read = sinon.spy();
      widgetMethodSpies.save = sinon.spy();
      widgetMethodSpies.delete = sinon.spy();
      this.client = api.createClient({spaceId: 'spaceid'});
    });

    it('#getAll()', function () {
      this.client.getAll();
      sinon.assert.calledOnce(WidgetStub.all.withArgs({spaceId: 'spaceid'}));
    });

    it('#get(id)', function () {
      const options = {spaceId: 'spaceid', id: 'tid'};

      this.client.get('tid');
      sinon.assert.calledOnce(widgetConstructorSpy.withArgs(options, context));
      sinon.assert.calledOnce(widgetMethodSpies.read);
    });

    it('#save(widget)', function () {
      const widget = {id: 'tid', name: 'test', version: 123};
      const options = _.extend({spaceId: 'spaceid'}, widget);

      this.client.save(widget);
      sinon.assert.calledOnce(widgetConstructorSpy.withArgs(options, context));
      sinon.assert.calledOnce(widgetMethodSpies.save);
    });

    it('#delete(id, version)', function () {
      const options = {spaceId: 'spaceid', id: 'tid', version: 123};

      this.client.delete('tid', 123);
      sinon.assert.calledOnce(widgetConstructorSpy.withArgs(options, context));
      sinon.assert.calledOnce(widgetMethodSpies.delete);
    });
  });
});
