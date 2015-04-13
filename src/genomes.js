var _ = require('lodash');

function Genomes(rawData, binName, bins, getBinSizeForGenome) {
  this.binName = binName;
  this._bins = bins;
  this._genomes = refactorGenomes(rawData);

  if(getBinSizeForGenome) {
    this.getBinSizeForGenome = getBinSizeForGenome;
    this.mapGenomesToBins();
  }
}

Genomes.prototype.each = function(iteratee) {
  _.forOwn(this._genomes, iteratee, this);
};

Genomes.prototype.get = function(taxonId) {
  return this._genomes[taxonId];
};

Genomes.prototype.setResults = function(binnedResults) {
  checkResultsObject(binnedResults, this._bins.length, this.binName);

  var data = binnedResults.data;
  for(var i = 0; i < this._bins.length; i++) {
    var bin = this._bins[i];
    bin.results = data[bin.idx] || 0;
  }

  this.each(function(genome) {
    var gcount = _.reduce(genome.regions, function(gAcc, region) {
      var rcount = _.reduce(region.bins, function(rAcc, bin) {
        return rAcc + bin.results.count;
      }, 0);
      region.results = {count: rcount};
      return gAcc + rcount;
    }, 0);
    genome.results = {count: gcount};
  });

};

Genomes.prototype.clearResults = function() {
  for(var i = 0; i < bins.length; i++) {
    var bin = bins[i];
    delete bin.result;
  }
};

Genomes.prototype.mapGenomesToBins = function() {
  this.each(function(genome) {
    var tax = genome.taxon_id;
    var binSize = this.getBinSizeForGenome(genome);
    var genomeBinCount = 0;
    var bins = this._bins;
    genome.startBin = bins.length;
    _.forEach(genome.regions, function(region, rname) {
      var nbins = (rname === 'UNANCHORED') ? 1 : Math.ceil(region.size/binSize);
      region.startBin = bins.length;
      region.bins = [];
      for(var j=0; j < nbins; j++) {
        var idx = region.startBin + j;
        var start = j*binSize+1;
        var end = (j+1 === nbins) ? region.size : (j+1)*binSize;
        var bin = {taxon_id:tax, region:rname, start:start, end:end, idx:idx};
        bins.push(bin);
        region.bins.push(bin);
        ++genomeBinCount;
      }
    });
    genome.nbins = genomeBinCount;
  });
};

function checkResultsObject(binnedResults, binCount, binName) {
  var lastBin;

  if(!(binnedResults &&
    (typeof binnedResults === 'object') &&
    binnedResults.data &&
    binnedResults.displayName))
  {
    throw new Error('Please supply valid results parameter');
  }

  if(binnedResults.displayName && binnedResults.displayName !== binName) {
    throw new Error('Results are for ' + binnedResults.displayName + ' bins. Should be ' + binName);
  }

  lastBin = _.max(Object.keys(binnedResults.data), function(binId) {
    return +binId;
  });

  if(lastBin > binCount) {
    throw new Error('Bin count mismatch!');
  }
}

function refactorGenomes(rawData) {
  return _(rawData).map(function(d) {
    var regions = refactorMapRegions(d.regions);
    var result = {
      taxon_id: d.taxon_id,
      assembledGenomeSize: d.length, // does not include UNANCHORED region
      fullGenomeSize: _.reduce(regions, function(total, region) { return total + region.size}, 0),
      regions: regions
    };

    if(result.fullGenomeSize < result.assembledGenomeSize) {
      throw new Error(
        'inconsistencies in genome sizes! The assembled length of ' +
        d.taxon_id + '\'s genome (' + result.assembledGenomeSize +
        ') is longer than the sum of all regions of that genome (' +
        result.fullGenomeSize +')'
      );
    }
    return result;
  }).indexBy('taxon_id').value();
}

function refactorMapRegions(regions) {
  var indices = _.range(regions.names.length);
  var objArr = _.zip(regions.names, regions.lengths, indices).map(function(region) {
    return {
      name: region[0],
      size: region[1],
      idx: region[2]
    };
  });
  return _.indexBy(objArr, 'name');
}

module.exports = Genomes;