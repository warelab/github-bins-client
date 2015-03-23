var axios = require('axios');
var Q = require('q');
var genomeFixture = require('../support/genomes');

describe('LatestGenome', function() {

  var binPromiser, expectedResult;

  beforeEach(function() {
    binPromiser = require('../../src/promise');
    expectedResult = Q(genomeFixture);

    spyOn(axios, 'get').andReturn(expectedResult);
  });

  it('should request data from http://data.gramene.org/maps/select?type=genome', function() {
    // when
    binPromiser.get();

    // then
    expect(axios.get.mostRecentCall.args[0]).toEqual('http://data.gramene.org/maps/select?type=genome');
  });

  it('should return a bin generator', function() {
    // when
    var result = binPromiser.get();
    var iWasCalled = false;

    function testResult(binGenerator) {
      // then
      expect(typeof binGenerator).toEqual('function');
      expect(binGenerator.binMapper).toBeDefined();
      expect(typeof binGenerator.binMapper).toEqual('function');

      return binGenerator;
    }

    function doesItAppearToWork(binGenerator) {
      var bins = binGenerator.binMapper('fixed', 200);
      iWasCalled = true;
      expect(bins).toBeDefined();
      expect(bins.bin2pos).toBeDefined();
      expect(bins.pos2bin).toBeDefined();
      expect(typeof bins.bin2pos).toEqual('function');
      expect(typeof bins.pos2bin).toEqual('function');
      expect(bins.bin2pos(0)).toBeDefined();
    }

    function testError(error) {
      expect(error).toBeUndefined();
    }

    function ensureTestResultCalled() {
      expect(iWasCalled).toEqual(true);
    }

    result.then(testResult)
      .then(doesItAppearToWork)
      .then(ensureTestResultCalled)
      .catch(testError);
  });
});