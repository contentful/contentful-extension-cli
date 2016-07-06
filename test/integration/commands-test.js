'use strict';

var temp = require('temp');
var _ = require('lodash');
var Bluebird = require('bluebird');
var fs = Bluebird.promisifyAll(require('fs'));

var commandsFlags = require('../../lib/bin-helpers/flags');
var command = require('./helpers/command');
var chai = require('../helper');
var expect = chai.expect;
var assert = chai.assert;

var server = require('./http-server');

function testHelpOutput (flags, output) {
  flags.forEach(function (flag) {
    let description = commandsFlags.options[flag].description;
    let regexp = new RegExp(`--${flag}\\s+${description}`);

    expect(output).to.match(regexp);
  });
}

describe('Commands', function () {
  this.timeout(6000);

  beforeEach(function () {
    server.start();
  });

  afterEach(function () {
    server.stop();
  });

  let execOptions;

  beforeEach(function () {
    let env = _.clone(process.env);

    env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN = 'lol-token';

    execOptions = {env: env};
  });

  ['create', 'update', 'delete', 'read'].forEach(function (subcommand) {
    describe('when the token is not defined on the environment', function () {
      it(`${subcommand} fails`, function () {
        delete execOptions.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN;
        let msg = 'CONTENTFUL_MANAGEMENT_ACCESS_TOKEN is undefined or empty';
        let command = `${subcommand} --space-id 123 --id 456`;

        return expectErrorAndMessage(command, execOptions, msg);
      });
    });
  });

  describe('Create', function () {
    var flags = [
      'space-id', 'id', 'src', 'srcdoc', 'name', 'host', 'sidebar',
      'field-types', 'descriptor'
    ];

    it('reads the host config from the environment', function () {
      execOptions.env.CONTENTFUL_MANAGEMENT_HOST = 'http://localhost:3000';

      return command('create --space-id 123 --field-types Symbol --id 456 --name foo --src foo.com', execOptions)
      .then(function () {
        return command('read --space-id 123 --id 456', execOptions);
      })
      .then(function (stdout) {
        let payload = JSON.parse(stdout);

        expect(payload.sys.id).to.eql('456');
        expect(payload.extension.name).to.eql('foo');
        expect(payload.extension.src).to.eql('foo.com');
      });
    });

    it('--host option has precedence over the CONTENTFUL_MANAGEMENT_HOST option', function () {
      // no API listening on localhost:9999
      execOptions.env.CONTENTFUL_MANAGEMENT_HOST = 'http://localhost:9999';

      return command('create --space-id 123 --id 456 --name foo --field-types Symbol --src foo.com --host http://localhost:3000', execOptions)
      .then(function () {
        return command('read --space-id 123 --id 456 --host http://localhost:3000', execOptions);
      })
      .then(function (stdout) {
        let payload = JSON.parse(stdout);

        expect(payload.sys.id).to.eql('456');
        expect(payload.extension.name).to.eql('foo');
        expect(payload.extension.src).to.eql('foo.com');
      });
    });

    it('shows the help when the --help flag is present', function () {
      // Use the --space-id flag because otherwise the help would be
      // shown because it's a required flag

      return command('create --space-id 123 --help', execOptions)
        .then(function (stdout) {
          testHelpOutput(flags, stdout);
        });
    });

    it('shows all the available options when no one is provided', function () {
      return command('create', execOptions)
        .then(assert.fail)
        .catch(function (error) {
          expect(error.error.code).to.eql(1);
          testHelpOutput(flags, error.stderr);
        });
    });

    it('fails if the --space-id option is not provided', function () {
      return command('create --src foo.com --host http://localhost:3000', execOptions)
        .then(assert.fail)
        .catch(function (error) {
          expect(error.error.code).to.eq(1);
          expect(error.stderr).to.match(/Missing required argument: space-id/);
        });
    });

    it('fails if no --src or --srcdoc options are provided', function () {
      return command('create --space-id 123 --host http://localhost:3000', execOptions)
        .then(assert.fail)
        .catch(function (error) {
          expect(error.error.code).to.eq(1);
          expect(error.stderr).to.match(/you're missing the following parameters: name, fieldTypes, src or srcdoc/);
        });
    });

    it('creates an extension', function () {
      // TODO add test that works with host without protocol
      return command('create --space-id 123 --field-types Symbol --src lol.com --name lol --host http://localhost:3000 --id 456', execOptions)
        .then(function () {
          let readCmd = 'read --space-id 123 --host http://localhost:3000 --id 456';

          return command(readCmd, execOptions);
        })
        .then(function (stdout) {
          let payload = JSON.parse(stdout);

          expect(payload.extension.src).to.eql('lol.com');
          expect(payload.extension.name).to.eql('lol');
        });
    });

    it('creates an extension with fieldTypes', function () {
      let cmd = 'create --space-id 123 --name lol --src lol.com --field-types Symbol Text --host http://localhost:3000 --id 456';
      let readCmd = 'read --space-id 123 --host http://localhost:3000 --id 456';

      return command(cmd, execOptions)
        .then(function () {
          return command(readCmd, execOptions);
        })
        .then(function (stdout) {
          let payload = JSON.parse(stdout);

          expect(payload.extension.fieldTypes).to.eql([
            {type: 'Symbol'},
            {type: 'Text'}
          ]);
        });
    });

    it('creates an extension with the sidebar property set to true', function () {
      let cmd = 'create --space-id 123 --name lol --src lol.com --field-types Symbol --sidebar --host http://localhost:3000 --id 456';
      let readCmd = 'read --space-id 123 --host http://localhost:3000 --id 456';

      return command(cmd, execOptions)
      .then(function () {
        return command(readCmd, execOptions);
      })
      .then(function (stdout) {
        let payload = JSON.parse(stdout);

        expect(payload.extension.sidebar).to.be.true();
      });
    });

    it('creates an extension with the sidebar property set to false', function () {
      let cmd = 'create --space-id 123 --name lol --src lol.com --field-types Symbol --no-sidebar --host http://localhost:3000 --id 456';
      let readCmd = 'read --space-id 123 --id 456 --host http://localhost:3000';

      return command(cmd, execOptions)
      .then(function () {
        return command(readCmd, execOptions);
      })
      .then(function (stdout) {
        let payload = JSON.parse(stdout);

        expect(payload.extension.sidebar).to.be.false();
      });
    });

    it('creates an extension with the sidebar property set to undefined if no sidebar option', function () {
      let cmd = 'create --space-id 123 --name lol --src lol.com --field-types Symbol --host http://localhost:3000 --id 456';
      let readCmd = 'read --space-id 123 --id 456 --host http://localhost:3000';

      return command(cmd, execOptions)
      .then(function () {
        return command(readCmd, execOptions);
      })
      .then(function (stdout) {
        let payload = JSON.parse(stdout);

        expect(payload.extension.sidebar).to.be.undefined();
      });
    });

    it('creates an extension with a custom id', function () {
      let cmd = 'create --space-id 123 --name lol --src lol.com --field-types Symbol --id 456 --host http://localhost:3000';
      let readCmd = 'read --space-id 123 --id 456 --host http://localhost:3000';

      return command(cmd, execOptions)
      .then(function () {
        return command(readCmd, execOptions);
      })
      .then(function (stdout) {
        let payload = JSON.parse(stdout);

        expect(payload.extension.src).to.eql('lol.com');
        expect(payload.sys.id).to.eql('456');
      });
    });

    it('reports the error when the API request fails', function () {
      let cmd = 'create --space-id 123 --name lol --src lol.com --field-types Symbol --id fail --host http://localhost:3000';
      let msg = serverErrorMsg('put', 'create', 'ServerError');

      return expectErrorAndMessage(cmd, execOptions, msg);
    });

    it('reports the error when supplied name is too long', function () {
      let cmd = 'create --space-id 123 --name imagine-there-is-300-chars --src lol.com --field-types Symbol --id too-long-name --host http://localhost:3000';
      let msg = httpError('put', 'create', 'ValidationFailed', 'Provide a valid extension name (1-255 characters).');

      return expectErrorAndMessage(cmd, execOptions, msg);
    });

    it('reports the error when invalid field type is provided', function () {
      let cmd = 'create --space-id 123 --name lol --src lol.com --field-types Lol --host http://localhost:3000';
      let msg = httpError('post', 'create', 'ValidationFailed', 'The "fieldTypes" extension property expects: Symbol,Yolo');

      return expectErrorAndMessage(cmd, execOptions, msg);
    });

    it('reports an unknown validation error', function () {
      let cmd = 'create --space-id 123 --name lol --src lol.com --field-types Symbol --id so-invalid --host http://localhost:3000';
      let msg = httpError('put', 'create', 'ValidationFailed', 'An unknown validation error occurred.');

      return expectErrorAndMessage(cmd, execOptions, msg);
    });

    describe('when the --srcdoc option is used', function () {
      let file;

      beforeEach(function () {
        file = temp.path();
        return fs.writeFileAsync(file, 'the-bundle-contents');
      });

      afterEach(function () {
        return fs.unlinkAsync(file);
      });

      it('reports the error when the API request fails', function () {
        let cmd = `create --space-id 123 --name lol --srcdoc ${file} --field-types Symbol --id fail --host http://localhost:3000`;
        let msg = serverErrorMsg('put', 'create', 'ServerError');

        return expectErrorAndMessage(cmd, execOptions, msg);
      });

      it('reports the error when the file does not exist', function () {
        let cmd = 'create --space-id 123 --name lol --field-types Symbol --srcdoc some-unexisting-file --host http://localhost:3000';
        let msg = 'Cannot read the file defined as the "srcdoc" property (some-unexisting-file)';

        return expectErrorAndMessage(cmd, execOptions, msg);
      });

      it('reports the error when the file is too big', function () {
        let cmd = `create --space-id 123 --name lol --field-types Symbol --srcdoc ${file} --host http://localhost:3000 --id too-big`;
        let msg = 'The "srcdoc" extension property must have at most 7777 characters.';

        return expectErrorAndMessage(cmd, execOptions, msg);
      });

      it('creates an extension from a file', function () {
        let cmd = `create --space-id 123 --name lol --srcdoc ${file} --field-types Symbol --host http://localhost:3000 --id 456`;
        let readCmd = 'read --space-id 123 --host http://localhost:3000 --id 456';

        return command(cmd, execOptions)
        .then(function () {
          return command(readCmd, execOptions);
        })
        .then(function (stdout) {
          let payload = JSON.parse(stdout);

          expect(payload.extension.srcdoc).to.eql('the-bundle-contents');
        });
      });
    });

    it('gives the create success message', function () {
      let createCmd = 'create --space-id 123 --name lol --src lol.com --field-types Symbol --id 456 --host http://localhost:3000';

      return command(createCmd, execOptions)
      .then(function (stdout) {
        expect(stdout).to.include('Successfully created extension, id: 456 name: lol');
      });
    });
  });

  describe('Read', function () {
    var flags = [ 'space-id', 'id', 'host', 'all' ];

    it('reads the host config from the environment', function () {
      execOptions.env.CONTENTFUL_MANAGEMENT_HOST = 'http://localhost:3000';
      let createCmd = 'create --space-id 123 --name lol --src lol.com --field-types Symbol --id 456';
      let readCmd = 'read --space-id 123 --id 456';

      return command(createCmd, execOptions)
        .then(function () {
          return command(readCmd, execOptions);
        })
        .then(function (stdout) {
          let payload = JSON.parse(stdout);

          expect(payload.extension.src).to.eql('lol.com');
          expect(payload.sys.id).to.eql('456');
        });
    });

    it('--host option has precedence over the CONTENTFUL_MANAGEMENT_HOST option', function () {
      // no API listening on localhost:9999
      execOptions.env.CONTENTFUL_MANAGEMENT_HOST = 'http://localhost:9999';

      let createCmd = 'create --space-id 123 --name lol --src lol.com --field-types Symbol --id 456 --host http://localhost:3000';
      let readCmd = 'read --space-id 123 --id 456 --host http://localhost:3000';

      return command(createCmd, execOptions)
        .then(function () {
          return command(readCmd, execOptions);
        })
        .then(function (stdout) {
          let payload = JSON.parse(stdout);

          expect(payload.extension.src).to.eql('lol.com');
          expect(payload.sys.id).to.eql('456');
        });
    });

    it('shows the help when the --help flag is present', function () {
      // Use the --space-id flag because otherwise the help would be
      // shown because it's a required flag

      return command('read --space-id 123 --id 456 --help', execOptions)
        .then(function (stdout) {
          testHelpOutput(flags, stdout);
        });
    });

    it('shows all the available options when no one is provided', function () {
      return command('read', execOptions)
        .then(assert.fail)
        .catch(function (error) {
          expect(error.error.code).to.eql(1);
          testHelpOutput(flags, error.stderr);
        });
    });

    it('fails if the --space-id option is not provided', function () {
      return command('read --id 123 --host http://localhost:3000', execOptions)
        .then(assert.fail)
        .catch(function (error) {
          expect(error.error.code).to.eq(1);
          expect(error.stderr).to.match(/Missing required argument: space-id/);
        });
    });

    it('fails if no --id or --all options are provided', function () {
      return command('read --space-id 123 --src foo.com --host http://localhost:3000', execOptions)
        .then(assert.fail)
        .catch(function (error) {
          expect(error.error.code).to.eq(1);
          expect(error.stderr).to.match(/missing one of --id or --all options/);
        });
    });

    it('reports when the extension can not be found', function () {
      let cmd = 'read --space-id 123 --id not-found --host http://localhost:3000';
      let msg = notFoundMsg('get', 'read');

      return expectErrorAndMessage(cmd, execOptions, msg);
    });

    it('reports the error when the API request fails', function () {
      let cmd = 'read --space-id 123 --id fail --host http://localhost:3000';
      let msg = serverErrorMsg('get', 'read', 'ServerError');

      return expectErrorAndMessage(cmd, execOptions, msg);
    });

    it('reads an extension', function () {
      let createCmd = 'create --space-id 123 --name lol --src lol.com --field-types Symbol --id 456 --host http://localhost:3000';
      let readCmd = 'read --space-id 123 --id 456 --host http://localhost:3000';

      return command(createCmd, execOptions)
        .then(function () {
          return command(readCmd, execOptions);
        })
        .then(function (stdout) {
          let payload = JSON.parse(stdout);

          expect(payload.extension.src).to.eql('lol.com');
          expect(payload.sys.id).to.eql('456');
        });
    });

    it('reads all extension', function () {
      let createCmd1 = 'create --space-id 123 --name lol --src lol.com --field-types Symbol --id 456 --host http://localhost:3000';
      let createCmd2 = 'create --space-id 123 --name foo --src foo.com --field-types Symbol --id 789 --host http://localhost:3000';
      let readCmd = 'read --space-id 123 --all --host http://localhost:3000';

      return Bluebird.all([
        command(createCmd1, execOptions),
        command(createCmd2, execOptions)
      ])
      .then(function () {
        return command(readCmd, execOptions);
      })
      .then(function (stdout) {
        let payloads = JSON.parse(stdout);
        let lolExtension = _.find(payloads.items, {sys: {id: '456'}});
        let fooExtension = _.find(payloads.items, {sys: {id: '789'}});

        expect(payloads.total).to.eq(2);
        expect(lolExtension.extension.name).to.eql('lol');
        expect(lolExtension.extension.src).to.eql('lol.com');
        expect(fooExtension.extension.name).to.eql('foo');
        expect(fooExtension.extension.src).to.eql('foo.com');
      });
    });

    it('reports the error when the API request fails (reading all extensions)', function () {
      let cmd = 'read --space-id fail --all --host http://localhost:3000';
      let msg = serverErrorMsg('get', 'read', 'ServerError');

      return expectErrorAndMessage(cmd, execOptions, msg);
    });
  });

  describe('Update', function () {
    let flags = [
      'space-id', 'id', 'src', 'srcdoc', 'name', 'host', 'sidebar', 'field-types', 'descriptor',
      'version', 'force'
    ];

    it('reads the host config from the environment', function () {
      execOptions.env.CONTENTFUL_MANAGEMENT_HOST = 'http://localhost:3000';
      let createCmd = 'create --space-id 123 --name lol --src lol.com --field-types Symbol --id 456';
      let updateCmd = 'update --space-id 123 --name lol --id 456 --version 1 --src foo.com --field-types Symbol';
      let readCmd = 'read --space-id 123 --id 456';

      return command(createCmd, execOptions)
        .then(function () {
          return command(updateCmd, execOptions);
        })
        .then(function () {
          return command(readCmd, execOptions);
        })
        .then(function (stdout) {
          let payload = JSON.parse(stdout);

          expect(payload.extension.src).to.eql('foo.com');
        });
    });

    it('--host option has precedence over the CONTENTFUL_MANAGEMENT_HOST opion', function () {
      // no API listening on localhost:9999
      execOptions.env.CONTENTFUL_MANAGEMENT_HOST = 'http://localhost:9999';

      let createCmd = 'create --space-id 123 --name lol --src lol.com --field-types Symbol --id 456 --host http://localhost:3000';
      let updateCmd = 'update --space-id 123 --name foo --src foo.com --field-types Symbol --id 456 --host http://localhost:3000 --force';
      let readCmd = 'read --space-id 123 --id 456 --host http://localhost:3000';

      return command(createCmd, execOptions)
        .then(function () {
          return command(updateCmd, execOptions);
        })
        .then(function () {
          return command(readCmd, execOptions);
        })
        .then(function (stdout) {
          let payload = JSON.parse(stdout);

          expect(payload.extension.src).to.eql('foo.com');
          expect(payload.sys.id).to.eql('456');
        });
    });

    it('shows the help when the --help flag is present', function () {
      // Use the --space-id flag because otherwise the help would be
      // shown because it's a required flag

      return command('update --space-id 123 --help', execOptions)
        .then(function (stdout) {
          testHelpOutput(flags, stdout);
        });
    });

    it('shows all the available options when no one is provided', function () {
      return command('update', execOptions)
        .then(assert.fail)
        .catch(function (error) {
          expect(error.error.code).to.eql(1);
          testHelpOutput(flags, error.stderr);
        });
    });

    it('fails if the --space-id option is not provided', function () {
      return command('update --id 123 --name lol --field-types Symbol --src foo.com --host http://localhost:3000', execOptions)
        .then(assert.fail)
        .catch(function (error) {
          expect(error.error.code).to.eq(1);
          expect(error.stderr).to.match(/Missing required argument: space-id/);
        });
    });

    it('fails if no --name option is provided', function () {
      let cmd = 'update --space-id 123 --id 456 --src foo.com --field-types Symbol --host http://localhost:3000';
      let msg = `you're missing the following parameters: name`;

      return expectErrorAndMessage(cmd, execOptions, msg);
    });

    it('fails if no --id option is provided', function () {
      let cmd = 'update --space-id 123 --name lol --src foo.com --field-types Symbol --host http://localhost:3000';
      let msg = `you're missing the following parameters: id`;

      return expectErrorAndMessage(cmd, execOptions, msg);
    });

    it('fails if no --srcdoc or --src options are provided', function () {
      let cmd = 'update --space-id 123 --name lol --field-types Symbol --id 123 --force --host http://localhost:3000';
      let msg = `you're missing the following parameters: src or srcdoc`;

      return expectErrorAndMessage(cmd, execOptions, msg);
    });

    it('fails if no --field-types option is provided', function () {
      let cmd = 'update --space-id 123 --name lol --src lol.com --id 123 --host http://localhost:3000';
      let msg = `you're missing the following parameters: fieldTypes`;

      return expectErrorAndMessage(cmd, execOptions, msg);
    });

    it('reports the error when the API request fails (without version, reading current)', function () {
      let cmd = 'update --space-id 123 --name lol --src lol.com --field-types Symbol --id fail --force --host http://localhost:3000';
      let msg = serverErrorMsg('get', 'update', 'ServerError');

      return expectErrorAndMessage(cmd, execOptions, msg);
    });

    it('reports the error when the API request fails (without version)', function () {
      let createCmd = 'create --space-id 123 --name lol --src lol.com --field-types Symbol --id fail-update --host http://localhost:3000';
      let updateCmd = 'update --space-id 123 --name lol --id fail-update --src foo.com --field-types Symbol --force --host http://localhost:3000';
      let msg = serverErrorMsg('put', 'update', 'ServerError');

      return command(createCmd, execOptions)
        .then(function () {
          return expectErrorAndMessage(updateCmd, execOptions, msg);
        });
    });

    it('reports the error when the API request fails (with version)', function () {
      let cmd = 'update --space-id 123 --name lol --src lol.com --version 1 --field-types Symbol --id fail --host http://localhost:3000';
      let msg = serverErrorMsg('put', 'update', 'ServerError');

      return expectErrorAndMessage(cmd, execOptions, msg);
    });

    it('updates an extension passing the version', function () {
      let createCmd = 'create --space-id 123 --name lol --src lol.com --field-types Symbol --id 456 --host http://localhost:3000';
      let updateCmd = 'update --space-id 123 --name foo --id 456 --version 1 --src foo.com --field-types Symbol --host http://localhost:3000';
      let readCmd = 'read --space-id 123 --id 456 --host http://localhost:3000';

      return command(createCmd, execOptions)
        .then(function () {
          return command(updateCmd, execOptions);
        })
        .then(function () {
          return command(readCmd, execOptions);
        })
        .then(function (stdout) {
          let payload = JSON.parse(stdout);

          expect(payload.extension.name).to.eql('foo');
          expect(payload.extension.src).to.eql('foo.com');
        });
    });

    it('fails to update the extension if no version is given and force option not present', function () {
      let cmd = 'update --space-id 123 --id 456 --name lol --field-types Symbol --src foo.com --host http://localhost:3000';
      let msg = 'to update without version use the --force flag';

      return expectErrorAndMessage(cmd, execOptions, msg);
    });

    it('updates an extension without explicitely giving it version', function () {
      let createCmd = 'create --space-id 123 --name lol --src lol.com --field-types Symbol --id 456 --host http://localhost:3000';
      let updateCmd = 'update --space-id 123 --name foo --id 456 --src foo.com --field-types Symbol --force --host http://localhost:3000';
      let readCmd = 'read --space-id 123 --id 456 --host http://localhost:3000';

      return command(createCmd, execOptions)
        .then(function () {
          return command(updateCmd, execOptions);
        })
        .then(function () {
          return command(readCmd, execOptions);
        })
        .then(function (stdout) {
          let payload = JSON.parse(stdout);

          expect(payload.extension.name).to.eql('foo');
          expect(payload.extension.src).to.eql('foo.com');
        });
    });

    it('returns an error if neither descriptor or options are present', function () {
      let cmd = 'update --space-id 123 --name lol --id 456';
      let msg = `you're missing the following parameters: fieldTypes, src or srcdoc`;

      return expectErrorAndMessage(cmd, execOptions, msg);
    });

    it('updates the name of an extension', function () {
      let createCmd = 'create --space-id 123 --name lol --src l.com --field-types Symbol --id 456 --host http://localhost:3000';
      let updateCmd = 'update --space-id 123 --name doge --src l.com --id 456 --field-types Symbol --force --host http://localhost:3000';
      let readCmd = 'read --space-id 123 --id 456 --host http://localhost:3000';

      return command(createCmd, execOptions)
        .then(function () {
          return command(updateCmd, execOptions);
        })
        .then(function () {
          return command(readCmd, execOptions);
        })
        .then(function (stdout) {
          let payload = JSON.parse(stdout);

          expect(payload.extension.name).to.eql('doge');
        });
    });

    it('updates the fieldTypes of an extension', function () {
      let createCmd = 'create --space-id 123 --name lol --src l.com --id 456 --field-types Symbol --name foo --host http://localhost:3000';
      let updateCmd = 'update --space-id 123 --name lol --src l.com --id 456 --field-types Text Symbol Assets --force --host http://localhost:3000';
      let readCmd = 'read --space-id 123 --id 456 --host http://localhost:3000';

      return command(createCmd, execOptions)
        .then(function () {
          return command(updateCmd, execOptions);
        })
        .then(function () {
          return command(readCmd, execOptions);
        })
        .then(function (stdout) {
          let payload = JSON.parse(stdout);

          expect(payload.extension.fieldTypes).to.eql([
            {type: 'Text'},
            {type: 'Symbol'},
            {type: 'Array', items: {type: 'Link', linkType: 'Asset'}}
          ]);
        });
    });

    it('updates the sibebar property to true', function () {
      let createCmd = 'create --space-id 123 --name lol --src l.com --field-types Symbol --id 456 --name foo --no-sidebar --host http://localhost:3000';
      let updateCmd = 'update --space-id 123 --name lol --src l.com --field-types Symbol --id 456 --sidebar --force --host http://localhost:3000';
      let readCmd = 'read --space-id 123 --id 456 --host http://localhost:3000';

      return command(createCmd, execOptions)
      .then(function () {
        return command(updateCmd, execOptions);
      })
      .then(function () {
        return command(readCmd, execOptions);
      })
      .then(function (stdout) {
        let payload = JSON.parse(stdout);

        expect(payload.extension.sidebar).to.be.true();
      });
    });

    it('updates the sidebar property to false', function () {
      let createCmd = 'create --space-id 123 --name lol --src l.com --field-types Symbol --id 456 --name foo --sidebar --host http://localhost:3000';
      let updateCmd = 'update --space-id 123 --name lol --src l.com --field-types Symbol --id 456 --no-sidebar --force --host http://localhost:3000';
      let readCmd = 'read --space-id 123 --id 456 --host http://localhost:3000';

      return command(createCmd, execOptions)
      .then(function () {
        return command(updateCmd, execOptions);
      })
      .then(function () {
        return command(readCmd, execOptions);
      })
      .then(function (stdout) {
        let payload = JSON.parse(stdout);

        expect(payload.extension.sidebar).to.be.false();
      });
    });

    it('removes the sidebar property (when ommited)', function () {
      let createCmd = 'create --space-id 123 --name lol --src l.com --field-types Symbol --id 456 --name foo --sidebar --host http://localhost:3000';
      let updateCmd = 'update --space-id 123 --name lol --src l.com --field-types Symbol --id 456 --name foo --force --host http://localhost:3000';
      let readCmd = 'read --space-id 123 --id 456 --host http://localhost:3000';

      return command(createCmd, execOptions)
      .then(function () {
        return command(updateCmd, execOptions);
      })
      .then(function () {
        return command(readCmd, execOptions);
      })
      .then(function (stdout) {
        let payload = JSON.parse(stdout);

        expect(payload.extension).to.not.have.ownProperty('sidebar');
      });
    });

    describe('when the --srcdoc option is used', function () {
      let file;

      beforeEach(function () {
        file = temp.path();
        return fs.writeFileAsync(file, 'the-bundle-contents');
      });

      afterEach(function () {
        return fs.unlinkAsync(file);
      });

      it('reports the error when the API request fails (without version)', function () {
        let createCmd = 'create --space-id 123 --name lol --src lol.com --field-types Symbol --id fail-update --host http://localhost:3000';
        let updateCmd = `update --space-id 123 --name lol --field-types Symbol --id fail-update --srcdoc ${file} --force --host http://localhost:3000`;
        let msg = serverErrorMsg('put', 'update', 'ServerError');

        return command(createCmd, execOptions)
          .then(function () {
            return expectErrorAndMessage(updateCmd, execOptions, msg);
          });
      });

      it('reports the error when the API request fails (without version, reading current)', function () {
        let updateCmd = `update --space-id 123 --name lol --field-types Symbol --id fail --srcdoc ${file} --force --host http://localhost:3000`;
        let msg = serverErrorMsg('get', 'update', 'ServerError');

        return expectErrorAndMessage(updateCmd, execOptions, msg);
      });

      it('reports the error when the API request fails (with version)', function () {
        let createCmd = 'create --space-id 123 --name lol --src lol.com --field-types Symbol --id fail-update --host http://localhost:3000';
        let updateCmd = `update --space-id 123 --name lol --src lol.com --version 1 --field-types Symbol --id fail-update --srcdoc ${file} --force --host http://localhost:3000`;
        let msg = serverErrorMsg('put', 'update', 'ServerError');

        return command(createCmd, execOptions)
          .then(function () {
            return expectErrorAndMessage(updateCmd, execOptions, msg);
          });
      });

      it('reports the error when the file does not exist', function () {
        let cmd = 'update --space-id 123 --name lol --field-types Symbol --id 456 --srcdoc some-unexisting-file --force --host http://localhost:3000';
        let msg = 'Cannot read the file defined as the "srcdoc" property (some-unexisting-file)';

        return expectErrorAndMessage(cmd, execOptions, msg);
      });

      it('updates an extension from a file without explicitely giving its version', function () {
        let createCmd = 'create --space-id 123 --name lol --src lol.com --field-types Symbol --id 456 --host http://localhost:3000';
        let updateCmd = `update --space-id 123 --name lol --field-types Symbol --id 456 --srcdoc ${file} --force --host http://localhost:3000`;
        let readCmd = 'read --space-id 123 --id 456 --host http://localhost:3000';

        return command(createCmd, execOptions)
          .then(function () {
            return command(updateCmd, execOptions);
          })
          .then(function () {
            return command(readCmd, execOptions);
          })
          .then(function (stdout) {
            let payload = JSON.parse(stdout);

            expect(payload.extension.srcdoc).to.eql('the-bundle-contents');
          });
      });
    });

    it('gives the update success message', function () {
      let createCmd = 'create --space-id 123 --name lol --src lol.com --field-types Symbol --id 456 --host http://localhost:3000';
      let updateCmd = 'update --space-id 123 --name foo --src foo.com --field-types Symbol --id 456 --host http://localhost:3000 --force';

      return command(createCmd, execOptions)
      .then(function (stdout) {
        return command(updateCmd, execOptions);
      })
      .then(function (stdout) {
        expect(stdout).to.include('Successfully updated extension, id: 456 name: foo');
      });
    });
  });

  describe('Delete', function () {
    let flags = ['space-id', 'id', 'version', 'force', 'host'];

    it('reads the host config from the environment', function () {
      execOptions.env.CONTENTFUL_MANAGEMENT_HOST = 'http://localhost:3000';
      let createCmd = 'create --space-id 123 --name lol --src lol.com --field-types Symbol --id 456';
      let deleteCmd = 'delete --space-id 123 --id 456 --version 1';
      let readCmd = 'read --space-id 123 --all';

      return command(createCmd, execOptions)
        .then(function () {
          return command(deleteCmd, execOptions);
        })
        .then(function () {
          return command(readCmd, execOptions);
        })
        .then(function (stdout) {
          let payload = JSON.parse(stdout);

          expect(payload.total).to.eql(0);
          expect(payload.items).to.be.empty();
        });
    });

    it('--host option has precedence over the CONTENTFUL_MANAGEMENT_HOST option', function () {
      // no API listening on localhost:9999
      execOptions.env.CONTENTFUL_MANAGEMENT_HOST = 'http://localhost:9999';

      let createCmd = 'create --space-id 123 --name lol --src lol.com --field-types Symbol --id 456 --host http://localhost:3000';
      let deleteCmd = 'delete --space-id 123 --id 456 --version 1 --host http://localhost:3000';
      let readCmd = 'read --space-id 123 --all --host http://localhost:3000';

      return command(createCmd, execOptions)
        .then(function () {
          return command(deleteCmd, execOptions);
        })
        .then(function () {
          return command(readCmd, execOptions);
        })
        .then(function (stdout) {
          let payload = JSON.parse(stdout);

          expect(payload.total).to.eql(0);
          expect(payload.items).to.be.empty();
        });
    });

    it('shows the help when the --help flag is present', function () {
      // Use the --space-id and --id flags because otherwise the help would be
      // shown because they are required flags

      return command('delete --space-id 123 --id 456 --help', execOptions)
        .then(function (stdout) {
          testHelpOutput(flags, stdout);
        });
    });

    it('shows all the available options when no one is provided', function () {
      return command('delete', execOptions)
        .then(assert.fail)
        .catch(function (error) {
          expect(error.error.code).to.eql(1);
          testHelpOutput(flags, error.stderr);
        });
    });

    it('fails if the --space-id option is not provided', function () {
      return command('update --id 123 --src foo.com --host http://localhost:3000', execOptions)
        .then(assert.fail)
        .catch(function (error) {
          expect(error.error.code).to.eq(1);
          expect(error.stderr).to.match(/Missing required argument: space-id/);
        });
    });

    it('fails if no --id option is provided', function () {
      return command('delete --space-id 123 --src foo.com --host http://localhost:3000', execOptions)
        .then(assert.fail)
        .catch(function (error) {
          expect(error.error.code).to.eq(1);
          expect(error.stderr).to.match(/Missing required argument: id/);
        });
    });

    it('fails to delete the extension if no version is given and force option not present', function () {
      return command('delete --space-id 123 --src foo.com --id 456 --host http://localshot', execOptions)
        .then(assert.fail)
        .catch(function (error) {
          expect(error.error.code).to.eq(1);
          expect(error.stderr).to.match(/to delete without version use the --force flag/);
        });
    });

    it('reports the error when the API request fails (without version, reading current)', function () {
      let cmd = 'delete --space-id 123 --id fail --force --host http://localhost:3000';
      let msg = serverErrorMsg('get', 'delete', 'ServerError');

      return expectErrorAndMessage(cmd, execOptions, msg);
    });

    it('reports the error when the API request fails (without version, deleting)', function () {
      let createCmd = 'create --space-id 123 --name lol --src lol.com --field-types Symbol --id fail-delete --host http://localhost:3000';
      let deleteCmd = 'delete --space-id 123 --id fail-delete --force --host http://localhost:3000';
      let msg = serverErrorMsg('delete', 'delete', 'ServerError');

      return command(createCmd, execOptions)
        .then(function () {
          return expectErrorAndMessage(deleteCmd, execOptions, msg);
        });
    });

    it('reports the error when the API request fails (without version, not found)', function () {
      let deleteCmd = 'delete --space-id 123 --force --id not-found --host http://localhost:3000';
      let msg = notFoundMsg('get', 'delete');

      return expectErrorAndMessage(deleteCmd, execOptions, msg);
    });

    it('reports the error when the API request fails (with version, not found)', function () {
      let deleteCmd = 'delete --space-id 123 --version 1 --id not-found --host http://localhost:3000';
      let msg = notFoundMsg('delete', 'delete');

      return expectErrorAndMessage(deleteCmd, execOptions, msg);
    });

    it('reports the error when the API request fails (with version)', function () {
      let deleteCmd = 'delete --space-id 123 --version 1 --id fail-delete --host http://localhost:3000';
      let msg = serverErrorMsg('delete', 'delete', 'ServerError');

      return expectErrorAndMessage(deleteCmd, execOptions, msg);
    });

    it('deletes an extension', function () {
      let createCmd = 'create --space-id 123 --name lol --src lol.com --field-types Symbol --id 456 --host http://localhost:3000';
      let deleteCmd = 'delete --space-id 123 --id 456 --version 1 --host http://localhost:3000';
      let readCmd = 'read --space-id 123 --all --host http://localhost:3000';

      return command(createCmd, execOptions)
        .then(function () {
          return command(deleteCmd, execOptions);
        })
        .then(function () {
          return command(readCmd, execOptions);
        })
        .then(function (stdout) {
          let payload = JSON.parse(stdout);

          expect(payload.total).to.eql(0);
          expect(payload.items).to.be.empty();
        });
    });

    it('deletes an extension without explicitely giving its version', function () {
      let createCmd = 'create --space-id 123 --name lol --src lol.com --field-types Symbol --id 456 --host http://localhost:3000';
      let deleteCmd = 'delete --space-id 123 --id 456 --force --host http://localhost:3000';
      let readCmd = 'read --space-id 123 --all --host http://localhost:3000';

      return command(createCmd, execOptions)
        .then(function () {
          return command(deleteCmd, execOptions);
        })
        .then(function () {
          return command(readCmd, execOptions);
        })
        .then(function (stdout) {
          let payload = JSON.parse(stdout);

          expect(payload.total).to.eql(0);
          expect(payload.items).to.be.empty();
        });
    });

    it('gives the delete success message', function () {
      let createCmd = 'create --space-id 123 --name lol --src lol.com --field-types Symbol --id 456 --host http://localhost:3000';
      let deleteCmd = 'delete --space-id 123 --id 456 --force --host http://localhost:3000';

      return command(createCmd, execOptions)
        .then(function () {
          return command(deleteCmd, execOptions);
        })
        .then(function (stdout) {
          expect(stdout).to.include('Successfully deleted extension');
        });
    });
  });
});

function expectErrorAndMessage (commandString, execOptions, errorMessage) {
  return command(commandString, execOptions)
    .then(assert.fail)
    .catch(function (error) {
      expect(error.error.code).to.eq(1);
      expect(error.stderr).to.have.string(errorMessage);
    });
}

function notFoundMsg (method, op) {
  let reasons = ['Check used CMA access token / space ID combination.'];

  if (method !== 'post') {
    reasons.push('Check the extension ID.');
  }

  return httpError(method, op, 'NotFound', reasons.join('\n'));
}

function serverErrorMsg (method, op, errorCode) {
  let details = 'Server failed to fulfill the request.';

  return httpError(method, op, errorCode, details);
}

function httpError (method, op, errorCode, details) {
  let link = 'See https://www.contentful.com/developers/docs/references/errors for more information.\n';

  return `${method.toUpperCase()} (${op}) request failed because of ${errorCode} error.\n${details}\n${link}`;
}
