var urlParse = require('url').parse;
var _ = require('underscore');

var SAFE_URL = /^https?:\/\//;

var SCHEMA_DEFAULTS = {
  required: false
};

var MINICADE_SCHEMA = {
  title: {type: String},
  games: {
    type: Array,
    required: true,
    itemSchema: {
      title: {type: String, default: 'Untitled Game'},
      description: {type: String},
      url: {type: String, regex: SAFE_URL, required: true},
      remixurl: {type: String, regex: SAFE_URL},
    }
  }
};

function isInstance(thing, type) {
  if (type == String)
    return typeof(thing) == 'string';
  if (type == Array)
    return Array.isArray(thing);
  throw new Error("unknown type: " + type.name);
}

function validateSchema(thing, schema, ignoreMissing) {
  schema = schema || MINICADE_SCHEMA;
  var newThing = {};
  _.keys(schema).forEach(function(prop) {
    var s = _.defaults(schema[prop], SCHEMA_DEFAULTS);
    if (!(prop in thing)) {
      if (!ignoreMissing && s.required)
        throw new Error('required property missing: ' + prop);
      if ('default' in s)
        newThing[prop] = s.default;
      return;
    }
    if (!isInstance(thing[prop], s.type))
      throw new Error('property is not a ' + s.type.name + ': ' + prop);
    if (thing[prop] && s.regex && !s.regex.test(thing[prop]))
      throw new Error('invalid format for property: ' + prop);
    if (Array.isArray(thing[prop]) && s.itemSchema)
      newThing[prop] = thing[prop].map(function(item) {
        return validateSchema(item, s.itemSchema, ignoreMissing);
      });
    else
      newThing[prop] = thing[prop];
  });
  return newThing;
}

function endswith(str, suffix) {
  return (str || '').slice(-suffix.length) == suffix;
}

exports.embellishGame = function(game) {
  var parsed = urlParse(game.url);

  game.contenturl = game.url;

  if (/\.makes\.org$/.test(parsed.host)) {
    if (!endswith(game.contenturl, '_'))
      game.contenturl += '_';
    if (!game.remixurl && !endswith(game.url, '_')) {
      game.remixurl = game.url + '/remix';
      game.remixtool = 'Thimble';
    }
  } else if (/jsbin\.com$/.test(parsed.host)) {
    if (!game.remixurl) {
      game.remixtool = 'JS Bin';
      game.contenturl = game.contenturl.replace(
        '/jsbin.com/',
        '/jsbin-proxy.herokuapp.com/'
      );
      if (endswith(game.url, '/'))
        game.remixurl = game.url + 'edit';
      else
        game.remixurl = game.url + '/edit';
    }
  } else if (/^games\.minica\.de$/.test(parsed.host) ||
             /^mmm\.minica\.de$/.test(parsed.host)) {
    if (!game.remixurl) {
      game.remixtool = 'Minicade\'s Minigame Maker';
      game.remixaction = 'Remix in Minicade';
      game.remixurl = 'http://mmm.minica.de/?importGame=' +
        encodeURIComponent(game.url);
    }
  } else if (game.remixurl) {
    if (/^https?:\/\/github\.com\//.test(game.remixurl)) {
      game.remixtool = 'GitHub';
      game.remixaction = 'Fork on GitHub';
    }
  }

  if (game.remixurl && !game.remixaction) {
    if (game.remixtool)
      game.remixaction = 'Remix in ' + game.remixtool;
    else
      game.remixaction = 'Remix Game';
  }

  return game;
};

exports.validate = validateSchema;
