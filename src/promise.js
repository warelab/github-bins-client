'use strict';

var grameneClient = require('gramene-search-client').client.grameneClient;
var Q = require('q');
var bins = require('./bins');

module.exports = {
  get: function (local) {
    var src;
    if(local) {
      src = Q(require('../spec/support/genomes'));
    }
    else {
      src = grameneClient.then(function(client) {
        var deferred, params;
        deferred = Q.defer();
        params = {rows: -1, type: "genome"};
        client['Data access'].maps(params, function(response) {
          response.client = client;
          deferred.resolve(response);
        });
        return deferred.promise;
      });
    }
    return src
      .then(justTheData)
      .then(binPromise);
  }
};

function justTheData(response) {
  return response.obj;
}

function binPromise(data) {
  return Q.fcall(bins, data);
}
