var pixie = require('../');
var koa = require('koa');
var supertest = require('supertest');
var assert = require('assert');
var http = require('http');
var router = require('koa-router');
var body = require('koa-body');

function getRandomPort() {
  return Math.ceil(Math.random() * 5000 + 5000);
}

function makeTestServer() {
  var app = koa();

  app.use(body());
  app.use(router(app));
  app.get('/hurp', function* (){
    this.body = {hurp: 'durp'}
  });
  app.post('/hurp', function* () {
    this.set('x-some-dumb-header', 'Im-set-yo');
    this.body = this.request.body;
  });
  return http.createServer(app.callback())
}

describe('pixie-proxy', function() {
  it('proxies GET requests', function(done) {
    // test server to hit with our requests
    var testServer = makeTestServer();
    var PORT = getRandomPort();
    testServer.listen(PORT, function() {

      var app = koa();
      app.use(router(app));

      var proxy = pixie({host: 'http://localhost:' + PORT});

      app.get('/foo', proxy('/hurp'));
      supertest(http.createServer(app.callback()))
        .get('/foo')
        .expect(200)
        .end(function(err, res) {
          assert.ifError(err);
          assert.deepEqual(res.body, {hurp:'durp'});
          testServer.close();
          done();
        });
    });
  });

  it('proxies POST requests', function(done) {
    var testServer = makeTestServer();
    var PORT = getRandomPort();
    testServer.listen(PORT, function() {

      var app = koa();
      app.use(body());
      app.use(router(app));

      var proxy = pixie({host: 'http://localhost:' + PORT});
      var postBody = {bestHobbit: 'Yolo Swaggins'};

      app.post('/foo', proxy('/hurp'));
      supertest(http.createServer(app.callback()))
        .post('/foo')
        .send(postBody)
        .expect(200)
        .end(function(err, res) {
          assert.ifError(err);
          assert.deepEqual(res.body, postBody);
          assert.equal(res.headers['x-some-dumb-header'], 'Im-set-yo');
          testServer.close();
          done();
        });
    });
  });
});
