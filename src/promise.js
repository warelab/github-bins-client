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
      src = axios.get('http://devdata.gramene.org/maps?rows=-1');
    }
    return src
      .then(justTheData)
      .then(binPromise);
  }
};

function justTheData(response) {
  return response.data;
}

function binPromise(data) {
  return Q.fcall(bins, data);
}
