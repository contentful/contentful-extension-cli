'use strict';

var _ = require('lodash');
var yargs = require('yargs');

// Override OS locale and LC_ALL
yargs.locale('en');

let OPTIONS = {
  'help': {
    description: 'Show this help',
    type: 'boolean',
    for: 'all'
  },
  'space-id': {
    required: true,
    description: 'Id of a space in Contentful',
    type: 'string',
    requiresArg: true,
    for: ['all']
  },
  'host': {
    description: 'API host',
    type: 'string',
    requiresArg: true,
    for: ['all']
  },
  'srcdoc': {
    description: 'Path to extension bundle',
    type: 'string',
    requiresArg: true,
    for: ['create', 'update']
  },
  'src': {
    description: 'URL to extension bundle',
    type: 'string',
    requiresArg: true,
    for: ['create', 'update']
  },
  'id': {
    description: 'Extension ID',
    type: 'string',
    requiresArg: true,
    for: ['all']
  },
  'name': {
    description: 'Extension name',
    type: 'string',
    requiresArg: true,
    for: ['create', 'update']
  },
  'descriptor': {
    description: 'Path to an extension descriptor file',
    type: 'string',
    requiresArg: true,
    for: ['create', 'update']
  },
  'field-types': {
    description: 'List of field types where to use the extension',
    type: 'array',
    requiresArg: true,
    for: ['create', 'update']
  },
  'sidebar': {
    description: 'Render the extension in the sidebar',
    type: 'boolean',
    default: undefined,
    for: ['create', 'update']
  },
  'force': {
    description: 'Force operation without explicit version',
    type: 'boolean',
    for: ['update', 'delete']
  },
  'version': {
    description: 'Current version of the extension',
    type: 'string',
    requiresArg: true,
    for: ['update', 'delete']
  },
  'all': {
    description: 'Read all the extensions in the space',
    type: 'boolean',
    for: ['read']
  }
};

let optionsRefinements = {
  delete: {
    'id': {
      required: true
    }
  }
};

exports.options = OPTIONS;
exports.for = function (command, defaults) {
  let optionDescriptors = optionDescriptorsForCommand(command);
  let argv = yargs.options(optionDescriptors).argv;
  let ARGVValues = ARGVValuesForCommand(argv, optionDescriptors, command, defaults);

  return ARGVValues;
};

exports.helpFor = function (command) {
  let optionDescriptors = optionDescriptorsForCommand(command);
  let argv = yargs.options(optionDescriptors);

  return argv.help();
};

function optionDescriptorsForCommand (command) {
  return _.transform(OPTIONS, function (acc, value, key) {
    let applicableTo = value.for;
    let refinement;

    if (optionsRefinements[command]) {
      refinement = optionsRefinements[command][key];
    }

    if (_.includes(applicableTo, command) || _.includes(applicableTo, 'all')) {
      let clone = _.omit(value, 'for');

      _.extend(clone, refinement);
      acc[key] = clone;
    }
  }, {});
}

function ARGVValuesForCommand (argv, optionDescriptors, command, defaults) {
  let keys = Object.keys(optionDescriptors);
  let camelcasedKeys = _.map(keys, _.camelCase);

  return _.defaults(_.pick(argv, camelcasedKeys), defaults);
}
