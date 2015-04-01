var axios = require('axios');
var Q = require('q');
var bins = require('./bins');

module.exports = {
  get: function () {
    return axios.get('http://data.gramene.org/maps/select?type=genome')
      .then(justTheData)
      .then(binPromise)
  }
};

function justTheData(json) {
  return Q(json.response);
}

function binPromise(data) {
  return Q.fcall(bins, data);
}
