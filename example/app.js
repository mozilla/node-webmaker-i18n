var express = require('express'),
    i18n = require('../'),
    nunjucks = require('nunjucks'),
    path = require('path');

var app = express(),
    nunjucksEnv = new nunjucks.Environment( new nunjucks.FileSystemLoader( path.join( __dirname, 'views' )), {
      autoescape: true
    });

nunjucksEnv.addFilter("instantiate", function(input) {
    var tmpl = new nunjucks.Template(input);
    return tmpl.render(this.getVariables());
});
nunjucksEnv.express( app );

// Setup locales with i18n
app.use( i18n.middleware({
  supported_languages: [
    'en-US'
  ],
  default_lang: 'en-US',
  translation_directory: path.join( __dirname, 'locale' )
}));

app.use( "/bower", express.static( path.join(__dirname, 'bower_components' )));
app.get( "/strings/:lang?", function( req, res ) {
  return res.jsonp( i18n.getStrings( req.params.lang || req.lang || "en-US" ) );
});
app.get( "/", function( req, res ) {
  res.render( "index.html" );
});

app.listen(8000, function() {
  console.log("Server listening ( http://localhost:8000");
});
