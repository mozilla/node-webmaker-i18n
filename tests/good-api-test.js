
var i18n = require("../");
var should = require('should'),
path = require("path"),
translationPath = path.join(__dirname, '../example/locale'),
middlewareOptions = {
  default_lang: 'en-US',
  supported_languages: ['en-US', 'en-CA'],
  translation_directory: translationPath,
  mappings: {
    'en': 'en-US'
  }
},
fs = require("fs");
var request = require('supertest'),
    express = require('express');

    var app = express();

describe("API Tests", function () {

  before(function (done) {
    app.use(i18n.middleware(middlewareOptions));

    app.get('/', function(req, res) {
      res.send(req.localeInfo);
    });

    app.get('/test', function(req, res) {
      res.send(req.localeInfo);
    });
    app.get('/css/file.css', function(req, res) {
      res.send(req.localeInfo);
    });
    app.get('/strings/en-US', i18n.stringsRoute());

    done();
  });

  describe('GET /strings/en-US', function(){
    it('should return object with status 200', function(done){
      request(app)
        .get('/strings/en-US')
        .set('Accept', 'application/json')
        .expect(function(res) {
          res.body.should.be.an.instanceOf(Object)
            .and.not.empty;
        })
        .expect(200, done);
    })
  })

  describe('GET /', function(){
    it('should return language en-US with status 200', function(done){
      request(app)
        .get('/')
        .set('Accept', 'application/json')
        .expect(function(res) {
          res.body.lang.should.eql("en-US");
        })
        .expect(200, done);
    })
  })

  describe('GET /en-US', function(){
    it('should return language en-US with status 200', function(done){
      request(app)
        .get('/en-US')
        .set('Accept', 'application/json')
        .expect(function(res) {
          res.body.lang.should.eql("en-US");
        })
        .expect(200, done);
    })
  })

  describe('GET /en-CA', function(){
    it('should return language en-CA with status 200', function(done){
      request(app)
        .get('/en-CA')
        .set('Accept', 'application/json')
        .expect(function(res) {
          res.body.lang.should.eql("en-CA");
        })
        .expect(200, done);
    })
  })

  describe('GET /en-CA/', function(){
    it('should return language en-CA with status 200', function(done){
      request(app)
        .get('/en-CA')
        .set('Accept', 'application/json')
        .expect(function(res) {
          res.body.lang.should.eql("en-CA");
        })
        .expect(200, done);
    })
  })

  describe('GET /test/', function(){
    it('should return language en-US with status 200', function(done){
      request(app)
        .get('/test/')
        .set('Accept', 'application/json')
        .expect(function(res) {
          res.body.lang.should.eql("en-US");
        })
        .expect(200, done);
    })
  })

  describe('GET /en-US/test/', function(){
    it('should return language en-US with status 200', function(done){
      request(app)
        .get('/en-US/test/')
        .set('Accept', 'application/json')
        .expect(function(res) {
          res.body.lang.should.eql("en-US");
        })
        .expect(200, done);
    })
  })

  describe('GET /en-CA/test/', function(){
    it('should return language en-CA with status 200', function(done){
      request(app)
        .get('/en-CA/test/')
        .set('Accept', 'application/json')
        .expect(function(res) {
          res.body.lang.should.eql("en-CA");
        })
        .expect(200, done);
    })
  })

  describe('GET /en-CA/test', function(){
    it('should return language en-CA with status 200', function(done){
      request(app)
        .get('/en-CA/test')
        .set('Accept', 'application/json')
        .expect(function(res) {
          res.body.lang.should.eql("en-CA");
        })
        .expect(200, done);
    })
  })

  describe('GET /css/file.css', function(){
    it('should return language en-US with status 200', function(done){
      request(app)
        .get('/css/file.css')
        .set('Accept', 'application/json')
        .expect(function(res) {
          res.body.lang.should.eql("en-US");
        })
        .expect(200, done);
    })
  })

  describe('GET /en-CA/css/file.css', function(){
    it('should return language en-US with status 200', function(done){
      request(app)
        .get('/en-CA/css/file.css')
        .set('Accept', 'application/json')
        .expect(function(res) {
          res.body.lang.should.eql("en-CA");
        })
        .expect(200, done);
    })
  })

  it("getStrings() should return translated object for the specified languages", function () {
    should(function () {
      i18n.getStrings('en-CA').should.be.an.instanceOf(Object)
        .and.not.empty;
    }).not.throw();
  });

  it("getLocales() should return list of locales in array format", function () {
    should(function () {
      i18n.getLocales().should.be.an.instanceOf(Array)
        .and.include('en_US', 'en')
        .and.not.include('en-US');
    }).not.throw();
  });

  it("getLanguages() should return list of languages in array format", function () {
    should(function () {
      i18n.getLanguages().should.be.an.instanceOf(Array)
        .and.include('en-US', 'en')
        .and.not.include('en_US');
    }).not.throw();
  });

  it("getSupportLanguages() should list of languages in an array format based on the lang-Countries", function () {
    should(function () {
      i18n.getSupportLanguages().should.be.an.instanceOf(Array)
        .and.include('en-US')
        .and.not.include('en');
    }).not.throw();
  });

  it("Named: format('%(a)s %(b)s', {a: 'Hello', b: 'World'}) without boolean set and should return 'Hello World'", function () {
    should(function () {
      i18n.format('%(a)s %(b)s', {
        a: 'Hello',
        b: 'World'
      })
        .should.eql("Hello World");
    }).not.throw();
  });

  it("Named: format('%(a)s %(b)s', {a: 'Hello', b: 'World'}, true) with boolean set and should return 'Hello World'", function () {
    should(function () {
      i18n.format('%(a)s %(b)s', {
        a: 'Hello',
        b: 'World'
      }, true)
        .should.eql("Hello World");
    }).not.throw();
  });

  it("Positional: format('%s %s', ['Hello', 'World']) should return 'Hello World'", function () {
    should(function () {
      i18n.format("%s %s", ["Hello", "World"])
        .should.eql("Hello World");
    }).not.throw();
  });

  it("languageFrom() should return language code en_US => en-US", function () {
    should(function () {
      i18n.languageFrom('en_US').should.eql('en-US');
    }).not.throw();
  });

  it("localeFrom() should return locale code en-US => en_US", function () {
    should(function () {
      i18n.localeFrom('en-US').should.eql('en_US');
    }).not.throw();
  });

  it("localeFrom() should return locale code en_US => en_US", function () {
    should(function () {
      i18n.localeFrom('en_US').should.eql('en_US');
    }).not.throw();
  });

  it("i18n.gettext('_Hello_World_', 'en_US') should return Hello World", function () {
    should(function () {
      i18n.gettext('_Hello_World_', 'en_US').should.eql('Hello World');
    }).not.throw();
  });

  it("i18n.gettext('_Hello_World_', 'en-US') should return Hello World", function () {
    should(function () {
      i18n.gettext('_Hello_World_', 'en-US').should.eql('Hello World');
    }).not.throw();
  });

  it("i18n.gettext('_Hello_', 'en-US') should return _Hello_", function () {
    should(function () {
      i18n.gettext('_Hello_', 'en-US').should.eql('_Hello_');
    }).not.throw();
  });

  it("languageNameFor('en-US') and languageNameFor('th') should return native language name", function () {
    should(function () {
      i18n.languageNameFor('en-US').should.eql('English (US)');
      i18n.languageNameFor('th').should.eql('ไทย');
    }).not.throw();
  });

  it("languageEnglishName('en-US') and languageEnglishName('th') should return English language name", function () {
    should(function () {
      i18n.languageEnglishName('en-US').should.eql('English (US)');
      i18n.languageEnglishName('th').should.eql('Thai');
    }).not.throw();
  });

  it("langToMomentJSLang('en-US') and langToMomentJSLang('th-TH') should return moment language code 'en-US' => 'en'", function () {
    should(function () {
      i18n.langToMomentJSLang('en-US').should.eql('en');
      i18n.langToMomentJSLang('th-TH').should.eql('th');
    }).not.throw();
  });

  it("addLocaleObject({ 'en-US': { keys:'somevalue'}}, cb)", function () {
    should(function () {
      i18n.addLocaleObject({'en-US': { "myName": "Ali Al Dallal"}}, function(err, res) {
        if(res) {
          i18n.getStrings("en-US").should.have.property('myName');
        }
      });
    }).not.throw();
  });

  it("getOtherLangPrefs([ { lang: 'th', quality: 1 }, { lang: 'en', quality: 0.8 }, { lang: 'es', quality: 0.6 } ]) should return ['en', 'es']", function () {
    should(function () {
      i18n.getOtherLangPrefs([ { lang: 'th', quality: 1 }, { lang: 'en', quality: 0.8 }, { lang: 'es', quality: 0.6 } ]).should.eql(['en', 'es']);
    }).not.throw();
  });

  it("getAlternateLangSupport(['th', 'en-CA', 'es', 'fr', 'ar'], ['en-US', 'en-CA', 'th']) should return ['th', 'en-CA']", function () {
    should(function () {
      i18n.getAlternateLangSupport(['th', 'en-CA', 'es', 'fr', 'ar'], ['en-US', 'en-CA', 'th']).should.eql(['th', 'en-CA']);
    }).not.throw();
  });

  it("getAllLocaleCodes() should return object list of all known locales", function () {
    should(function () {
      i18n.getAllLocaleCodes().should.be.an.instanceof(Object).and.not.empty;
    }).not.throw();
  });

  it("readLangDir(pathToDir, langList) should return a clean list of supported_languages", function () {
    should(function () {
      var list = ['en_US', 'en_CA', '.DS_Store'];
      var pathToDir = path.join(__dirname, "../example/locale");
      var pathToDsStore = path.join(pathToDir, '.DS_Store');
      fs.writeFile(pathToDsStore, "something", 'utf-8', function () {
        list = i18n.readLangDir(pathToDir, list);
        list.should.eql(['en-US', 'en-CA']);
        fs.unlinkSync(pathToDsStore);
      });
    }).not.throw();
  });

  // strict vs. non-strict testing
  (function() {
    var sid = "key/with/empty/string";

    it("i18n.gettext('"+sid+"', 'en_US' ) should return '"+sid+"'", function () {
      should(function () {
        i18n.gettext(sid, 'en_US').should.eql(sid);
      }).not.throw();
    });

    it("i18n.gettext('"+sid+"', 'en_US', { strict: true }) should return an empty string", function () {
      should(function () {
        i18n.gettext(sid, 'en_US', { strict: true }).should.eql("");
      }).not.throw();
    });
  }());

});
