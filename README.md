## Introduction [![Build Status](https://travis-ci.org/contentful/contentful-extension-cli.svg?branch=master)](https://travis-ci.org/contentful/contentful-extension-cli)

Contentful allows customers to customize and tailor the UI using custom made extensions. Extensions have to be uploaded to Contentful in order to be able to use them in the UI.

This repo hosts `contentful-extension` a Command Line Tool (CLI) developed to simplify the management tasks associated with custom extensions. With the CLI you can:

- Create extensions
- Update existing extensions
- Read extensions
- Delete extensions

## Installation

```
npm install -g contentful-extension-cli
```


## Available commands

`contentful-extension` is composed of 4 subcommands that you can use to manage the extensions.

**create an extension**

```
contentful-extension create [options]
```
Use this subcommand to create the extension for the first time. Succesive modifications made to the extension will be have to be using the `update` subcommand.

**read an extension**

```
contentful-extension read [options]
```
Use this subcommand to read the extension payload from Contentful. With this subcommand you can also list all the extensions in one space.

**update an extension**

```
contentful-extension update [options]
```
Use this subcommand to modify an existing extension.

**delete an extension**

```
contentful-extension delete [options]
```

Use this subcommand to permanently delete an extension from Contentful.

For a full list of all the options available on every subcommand use the `--help` option.

**list all extensions**

```
contentful-extension list [options]
```

Use this subcommand to see what extensions are created for a given space.

## Misc

The following sections describe a series of concepts around the extensions and how the CLI deals with them.

### Extension properties

The following table describes the properties that can be set on an extension.

Property | Required| Type | Description
---------|---------|------|------------
name | yes | String | Extension name
fieldTypes | yes | Array\<String\> * | Field types where an extension can be used
src | ** | String | URL where the root HTML document of the extension can be found
srcdoc | ** | String | Path to the local extension HTML document
sidebar | no | Boolean | Controls the location of the extension. If `true` it will be rendered on the sidebar

\* Valid field types are: `Symbol`, `Symbols`, `Text`, `Integer`, `Number`, `Date`, `Boolean`, `Object`, `Entry`, `Entries`, `Asset`, `Assets`

\** One of `src` or `srcdoc` have to be present

#### Difference between `src` and `srcdoc` properties

When using `src` property, an extension is considered 3rd party hosted. Relative links in the root HTML document are supported as expected.

When using `srcdoc` property, an extension is considered internally hosted. A file being pointed by the `srcdoc` property will be loaded and uploaded as a string to Contentful. All local dependencies have to be manually inlined into the file. The command line tool does not take care of link resolving and inlining of referenced local resources. The maximal size of a file used with the `srcdoc` property is 200kB. Use [HTML minifier with `minifyJS` option](https://www.npmjs.com/package/html-minifier) and use CDN sources for libraries that your extension is depending on.

If a relative value of `srcdoc` property is used, the path is resolved from a directory in which the descriptor file is placed or a working directory when using the `--srcdoc` command line option.

Use the `src` property when you want to be as flexible as possible with your development and deployment process. Use the `srcdoc` property if you don't want to host anything on your own and can accept the drawbacks (need for a non-standard build, filesize limitation). Note that using `srcdoc` is [not supported][caniuse-srcdoc] on Internet Explorer and Microsof Edge.

[caniuse-srcdoc]: https://caniuse.com/#feat=iframe-srcdoc

#### Specifying extension properties

Subcommands that create of modify extensions (`create` and `update`) accept the properties for the extension in two forms: command line options or a JSON file.

##### Command line options

For every property in the extension there's a corresponding long option with the same name. So for example, there's a `name` property and so a `--name` option too.

```
contentful-extension create --space-id 123 --name foo --src foo.com/extension
```
Note that camelcased property names like `fieldTypes` are hyphenated (`--field-types`).

##### Descriptor files

Descriptor files are JSON files that contain the values that will be sent to the API to create the extension. By default the CLI will look in the current working directory for a descriptor file called `extension.json`. Another file can be used witht the `--descriptor` option.

A descriptor file can contain:

- All the extension properties (`name`, `src`, ...). Please note that the `srcdoc` property has to be a path to a file containing the extension HTML document.
- An `id` property. Including the `id` in the descriptor file means that you won't have to use the `--id` option when creating or updating an extension.

All the properties included in a descriptor file can be overriden by its counterpart command line options. This means that, for example, a `--name bar` option will take precedence over the `name` property in the descriptor file. Following is an example were the usage of descriptor files is explained:

Assuming that there's an `extension.json` file in the directory where the CLI is run and that's its contents are:

```json
{
  "name": "foo",
  "src": "foo.com/extension",
  "id": "foo-extension"
}
```

The following command

```
contentful-extension create --space-id 123 --name bar
```

Will create the following extension. Note that the `name` is `bar` and that the `id` is `foo-extension`.

```json
{
  "name": "bar",
  "src": "foo.com/extension",
  "id": "foo-extension"
  "sys": {
   "id": "foo-extension"
   ...
  }
}
```


### Authentication

Extensions are managed via the Contentful Management API (CMA).
You will therefore need to provide a valid access token in the
`CONTENTFUL_MANAGEMENT_ACCESS_TOKEN` environment variable.

Our documentation describes [how to obtain a token](https://www.contentful.com/developers/docs/references/authentication/#getting-an-oauth-token).


### Version locking

Contentful API use [optimistic locking](https://www.contentful.com/developers/docs/references/content-management-api/#/introduction/updating-and-version-locking) to ensure that accidental non-idemptotent operations (`update` or `delete`) can't happen.

This means that the CLI  needs to know the current version of the extension when using the `update` and `delete` subcommands. On these case you have to specify the version of the extension using the `--version` option.

If you don't want to use the `--version` option on every update or deletion, the alternative is to use `--force`. When the `--force` option is present the CLI will automatically use the latest version of the extension. Be aware that using `--force` option might lead to accidental overwrites if multiple people are working on the same extension.

### Programmatic usage

You can also use CLI's methods with a programmatic interface (for example in your build process). A client can be created simply by requiring `contentful-extension-cli` npm package:

```js
const cli = require('contentful-extension-cli');

const client = cli.createClient({
  accessToken: process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN,
  spaceId: 'xxxyyyzzz',
  host: 'https://api.contentful.com' // optional, default value shown
});

// getting an array of all extensions in the space
client.getAll().then(function (extensions) {});

// getting a single extension
client.get(extensionIs).then(function (extension) {});

// save method takes an object of extension properties described above
client.save({
  id: 'test-id',
  name: 'test',
  src: 'https://extension.example'
}).then(function (savedExtension) {});

// the only difference is that srcdoc is a HTML document string
// instead of a path (so it can be fed with custom build data)
client.save({
  id: 'test-id',
  name: 'test',
  srcdoc: '<!doctype html><html><body><p>test...'
}).then(function (savedExtension) {});

// if extension was saved, a result of the get method call will contain
// version that has to be supplied to the consecutive save call
client.save({
  id: 'test-id',
  name: 'test',
  src: 'https://extension.example',
  version: 123
}).then(function (savedExtension) {});

// delete method also requires a version number
client.delete(extensionIs, currentExtensionVersion).then(function () {});
```
