node-webmaker-i18n
==================

Webmaker Localization Components for node.js and the browser.

This code is heavily inspired by, and borrows from, [Mozilla's i18n-abide](https://github.com/mozilla/i18n-abide) project.
However, this code has been stripped down to support only those things needed by the Webmaker tools and apps, and is based on
JSON instead of PO files, uses a different form of client-side localization, etc.

# Usage

## Server-Side with node.js

Install the node.js module using npm:

```
$ npm install webmaker-i18n
```

The module exposes a number of useful functions, including:

### middleware

The `middleware` function is used with Express. It should be placed early on in the order of your middleware
functions, such that it can detect and process any extra langauge (i.e., language codes on the URL or
accept-language header. You use it like so:

```javascript
var i18n = require('webmaker-i18n');
...
app.use(i18n.middleware({
  supported_languages: [
    'en-US', 'th-TH', 'ru'
  ],
  default_lang: 'en-US',
});
```

This will cause the app to look for three locales on startup:

* `locale/en_US`
* `locale/th_TH`
* `locale/ru`

You can change the root locale directory by passing `translation_directory` with another path to the
`middleware` function (`locale/` is the default).  Notice how the language tags have been converted
to locale names (i.e., en-US becomes en_US). Each locale directory must have one file named `messages.json`
which contains the strings for the locale.

One other option that you can pass to the `middleware` function is `locale_on_url` (true by default).
This determines whether to allow and process langauge tags on the URL. If true,
the list of `supported_languages` will be used to check URLs, and any containing a known langauge
will get processed. For example: `/en-US/foo` would be come `/foo` and the language set to `en-US`.

When `middleware` is used, all subsequent middleware and routes will have `req` and `res` objects
with additional features. These include:

* `gettext` - a function used to get a localized string for a given key
* `format` - a function used to interpolate strings (see below)
* `lang` - the language being used (e.g., 'en-US')
* `lang_dir` - the language direction (e.g., 'rtl' or 'ltr')
* `setLocale` a function that can be used to swap locales after the `middleware` has set it automatically

### getStrings

The `getStrings` function is used to get an object containing all strings for a given language. This
will include any strings missing from the given langauge, which are present in the default language.

```javascript
var ru = i18n.getStrings('ru');
```

### getLocales

The `getLocales` function is used to get a list (array) of supported locale names, and matches the
names of the folders that should be present in the `locale/` translation directory.

```javascript
var locales = i18n.getLocales();
```

### format

The `format` function provides string interpolation, and can be used with either an object for
named variables, or an array  of values for positional replacement.

```javascript
// Named Example:
i18n.format("%(salutation)s %(place)s", {salutation: "Hello", place: "World"}, true);

// Positional Example:
i18n.format("%s %s", ["Hello", "World"]);
```

### langaugeFrom, localeFrom

The `languageFrom` and `localeFrom` functions convert languages to locales and vice versa.

```javascript
// en-US (language) to en_US (locale)
var enUSlocale = fromLanguage('en-US');

// en_US (locale) to en-US language)
var enUSlanguage = fromLocale('en_US');
```

## Client-Side in the browser

Install the browser `localized.js` script using bower:

```
$ bower install webmaker-i18n...
```

