var _ = require('lodash');

function Genomes(rawData, binName, bins, getBinSizeForGenome) {
  this._genomes = createGenomeObjects(rawData);

  this.binName = binName;
  this._bins = bins;

  if(getBinSizeForGenome) {
    mapGenomesToBins(this, getBinSizeForGenome);
  }
}

Genomes.prototype.each = function(iteratee) {
  _.forOwn(this._genomes, iteratee, this);
};

Genomes.prototype.reduce = function(reducer, initialValue) {
  return _.reduce(this._genomes, reducer, initialValue);
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

  this.each(updateGenomeResults);
};

Genomes.prototype.clearResults = function() {
  for(var i = 0; i < bins.length; i++) {
    var bin = bins[i];
    delete bin.result;
  }
};

function mapGenomesToBins(genomes, getBinSizeForGenome) {
  genomes.each(function(genome) {
    var tax = genome.taxon_id;
    var binSize = getBinSizeForGenome(genome);
    var genomeBinCount = 0;
    genome.startBin = bins.length;
    genome.eachRegion(function(region, rname) {
      var nbins = (rname === 'UNANCHORED') ? 1 : Math.ceil(region.size/binSize);
      region.startBin = bins.length;
      for(var j=0; j < nbins; j++) {
        var idx = region.startBin + j;
        var start = j*binSize+1;
        var end = (j+1 === nbins) ? region.size : (j+1)*binSize;
        var bin = {taxon_id:tax, region:rname, start:start, end:end, idx:idx};
        addBin(bin, genome, region);
        ++genomeBinCount;
      }
    });
    genome.nbins = genomeBinCount;
  });
}

function addBin(bin, genome, region) {
  genome._bins.push(bin);
  region._bins.push(bin);
}

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

function createGenomeObjects(rawData) {
  return _(rawData).map(function(d) {
    return new Genome({
      taxon_id: d.taxon_id,
      assembledGenomeSize: d.length,
      regions: d.regions
    });
  }).indexBy('taxon_id').value();
}

function Genome(params) {
  this._regions = refactorMapRegions(params.regions);
  this.taxon_id = params.taxon_id;
  this.assembledGenomeSize = params.assembledGenomeSize;

  // the above does not include UNANCHORED region. Let's include that here:
  this.fullGenomeSize = this.reduceRegions(function(total, region) { return total + region.size}, 0);

  if(this.fullGenomeSize < this.assembledGenomeSize) {
    throw new Error(
      'inconsistencies in genome sizes! The assembled length of ' +
      this.taxon_id + '\'s genome (' + this.assembledGenomeSize +
      ') is longer than the sum of all regions of that genome (' +
      this.fullGenomeSize +')'
    );
  }
}

Genome.prototype.regionCount = function() {
  return _.size(this._regions);
};

Genome.prototype.region = function(name) {
  return this._regions[name];
};

Genome.prototype.eachRegion = function(iteratee) {
  _.forOwn(this._regions, iteratee, this);
};

Genome.prototype.reduceRegions = function(reducer, initialValue) {
  return _.reduce(this._regions, reducer, initialValue);
};

function updateGenomeResults(genome) {
  var gcount = genome.reduceRegions(function(acc, region) {
    var regionResults = updateRegionResults(region);
    return acc + regionResults.count;
  }, 0);
  genome.results = {count: gcount};
  return genome.results;
}

function refactorMapRegions(regions) {
  if(!regions) {
    console.log('No regions. I hope we are testing');
    return {};
  }
  if(regions.lengths && regions.names) {
    var indices = _.range(regions.names.length);
    var regionArray = _.zip(regions.names, regions.lengths, indices).map(function (region) {
      return new Region({
        name: region[0],
        size: region[1],
        idx: region[2]
      });
    });
    return _.indexBy(regionArray, 'name');
  }
  else {
    return regions;
  }
}

// REGION
function Region(params) {
  this.name = params.name;
  this.size = params.size;
  this.idx = params.idx;
  this._bins = [];
}

function updateRegionResults(region) {
  var count = region.reduceBins(function(acc, bin) {
    return acc + bin.results.count;
  }, 0);

  region.results = { count: count };
  return region.results;
}

Region.prototype.eachBin = function(iteratee) {
  _.forEach(this._bins, iteratee);
};

Region.prototype.reduceBins = function(reducer, initialValue) {
  return _.reduce(this._bins, reducer, initialValue);
};

// EXPORTS
Genome.Region = Region;
Genomes.Genome = Genome;

module.exports = Genomes;
