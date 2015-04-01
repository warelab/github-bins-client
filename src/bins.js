'use strict';

/*
  bins - a module for bins defined on an ordered set of maps
         such as the genomes in Gramene.

  Bin numbers are global so they can uniquely identify an interval
  on a chromosome (aka. region). This is why the maps and regions need to be ordered.

  Once the maps have been loaded, you can get a binMapper for a set of bins.

  The bins can be defined as follows:
      a bin size for uniform-width bins in nucleotides
      an arbitrary set of intervals {taxon_id: , region: , start: , end: }

  bins = require('bins.js')(map_info);
  mapper_2Mb = bins.binMapper('uniform',2000000);
  bin = mapper_2Mb.pos2bin(taxon_id, region, position); // returns -1 for positions not in a bin
  interval = mapper_2Mb.bin2pos(bin); // returns an interval that contains position
*/

var isNumber = require('is-number');
var _ = require('lodash');

module.exports = function(RAW_GENOME_DATA) {

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

  // generate new genome data structure from (immutable) raw data
  function genomesMap() {
    return _(RAW_GENOME_DATA).map(function(d) {
      return {
        taxon_id: d.taxon_id,
        assembledGenomeSize: d.length, // does not include UNANCHORED region
        regions: refactorMapRegions(d.regions)
      };
    }).indexBy('taxon_id').value();
  }

  function bins(getBinSizeForGenome) {
    var bins = [];
    var genomeMaps = genomesMap();

    _.forEach(genomeMaps, function(map) {
      var tax = map.taxon_id;
      var binSize = getBinSizeForGenome(map);
      _.forEach(map.regions, function(region, rname) {
        var nbins = (rname === 'UNANCHORED') ? 1 : Math.ceil(region.size/binSize);
        region.startBin = bins.length;
        region.bins = [];
        for(var j=0; j < nbins; j++) {
          var idx = region.startBin + j;
          var start = j*binSize+1;
          var end = (j+1 === nbins) ? region.size : (j+1)*binSize;
          bins.push({taxon_id:tax, assembly:map, region:region, start:start, end:end});
          region.bins.push({start:start, end:end, idx:idx});
        }
      });
    });

    return {
      binnedGenomes: function() { return genomeMaps; },
      bin2pos: function(bin) {
        if (bin < 0 || bin >= bins.length) {
          throw 'bin ' + bin + ' out of range';
        }
        return bins[bin];
      },
      pos2bin: function(tax, region, position) {
        if (!genomeMaps.hasOwnProperty(tax)) {
          throw tax + ' not a known taxonomy id';
        }
        var map = genomeMaps[tax];
        var binSize = getBinSizeForGenome(map);
        var posBin = map.regions;
        if (region === 'UNANCHORED' || !posBin.hasOwnProperty(region)) {
          // assume UNANCHORED
          if (!posBin.hasOwnProperty('UNANCHORED')) {
            throw region + ' not a known seq region';
          }
          return posBin['UNANCHORED'].startBin;
        }
        if (position < 1 || position >= posBin[region].size) {
          throw 'position ' + position + ' out of range';
        }
        return posBin[region].startBin + Math.floor((position-1)/binSize);
      },
      nbins: bins.length
    };
  }

  function variableBins(bins) {
    // sort the bins to match the order given in the maps
    var mapsObj = genomesMap();

    // NB THIS FOREACH FUNCTION IS MODIFYING THE BIN OBJECTS
    // PASSED IN.
    bins.map(function(bin) {
      bin.assembly = mapsObj[bin.taxon_id];
      bin.region = bin.assembly.regions[bin.region];
      return bin;
    }).sort(function(a,b) {
      // check species
      if (a.taxon_id > b.taxon_id) {
        return 1;
      }
      if (a.taxon_id < b.taxon_id) {
        return -1;
      }

      // same species, check index of region
      if (a.region.idx > b.region.idx) {
        return 1;
      }
      if (a.region.idx < b.region.idx) {
        return -1;
      }

      // same region,  check for overlap and compare bin start positions
      if (a.start > b.start) {
        if(a.start <= b.end) {
          throw new Error('overlapping bins found: ' + JSON.stringify(a) + ' and ' + JSON.stringify(b));
        }
        return 1;
      }
      if (a.start < b.start) {
        if(a.end >= b.start) {
          throw new Error('overlapping bins found: ' + JSON.stringify(a) + ' and ' + JSON.stringify(b));
        }
        return -1;
      }
      throw new Error('found two apparently identical bins: ' + JSON.stringify(a) + ' and ' + JSON.stringify(b));
    });

    var binPos = bins;
    var posBin = {};
    for(var i=0;i<binPos.length;i++) {
      var bin = binPos[i];
      var regionName = bin.region.name;
      if (! posBin.hasOwnProperty(bin.taxon_id)) {
        posBin[bin.taxon_id] = {};
      }
      if (! posBin[bin.taxon_id].hasOwnProperty(regionName)) {
        posBin[bin.taxon_id][regionName] = {o:i,bins:[]};
      }
      posBin[bin.taxon_id][regionName].bins.push(bin.start,bin.end);
    }

    return {
      bin2pos: function(bin) {
        if (bin < 0 || bin >= binPos.length) {
          throw 'bin ' + bin + ' out of range';
        }
        return binPos[bin];
      },
      pos2bin: function(tax, region, position) {
        if (!(posBin.hasOwnProperty(tax) && posBin[tax].hasOwnProperty(region))) {
          return -1; // no bins here
        }
        var rbins = posBin[tax][region].bins;
        // binary search in rbins for position
        var a = 0;
        var b = rbins.length-1;
        if (position < rbins[a] || position > rbins[b] || !isNumber(position)) { // possibly invalid position that doesn't fall into any bins
          return -1;
        }
        while (a<b) {
          // assume uniform bin distribution and guess a bin
          var f = Math.floor((b - a)*(position - rbins[a])/(rbins[b] - rbins[a]));
          if (f<0) return -1;
          if (f>a && f%2==1) f--;
          if (position < rbins[f]) {
            b = f-1;
          }
          else if (position > rbins[f+1]) {
            a = f+2;
          }
          else {
            return posBin[tax][region].o + f/2;
          }
        }
        return -1;
      },
      nbins: binPos.length
    };
  }

  return {
    uniformBinMapper: function(binWidth) {
      return bins(function getGlobalBinWidth() {
        return binWidth;
      })
    },
    fixedBinMapper: function(binsPerGenome) {
      return bins(function determineBinWidthForGenome(genome) {
        if (genome.assembledGenomeSize === 0) return 0;

        var binSize = Math.floor(genome.assembledGenomeSize / binsPerGenome);

        function countBins(binSize) {
          var nbins = 0;
          for(var region in genome.regions) {
            if (region === 'UNANCHORED') {
              nbins++
            }
            else {
              nbins += Math.ceil(genome.regions[region].size / binSize);
            }
          }
          return nbins;
        }

        var nbins = countBins(binSize);
        if (nbins > binsPerGenome) {
          var a = Math.floor(genome.assembledGenomeSize / (binsPerGenome - _.size(genome.regions)));
          var b = binSize;
          while (countBins(a) != binsPerGenome) {
            var m = Math.floor((a+b)/2);
            var mbins = countBins(m);
            if (mbins <= binsPerGenome) {
              a = m;
            }
            else if (mbins > binsPerGenome) {
              b = m;
            }
          }
          binSize = a;
        }
        return binSize;
      })
    },
    // assume we've been given array of valid non-overlapping intervals as objects with keys
    // taxon_id, region, start, end
    // arg checking might be a good idea
    variableBinMapper: function(binsArray) {
      return variableBins(binsArray)
    }
  };
};