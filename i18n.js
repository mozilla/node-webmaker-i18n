/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var fs = require('fs'),
    languages = require("./languages.json"),
    _ = require("lodash"),
    momentLang = require("./momentLang"),
    path = require('path'),
    util = require('util');

var BIDI_RTL_LANGS = [ "ar", "ar_SA", "fa", "fa_IR", "he", "he_IL", "nqo", "ur", "ur_PK" ],
    translations = {},
    default_lang = 'en-US',
    default_locale = 'en_US',
    listSupportedLang,
    listOfLanguages,
    warnings;

/**
 * Perform a locale string lookup. The default behavious is to treat
 * any missing or empty locale string as a not-localised entry, and
 * will return the original key as being the localised target string.
 *
 * sid - The key used for the lookup
 * locale - The locale dictionary to look in
 * options - Optional object to control lookup behavior:
 *
 *   .strict - Empty locale strings count as genuine localisation,
 *             and missing locale strings will return an empty string
 *             rather than the original lookup key.
 */
function gettext(sid, locale, options) {
  options = options || {};

  var defaultLocaleTranslation = translations[default_locale][sid];
  // We are passing a locale that might not exist in the list of supported locales.
  // In case of an unknown locale we will default to default locale that we support.
  var localeTranslation = (translations[localeFrom(locale)] && translations[localeFrom(locale)][sid]) || defaultLocaleTranslation;

  if (localeTranslation) {
    if (options.strict? (typeof localeTranslation.message === "string") : !!localeTranslation.message) {
      return localeTranslation.message;
    }
    return localeTranslation;
  } else if (defaultLocaleTranslation) {
    if (options.strict? (typeof defaultLocaleTranslation.message === "string") : !!defaultLocaleTranslation.message) {
      return defaultLocaleTranslation.message
    }
    return defaultLocaleTranslation;
  }
  return options.strict? "" : sid;
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
 * Convert the given language name into Moment.js supported Language name
 *
 *   lang: 'en-US' return: 'en'
 *   lang: 'en-CA' return: 'en-ca'
 *   lang: 'th-TH' return: 'th'
 **/
function langToMomentJSLang(lang) {
  lang = lang.toLowerCase();
  var newLang = lang.substr(0,2);
  if (momentLang.map.indexOf(lang) !== -1) {
   return lang;
  } else if (momentLang.map.indexOf(newLang) !== -1) {
   return newLang;
  }
  return 'en';
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
  if (language.indexOf("-") === -1) {
    return language;
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
 * Given a locale, return native language name e.g. given "th-TH" will return "ภาษาไทย"
 **/
function languageNameFor(locale) {
  locale = languageFrom(locale);
  return languages[locale] ? languages[locale]["native"] : "Unknown";
}

/**
 * Given a locale, return English language name e.g. given "th-TH" will return "Thai"
 **/
function languageEnglishName(locale) {
  locale = languageFrom(locale);
  return languages[locale] ? languages[locale]["English"] : "Unknown";
}

/**
 * Given a locale code, return a language code
 **/
function languageFrom(locale) {
  if (!locale || !locale.split) {
    return "";
  }
  var parts = locale.split(/[-_]/);
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

function readLangDir(pathToDir, langList) {
  langList.forEach(function(lang, i) {
    var stat = fs.statSync(path.join(pathToDir, lang));
    if(!stat.isDirectory()) {
     langList = _.without(langList, lang);
    } else {
      langList[i] = languageFrom(lang);
    }
  });
  return langList;
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
 * Returns the list of locales that we support in an array format
 **/
exports.getLocales = function() {
  return Object.keys(translations);
};

/**
 * Returns the list of languages that we support in an array format
 **/
exports.getLanguages = function() {
  return listSupportedLang;
};

/**
* Returns the list of languages that we support in an array format based on the lang-Countries found in your locale dir
**/
exports.getSupportLanguages = function() {
  return listOfLanguages;
};

/**
* Given an object in this format { "en-US": { keys:values}, "th-TH": { keys:values} } will add them to an existing
* translations object which should allow dynamic translation object.
**/
exports.addLocaleObject = function(object, callback) {
  var errFlag, error;

  if(!listOfLanguages) {
    throw new Error("listOfLanguages is undefied - Please use addLocaleObject() after middleware() setup.");
  }
  listOfLanguages.forEach(function(locale) {
    var l = localeFrom(locale);
    try {
      _.extend(translations[l], object[locale]);
    } catch(e) {
      errFlag = true;
      error = e;
    }
  });

  if(!errFlag) {
    return callback(error);
  }
  callback();
};

/**
 * Returns a copy of the translated strings for the given language.
 **/
function getStrings(lang, options) {
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
    strings[key] = gettext(key, locale, options);
  });
  return strings;
}
exports.getStrings = getStrings;
exports.languageFrom = languageFrom;
exports.localeFrom = localeFrom;
exports.langToMomentJSLang = langToMomentJSLang;
exports.languageEnglishName = languageEnglishName;
exports.languageNameFor = languageNameFor;
exports.readLangDir = readLangDir;
exports.getAllLocaleCodes = function() { return languages; };
exports.getOtherLangPrefs = getOtherLangPrefs;
exports.getAlternateLangSupport = getAlternateLangSupport;
exports.gettext = gettext;

/**
 * A route servers can use to expose strings for a given lang:
 *
 *   app.get( "/strings/:lang?", i18n.stringsRoute( "en-US" ) );
 */
exports.stringsRoute = function(defaultLang, options) {
  defaultLang = defaultLang || default_lang;
  return function(req, res) {
    res.jsonp( getStrings( req.params.lang || req.localeInfo.lang || defaultLang, options ) );
  };
};

/**
 * A development route servers can use to expose strings for a given lang.
 * This route allows for a set of alternative path/files from which to load
 * locale data, and will load the data anew each time the function is called,
 * to allow a client-side reload to get updated string data.
 *
 *   app.get( "/strings/:lang?", i18n.devStringsRoute( "en-US", ["public/alt", ..., "extensions.json"] ) );
 */
exports.devStringsRoute = function(defaultLang, alternativePaths) {
  defaultLang = defaultLang || default_lang;

  // this is used as persistent data, so no modification after binding should be possible.
  alternativePaths = alternativePaths.slice();
  if (typeof alternativePaths === "string") {
    alternativePaths = [alternativePaths];
  }

  // this function will pack all the .json files we should load up into one jsonp response.
  return function(req, res) {
    var lang = req.params.lang || req.localeInfo.lang || defaultLang;

    var aggregate = {};
    alternativePaths.forEach(function(alternativePath) {
      // if .json, load that file. If not .json, treat as directory path
      // and find its locale/lang.json file entry for loading.
      var newpath = alternativePath;
      if(newpath.indexOf(".json") === -1) {
        newpath = path.join(newpath, "locale", lang + ".json");
      }
      var data = fs.readFileSync(newpath);
      try {
        var obj = JSON.parse(data);
        Object.keys(obj).forEach(function(key) {
          aggregate[key] = obj[key];
        });
      } catch (e) { console.error("could not parse data from ["+newpath+"] as JSON."); }
    });
    aggregate.__build__date__ = Date.now();

    res.jsonp( aggregate );
  };
};

// Given  [ { lang: 'th', quality: 1 }, { lang: 'en', quality: 0.8 }, { lang: 'es', quality: 0.6 } ]
// We will remove first element and return next preferred languages in array format ['en', 'es']
function getOtherLangPrefs(languages) {
  return languages.slice(1).map(function(item) { return item.lang; });
}

// Given user's otherLangPrefs ['th', 'en-CA', 'es', 'fr', 'ar'] we compare with our
// currentSupportLang ['en-US', 'en-CA', 'th'] and return match found.
// ['th', 'en-CA']
function getAlternateLangSupport(otherLangPrefs, currentSupportLang) {
  var support = [];
  otherLangPrefs.forEach(function(lang) {
    if(currentSupportLang.indexOf(lang) !== -1) {
      support.push(lang);
    }
  });
  return support;
}

/**
 * Middleware function for Express web apps, which deals with locales on
 * headers or URLs, and provides `gettext` and `format` to other middleware functions.
 */
exports.middleware = function(options) {
  if (!options) {
    throw new Error("No options passed in the middleware function. Please see the README for more info.");
  } else if (!options.translation_directory) {
    throw new Error("No path to translation_directory specified in the middleware function. Please see the README for more info.");
  } else if (!options.supported_languages) {
    throw new Error("No supported_languages option passed. Please see the README for more info.")
  }


  if (options.supported_languages && options.supported_languages.length) {
    listSupportedLang = options.supported_languages.slice(0);
    listOfLanguages = options.supported_languages;
  } else {
    throw new Error("Please check your supported_languages config.")
  }
  options.mappings = options.mappings || {};

  // Use the lang-Countries found in your locale dir without explicitly specifying them.
  if( listSupportedLang.length === 1 && listSupportedLang[0] === '*') {

    // Read the translation_directory and get all the language codes
    listSupportedLang = fs.readdirSync(options.translation_directory);

    // Read and process translation directory that was given and do some clean up.
    listSupportedLang = readLangDir(options.translation_directory, listSupportedLang);

    options.supported_languages = listSupportedLang.slice(0);
    listOfLanguages = options.supported_languages;
  }
  // If there is a '*' in the supported_languages field with some other languages.
  else if (listSupportedLang.indexOf('*') !== -1 && listSupportedLang.length !== 1) {
    throw new Error("Bad Config - Check your supported_languages field. Please see the README for more details.");
  }

  if (options.default_lang && listSupportedLang.indexOf(options.default_lang) === -1) {
    throw new Error("An unknown default_lang was passed. Please check your config or see the README for more details.")
  }
  default_lang = options.default_lang || "en-US";
  default_locale = localeFrom(default_lang);
  warnings = !!options.warnings;

  function messages_file_path(locale) {
    return path.resolve(path.join(__dirname, '..', '..', '..'),
                        options.translation_directory,
                        path.join(locale));
  }

  function parse_messages_file(locale) {
    var localePath = messages_file_path(locale),
        localeStrings = {};

    // Require all the files in locale directory for the given locale
    // and add them to a single object then return them.
    fs.readdirSync(localePath).forEach(function(fileName) {
      // Check if the file extension is .json
      if( !fileName.match(/\.json$/) || fileName.match(/^meta-/)) {
        return;
      }
      fullPath = path.join(localePath, fileName);
      try {
        strings = require(fullPath);
        _.extend(localeStrings, strings);
      } catch (e) {
        var msg = util.format(
          'Unknown file name for locale=[%s] in [%s]. See the error message: (%s)',
          locale, messages_file_path(locale), e
        );
        console.error(msg);
        return;
      }
    });
    return localeStrings;
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
      // Only console error if bad config then we remove them off from the list so
      // that we can continue with no problem.
      console.error(msg);
      listSupportedLang = _.remove(listSupportedLang, function(l) {
        return l !== locale;
      });
      options.supported_languages = _.remove(options.supported_languages, function(l) {
       return l !== locale;
     });
      return;
    }
  });

  // Set up dynamic mappings on top of supported languages
  Object.keys(options.mappings).forEach(function(dynamicLang) {
    var mapping = options.mappings[dynamicLang];
    var locale = localeFrom(mapping);
    if (!translations[locale]) {
      if (warnings) {
        console.error('Unknown language mapping [%s] -> [%s], skipping.', dynamicLang, mapping);
      }
      return;
    }
    translations[localeFrom(dynamicLang)] = translations[locale];
    // Extend the language name mappings too, in case we're missing a generic language name.
    languages[dynamicLang] = languages[dynamicLang] || languages[mapping];
    listSupportedLang.push(dynamicLang);
  });

  // We override the requested locale in a number of situations, and in the following order:
  // 1) If the user provides a locale we support as the first part of the URL, we override and use it
  // 2) If the user has a preferred locale set on their session (via cookie), we override use it
  function processLocaleOverrides(req) {
    // Given a URL, http://foo.com/ab/xyz/, we check to see if the first directory
    // is actually a locale we know about, and if so, we strip it out of the URL
    // (i.e., URL becomes http://foo.com/xyz/) and store that locale info on the
    // request's accept-header.
    var matches = req.url.match(/^\/([^\/]*)(\/|$)/);
    if (!matches) {
      return;
    }

    // Look for a lang we know about, and if found, strip it off the URL so routes
    // continue to work. If we don't find it (i.e., comes back "unknown") then bail.
    // We do this so that we don't falsely consume more of the URL than we should
    // and stip things that aren't actually locales we know about.
    var lang = bestLanguage(parseAcceptLanguage(matches[1]),
                            listSupportedLang,
                            "unknown");
    if (lang === "unknown") {
      // Check to see if we have a preferred locale in the user's session
      // (i.e., set via Login server in user's session cookie)
      if(req && req.session && req.session.user && req.session.user.prefLocale) {
        req.headers['accept-language'] = req.session.user.prefLocale;
      }
      return;
    }

    req.url = req.url.replace(matches[0], '/');
    req.headers['accept-language'] = lang;
  }

  // If the given lang is the lang in the mapping we will substitute that lang
  // to the lang name in which its pointing to
  // e.g.   mappings: { 'en': 'en-CA' } now 'en' will become 'en-CA'
  function substituteMapping(lang) {
    return options.mappings[lang] || lang;
  }

  return function(req, resp, next) {
    processLocaleOverrides(req);

    var langs = parseAcceptLanguage(req.headers['accept-language']),
        lang_dir,
        lang = bestLanguage(langs, listSupportedLang, default_lang),
        locale,
        localeInfo = {},
        locals = resp.locals,
        gt;

    lang = substituteMapping(languageFrom(lang));

    // BIDI support, which direction does text flow?
    lang_dir = BIDI_RTL_LANGS.indexOf(lang) >= 0 ? 'rtl' : 'ltr';

    locale = localeFrom(lang);

    // localeInfo object will contain all the necessary informations that we need
    // from the coming request and we will later attached that to the locals and req
    localeInfo.name = languageNameFor(lang);
    localeInfo.engName = languageEnglishName(lang);
    localeInfo.lang = languageFrom(lang);
    localeInfo.locale = locale;
    localeInfo.momentLang = langToMomentJSLang(lang);
    localeInfo.direction = lang_dir;
    localeInfo.otherLangPrefs = getOtherLangPrefs(langs);
    localeInfo.alternateLangs = getAlternateLangSupport(localeInfo.otherLangPrefs, listOfLanguages)

    locals.localeInfo = localeInfo;
    req.localeInfo = localeInfo;
    locals.languageEnglishName = languageEnglishName;
    locals.languageNameFor = languageNameFor;

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

    if (translations[locale]) {
      gt = function(sid) {
        return gettext(sid, locale, req.localeOptions);
      };
    } else {
      // default lang in a non gettext environment... fake it
      gt = function(a) { return a; };
    }
    locals.gettext = gt;
    req.gettext = gt;

    next();
  };
};
