'use strict';

var process = require('process');
var path = require('path');

var expect = require('../../helper').expect;
var maybeRead = require('../../../lib/command/utils/maybe-read-descriptor-file');

describe('Reading descriptor', function () {
  let originalWd;

  beforeEach(function () {
    originalWd = process.cwd();
    process.chdir(path.resolve(__dirname, '../../fake-working-dir'));
  });

  afterEach(function () {
    process.chdir(originalWd);
  });

  it('extends options with an absolute path of the default "extension.json" file', function () {
    let options = {};

    return maybeRead(options).then(function () {
      expect(options.descriptor).to.eq(path.resolve(process.cwd(), 'extension.json'));
    });
  });

  it('resolves an absolute path of the provided descriptor file', function () {
    let options = {descriptor: 'other-widget/my-widget.json'};

    return maybeRead(options).then(function () {
      expect(options.descriptor).to.eq(path.resolve(process.cwd(), 'other-widget/my-widget.json'));
    });
  });

  it('reads the default "extension.json" file', function () {
    return maybeRead({}).then(function (descriptor) {
      expect(descriptor.id).to.eq('lol');
      expect(descriptor.name).to.eq('lol');
      expect(descriptor.fieldTypes[0]).to.eq('Symbol');
      expect(descriptor.fieldTypes.length).to.eq(1);
    });
  });

  it('reads the provided descriptor file', function () {
    return maybeRead({descriptor: 'other-widget/my-widget.json'})
      .then(function (descriptor) {
        expect(descriptor.id).to.eq('my-widget');
        expect(descriptor.name).to.eq('My widget');
        expect(descriptor.fieldTypes[0]).to.eq('Symbol');
        expect(descriptor.fieldTypes.length).to.eq(1);
      });
  });

  it('resolves "srcdoc" property relatively to the descriptor file', function () {
    let options = {descriptor: 'other-widget/my-widget.json'};

    return maybeRead(options).then(function (descriptor) {
      let resolved = path.resolve(path.dirname(options.descriptor), 'my-widget.html');

      expect(descriptor.srcdoc).to.eq(resolved);
    });
  });

  it('fails on invalid JSON', function () {
    return maybeRead({descriptor: 'invalid.json'}).catch(function (err) {
      expect(err.message).to.have.string('In file invalid.json: Unexpected token');
    });
  });

  it('fails on lack of extension ID', function () {
    return maybeRead({descriptor: 'incomplete1.json'}).catch(function (err) {
      expect(err.message).to.have.string('Missing extension ID');
    });
  });

  it('fails when both src and srcdoc properties are not provided', function () {
    return maybeRead({descriptor: 'incomplete2.json'}).catch(function (err) {
      expect(err.message).to.have.string('Missing "src" or "srcdoc" property');
    });
  });
});
