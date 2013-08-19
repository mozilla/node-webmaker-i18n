(function(global, factory) {
  // AMD. Register as an anonymous module.
  if (typeof define === 'function' && define.amd) {
    define(factory);
  }
  // Expose a global instead
  else {
    global.Localized = factory();
  }
}(this, function() {

  var _strings,
      _readyCallbacks = [],
      _requestedStrings = false;

  function fireReadyCallbacks() {
    // Fire all ready callbacks we have queued up.
    while(_readyCallbacks.length) {
      (_readyCallbacks.pop())();
    }
  }

  function ready(data) {
    function domReady() {
      // If the DOM isn't ready yet, repeat when it is
      if ( document.readyState !== "complete" ) {
        document.onreadystatechange = domReady;
        return;
      }
      document.onreadystatechange = null;
      _strings = data;

      fireReadyCallbacks();
    }

    domReady();
  }

  // Get the current lang from the document's HTML element, which the
  // server set when the page was first rendered. This saves us having
  // to pass extra locale info around on the URL.
  function getCurrentLang() {
    var html = document.querySelector( "html" );
    return html && html.lang ? html.lang : "en-US";
  }

  return {
    /**
     * gets the localized string for a given key
     */
    get: function(key) {
      if ( !_strings ) {
        console.error( "[goggles.webmaker.org] Error: string catalog not found." );
        return "";
      }
      return ( _strings[ key ] || "" );
    },

    /**
     * gets the current lang used for the given page, or en-US by default.
     */
    getCurrentLang: getCurrentLang,

    /**
     * initializes the strings locally (i.e., downloads if not already downloaded) and
     * queues a callback to be fired when the DOM + strings are ready. It is safe to
     * call ready() multiple times. For cache busting, pass noCache=true on the options arg.
     */
    ready: function(callback, options) {
      options = options || {};
      var noCache = !!options.noCache,
          url = options.url || '/strings/';
      url = url.replace(/^\/?/, '/').replace(/\/?$/, '/');
      url = url + getCurrentLang();
      url = url + (noCache ? '?bust=' + Date.now() : '');

      if (!_requestedStrings) {
        _requestedStrings = true;
        _readyCallbacks.push(calback);

        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onreadystatechange = function(){
          if (this.readyState !== 4) {
            return;
          }

          if (xhr.status !== 200) {
            console.error("Localized Error: HTTP error " + xhr.status);
            return;
          }

          try {
            ready(JSON.parse(this.responseText));
          } catch (err) {
            console.error("Localized Error: " + err);
          }
        };
        xhr.send(null);
      }

      if (this.isReady()) {
        fireReadyCallbacks();
      }
    },

    /**
     * returns true if the localized strings have been loaded and can be used.
     */
    isReady: function() {
      return !!_strings;
    }
  };
}));
