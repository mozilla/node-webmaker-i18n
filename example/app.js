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

app.use( express.logger());

var supportedLanguages = ['en-US', 'en-CA'];
app.use( i18n.middleware({
  supported_languages: supportedLanguages,
  default_lang: 'en-US',
  warnings: true,
  translation_directory: path.join( __dirname, 'locale' ),
  mappings: {
    'en': 'en-CA'
  }
}));

app.use( "/bower", express.static( path.join(__dirname, 'bower_components' )));
app.get( "/strings/:lang?", i18n.stringsRoute() );
app.get( "/", function( req, res ) {
  res.render( "index.html" );
});

app.listen(8000, function() {
  console.log("Server listening - http://localhost:8000");
});
