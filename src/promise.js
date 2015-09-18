var axios = require('axios');
var Q = require('q');
var bins = require('./bins');

module.exports = {
  get: function (local) {
    var src;
    if(local) {
      src = Q(require('../spec/support/genomes'));
    }
    else {
      src = axios.get('http://data.gramene.org/maps?type=genome&rows=-1');
    }
    return src
      .then(justTheData)
      .then(binPromise);
  }
};

function justTheData(json) {
  return Q(json.data.response);
}

function binPromise(data) {
  return Q.fcall(bins, data);
}
