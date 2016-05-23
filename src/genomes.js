'use strict';

var _ = require('lodash');
var genomeStats = require('./stats').genomeStats;
var setResultsCount = 0;

function Genomes(rawData, binName, bins, getBinSizeForGenome) {
  this._genomesArray = createGenomeObjects(rawData);
  this._genomesLUT = _.indexBy(this._genomesArray, 'taxon_id');

  this.binName = binName;
  this._bins = bins;

  if(getBinSizeForGenome) {
    mapGenomesToBins(this, getBinSizeForGenome);
  }
}

Genomes.prototype.binCount = function() {
  return this._bins.length;
};

Genomes.prototype.getBin = function(idx) {
  checkIdx(idx, this._bins);
  return this._bins[idx];
};

Genomes.prototype.getBins = function(startIdx, endIdx) {
  checkIdx(startIdx, this._bins);
  checkIdx(endIdx, this._bins);

  if(startIdx > endIdx) {
    throw new Error("Start index is after end index.");
  }
  return _.slice(this._bins, startIdx, endIdx + 1);
};

Genomes.prototype.allBins = function() {
  return _.clone(this._bins);
};

function checkIdx(idx, bins) {
  if( !_.isFinite(idx) ) {
    throw new Error("Supplied index not a finite number.");
  }
  if(idx < 0 || idx > bins.length - 1) {
    throw new Error("Supplied index out of range.");
  }
}

Genomes.prototype.each = function(iteratee) {
  _.forEach(this._genomesArray, function(region) {
    iteratee(region, region.name);
  }, this);
  //_.forOwn(this._genomesLUT, iteratee, this);
};

Genomes.prototype.reduce = function(reducer, initialValue) {
  return _.reduce(this._genomesLUT, reducer, initialValue);
};

Genomes.prototype.get = function(taxonId) {
  return this._genomesLUT[taxonId];
};

Genomes.prototype.setResults = function(binnedResults) {
  checkResultsObject(binnedResults, this._bins.length, this.binName);

  var data = binnedResults.data;
  for(var i = 0; i < this._bins.length; i++) {
    var bin = this._bins[i];

    bin.results = data[bin.idx] || {count: 0};
  }

  this.results = this.reduce(function(acc, genome) {
    updateGenomeResults(genome);
    acc.count += genome.results.count;
    acc.bins += genome.results.bins;
    return acc;
  }, {count: 0, bins: 0});

  ++setResultsCount;
  
  this.stats = genomeStats(this._bins, this._genomesArray, setResultsCount);
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
    genome.startBin = genomes.binCount();
    genome.eachRegion(function(region, rname) {
      var nbins = (rname === 'UNANCHORED') ? 1 : Math.ceil(region.size/binSize);
      region.startBin = genomes.binCount();
      for(var j=0; j < nbins; j++) {
        var idx = region.startBin + j;
        var start = j*binSize+1;
        var end = (j+1 === nbins) ? region.size : (j+1)*binSize;
        var bin = {taxon_id:tax, region:rname, start:start, end:end, idx:idx};
        addBin(bin, genomes, region);
        ++genomeBinCount;
      }
    });
    genome.nbins = genomeBinCount;
  });
}

function addBin(bin, genomes, region) {
  genomes._bins.push(bin);
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
      system_name: d.system_name,
      assembledGenomeSize: d.length,
      regions: d.regions
    });
  }).sortBy('taxon_id').value();
}

function Genome(params) {
  this._regionsArray = refactorMapRegions(params.regions);
  this._regionsLUT = _.indexBy(this._regionsArray, 'name');
  this.taxon_id = params.taxon_id;
  this.assembledGenomeSize = params.assembledGenomeSize;
  this.system_name = params.system_name;

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
  return _.size(this._regionsLUT);
};

Genome.prototype.region = function(name) {
  return this._regionsLUT[name];
};

Genome.prototype.eachRegion = function(iteratee) {
  _.forEach(this._regionsArray, function(region) {
    iteratee(region, region.name);
  }, this);
};

Genome.prototype.mapRegions = function(iteratee) {
  return _.map(this._regionsArray, iteratee, this);
};

Genome.prototype.reduceRegions = function(reducer, initialValue) {
  return _.reduce(this._regionsArray, reducer, initialValue);
};

function updateGenomeResults(genome) {
  genome.results  = genome.reduceRegions(function(acc, region) {
    updateRegionResults(region);
    acc.count += region.results.count;
    acc.bins += region.results.bins;
    return acc;
  }, {count: 0, bins: 0});
}

function refactorMapRegions(regions) {
  var regionArray, rname, indices;
  if(!regions) {
    console.log('No regions. I hope we are testing');
    return {};
  }
  if(regions.lengths && regions.names) {
    indices = _.range(regions.names.length);
    regionArray = _.zip(regions.names, regions.lengths, indices).map(function (region) {
      return new Region({
        name: region[0],
        size: region[1],
        idx: region[2]
      });
    });
    return regionArray;
  }
  else {
    throw new Error("regions must have lengths and names defined");
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
  region.results = region.reduceBins(function(acc, bin) {
    if(bin.results && bin.results.count) {
      acc.count += bin.results.count;
      acc.bins++;
    }
    return acc;
  }, {count: 0, bins: 0});
}

Region.prototype.firstBin = function() {
  return this.binCount() ? this._bins[0] : undefined;
};

Region.prototype.eachBin = function(iteratee) {
  _.forEach(this._bins, iteratee);
};

Region.prototype.mapBins = function(iteratee) {
  return _.map(this._bins, iteratee);
};

Region.prototype.bin = function(idx) {
  return this._bins[idx];
};

Region.prototype.binCount = function() {
  return this._bins.length;
};

Region.prototype.reduceBins = function(reducer, initialValue) {
  return _.reduce(this._bins, reducer, initialValue);
};

// EXPORTS
Genome.Region = Region;
Genomes.Genome = Genome;

module.exports = Genomes;
