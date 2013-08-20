/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var fs = require('fs'),
    path = require('path'),
    util = require('util');

var BIDI_RTL_LANGS = ['ar', 'fa', 'he'],
    translations = {},
    default_lang = 'en-US',
    default_locale = 'en_US';

function gettext(sid, locale) {
  if (translations[locale][sid] && translations[locale][sid].length) {
    return translations[locale][sid];
  }
  // Return the default lang's string if missing in the translation.
  return (translations[default_locale][sid]) || sid;
}

function qualityCmp(a, b) {
  if (a.quality === b.quality) {
    return 0;
  } else if (a.quality < b.quality) {
    return 1;
  } else {
    return -1;
  }
}

/**
 * Parses the HTTP accept-language header and returns a
 * sorted array of objects. Example object:
 * {
 *   lang: 'pl', quality: 0.7
 * }
 **/
function parseAcceptLanguage(header) {
  // pl,fr-FR;q=0.3,en-US;q=0.1
  if (! header || ! header.split) {
    return [];
  }
  var raw_langs = header.split(',');
  var langs = raw_langs.map(function(raw_lang) {
    var parts = raw_lang.split(';');
    var q = 1;
    if (parts.length > 1 && parts[1].indexOf('q=') === 0) {
      var qval = parseFloat(parts[1].split('=')[1]);
      if (isNaN(qval) === false) {
        q = qval;
      }
    }
    return { lang: parts[0].trim(), quality: q };
  });
  langs.sort(qualityCmp);
  return langs;
}

/**
 * Given the user's prefered languages and a list of currently
 * supported languages, returns the best match or a default language.
 * languages must be a sorted list, the first match is returned.
 **/
function bestLanguage(languages, supported_languages, defaultLanguage) {
  var lower = supported_languages.map(function(l) { return l.toLowerCase(); });
  for(var i=0; i < languages.length; i++) {
    var lq = languages[i];
    if (lower.indexOf(lq.lang.toLowerCase()) !== -1) {
      return lq.lang;
    // Issue#1128 match locale, even if region isn't supported
    } else if (lower.indexOf(lq.lang.split('-')[0].toLowerCase()) !== -1) {
      return lq.lang.split('-')[0];
    }
  }
  return defaultLanguage;
}

/**
 * Given a language code, return a locale code the OS understands.
 *
 * language: en-US
 * locale:   en_US
 **/
function localeFrom(language) {
  if (! language || ! language.split) {
    return "";
  }
  var parts = language.split('-');
  if (parts.length === 1) {
    return parts[0].toLowerCase();
  } else if (parts.length === 2) {
    return util.format('%s_%s', parts[0].toLowerCase(), parts[1].toUpperCase());
  } else if (parts.length === 3) {
    // sr-Cyrl-RS should be sr_RS
    return util.format('%s_%s', parts[0].toLowerCase(), parts[2].toUpperCase());
  } else {
    console.error(
      util.format("Unable to map a local from language code [%s]", language));
    return language;
  }
}

/**
 * Given a locale code, return a language code
 **/
function languageFrom(locale) {
  if (!locale || !locale.split) {
    return "";
  }
  var parts = locale.split('_');
  if (parts.length === 1) {
    return parts[0].toLowerCase();
  } else if (parts.length === 2) {
    return util.format('%s-%s', parts[0].toLowerCase(), parts[1].toUpperCase());
  } else if (parts.length === 3) {
    // sr_RS should be sr-RS
    return util.format('%s-%s', parts[0].toLowerCase(), parts[2].toUpperCase());
  } else {
    console.error(util.format("Unable to map a language from locale code [%s]", locale));
    return locale;
  }
}

/**
 * The format function provides string interpolation on the client and server side.
 * It can be used with either an object for named variables, or an array
 * of values for positional replacement.
 *
 * Named Example:
 * format("%(salutation)s %(place)s", {salutation: "Hello", place: "World"}, true);
 * Positional Example:
 * format("%s %s", ["Hello", "World"]);
 **/
exports.format = format = function(fmt, obj, named) {
  if (!fmt) return "";
  if (Array.isArray(obj) || named === false) {
    return fmt.replace(/%s/g, function(){return String(obj.shift());});
  } else if (typeof obj === 'object' || named === true) {
    return fmt.replace(/%\(\s*([^)]+)\s*\)s/g, function(m, v){
      return String(obj[v.trim()]);
    });
  } else {
    return fmt;
  }
};

/**
 * Returns the list of translations abide is currently configured to support.
 **/
exports.getLocales = function() {
  return Object.keys(translations);
};

/**
 * Returns a copy of the translated strings for the given language.
 **/
function getStrings(lang) {
  var locale = localeFrom(lang),
      strings = {};
  if (!translations[locale]) {
    return strings;
  }

  // Copy the translation pairs and return. We copy vs. simply returning
  // so we can maintain the translations internally, and count on them.
  // In order to get all strings (including those that exist in the default
  // lang but not a translation), we use the keys from the default lang.
  Object.keys(translations[default_locale]).forEach(function(key) {
    strings[key] = gettext(key, locale);
  });
  return strings;
};
exports.getStrings = getStrings;

/**
 * A route servers can use to expose strings for a given lang:
 *
 *   app.get( "/strings/:lang?", i18n.stringsRoute( "en-US" ) );
 */
exports.stringsRoute = function(defaultLang) {
  defaultLang = defaultLang || default_lang;
  return function(req, res) {
    res.jsonp( getStrings( req.params.lang || req.lang || defaultLang ) );
  };
};

/**
 * Middleware function for Express web apps, which deals with locales on
 * headers or URLs, and provides `gettext` and `format` to other middleware functions.
 */
exports.middleware = function(options) {
  options = options || {};
  options.supported_languages = options.supported_languages || ['en-US'];
  options.translation_directory = options.translation_directory || 'locale/';

  default_lang = options.default_lang || 'en-US';
  default_locale = localeFrom(default_lang);

  function messages_file_path(locale) {
    return path.resolve(path.join(__dirname, '..', '..', '..'),
                        options.translation_directory,
                        path.join(locale, 'messages.json'));
  }

  function parse_messages_file(locale) {
    return require(messages_file_path(locale));
  }

  options.supported_languages.forEach(function(lang) {
    var locale = localeFrom(lang);

    try {
      translations[locale] = parse_messages_file(locale);
    } catch (e) {
      var msg = util.format(
        'Bad locale=[%s] missing .json files in [%s]. See locale/README (%s)',
        locale, messages_file_path(locale), e
      );
      console.error(msg);
      throw msg;
    }
  });

  function checkUrlLocale(req) {
    // Given a URL, http://foo.com/ab/xyz/, we check to see if the first directory
    // is actually a locale we know about, and if so, we strip it out of the URL
    // (i.e., URL becomes http://foo.com/xyz/) and store that locale info on the
    // request's accept-header.
    var matches = req.url.match(/^\/([^\/]+)(\/|$)/);
    if (!(matches && matches[1])) {
      return;
    }

    // Look for a lang we know about, and if found, strip it off the URL so routes
    // continue to work. If we don't find it (i.e., comes back "unknown") then bail.
    // We do this so that we don't falsely consume more of the URL than we should
    // and stip things that aren't actually locales we know about.
    var lang = bestLanguage(parseAcceptLanguage(matches[1]),
                            options.supported_languages,
                            "unknown");
    if (lang === "unknown") {
      return;
    }

    req.url = req.url.replace(matches[0], '/');
    req.headers['accept-language'] = lang;
  }

  return function(req, resp, next) {
    checkUrlLocale(req);

    var langs = parseAcceptLanguage(req.headers['accept-language']),
        lang_dir,
        lang = bestLanguage(langs, options.supported_languages, default_lang),
        locale,
        locals = {},
        gt;

    locals.lang = lang;

    // BIDI support, which direction does text flow?
    lang_dir = BIDI_RTL_LANGS.indexOf(lang) >= 0 ? 'rtl' : 'ltr';
    locals.lang_dir = lang_dir;
    req.lang = lang;

    locale = localeFrom(lang);

    locals.locale = locale;
    req.locale = locale;

    var formatFnName = 'format';
    if (!! locals.format || !! req.format) {
      if (!! options.format_fn_name) {
        formatFnName = options.format_fn_name;
      } else {
        console.error("It appears you are using middleware which " +
          "already sets a variable 'format' on either the request " +
          "or reponse. Please use format_fn_name in options to " +
          "override this setting.");
        throw new Error("Bad Config - override format_fn_name");
      }

    }
    locals[formatFnName] = format;
    req[formatFnName] = format;

    locals.setLocale = function(assignedLocale) {
      if (translations[assignedLocale]) {
        locale = assignedLocale;

        var newLocals = {};

        newLocals.locale = assignedLocale;
        req.locale = assignedLocale;

        newLocals.lang = languageFrom(assignedLocale);
        req.lang = newLocals.lang;

        newLocals.lang_dir = BIDI_RTL_LANGS.indexOf(newLocals.lang) >= 0 ? 'rtl' : 'ltr';
        req.lang_dir = newLocals.lang_dir;

        resp.locals(newLocals);
      }
    };
    req.setLocale = locals.setLocale;

    if (translations[locale]) {
      gt = function(sid) {
        return gettext(sid, locale);
      };
    } else {
      // default lang in a non gettext environment... fake it
      gt = function(a) { return a; };
    }
    locals.gettext = gt;
    req.gettext = gt;

    // resp.locals(string, value) doesn't seem to work with EJS
    resp.locals(locals);

    next();
  };
};
