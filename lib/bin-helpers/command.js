'use strict';

var error = require('../command/utils/error');
var flags = require('./flags');
var setupContext = require('../context');

const DOCS_URL =
  'https://www.contentful.com/developers/docs/references/authentication/';

module.exports = function (name) {
  let command = require(`../command/${name}`);
  let env = fetchEnvironmentOptions();
  let defaults = { host: env.host };
  let options = flags.for(name, defaults);

  if (options.help) {
    console.log(flags.helpFor(name));
    process.exit(0);
  }

  let token = ensureCMAtoken(env, name);
  let context = setupContext({token: token, host: options.host});

  command(options, context);
};

function ensureCMAtoken (env, command) {
  let token = env.token;

  if (!token) {
    let msg = error.format(command)(
      'Environment variable CONTENTFUL_MANAGEMENT_ACCESS_TOKEN ' +
      `is undefined or empty. Visit ${DOCS_URL} to obtain your CMA token.`
    );

    console.error(msg);
    process.exit(1);
  }

  return token;
}

function fetchEnvironmentOptions () {
  return {
    token: process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN,
    host: process.env.CONTENTFUL_MANAGEMENT_HOST
  };
}
