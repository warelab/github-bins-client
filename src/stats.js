'use strict';

var _ = require('lodash');

function calcStats(array) {
  var result = _.reduce(array, function (total, item) {
    var count = item.results.count;

    total.count++;
    total.min = Math.min(total.min, count);
    total.max = Math.max(total.max, count);
    total.sum += count;
    total.sumSq += Math.pow(count, 2);

    return total;
  }, {count: 0, min: Infinity, max: 0, sum: 0, sumSq: 0});

  result.avg = result.sum / result.count;
  result.stdev = Math.sqrt((result.sumSq / result.count) - Math.pow(result.avg, 2));

  return result;
}

function globalStatistics(bins, genomes) {
  var anchoredBins, stats;

  stats = {};
  anchoredBins = _.filter(bins, function (bin) { return bin.region !== 'UNANCHORED' });

  stats.genomes = calcStats(genomes);
  stats.bins = calcStats(anchoredBins);

  return stats;
}

module.exports = {
  calcStats: calcStats,
  genomeStats: globalStatistics
};


