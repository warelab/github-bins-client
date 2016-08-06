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
var Genomes = require('./genomes');

module.exports = function(RAW_GENOME_DATA) {

  // generate new genome data structure from (immutable) raw data
  function genomesMap(binName, bins, getBinSizeForGenome) {
    return new Genomes(RAW_GENOME_DATA, binName, bins, getBinSizeForGenome);
  }

  function bins(binName, getBinSizeForGenome) {
    var bins = [];
    var genomeMaps = genomesMap(binName, bins, getBinSizeForGenome);

    return {
      binnedGenomes: function() { return genomeMaps; },
      bin2pos: function(bin) {
        if (bin < 0 || bin >= bins.length) {
          throw 'bin ' + bin + ' out of range';
        }
        return bins[bin];
      },
      pos2bin: function(tax, rname, position) {
        var genome = genomeMaps.get(tax);
        if (!genome) {
          throw tax + ' not a known taxonomy id';
        }
        var binSize = getBinSizeForGenome(genome);
        var region = genome.region(rname);
        if (!region) {
          // perhaps the user is requesting some scaffold
          // that we have lumped into the 'unanchored' category
          region = genome.region('UNANCHORED');
        }
        if (!region) {
          throw rname + ' not a known seq region';
        }
        if (region.name === 'UNANCHORED') {
          // the unanchored region only has one bin
          return region.startBin;
        }
        if (position < 1 || position >= region.size) {
          throw 'position ' + position + ' out of range';
        }
        return region.startBin + Math.floor((position-1)/binSize);
      },
      nbins: bins.length,
      _getBinSizeForGenome: getBinSizeForGenome
    };
  }

  function variableBins(bins) {
    // sort the bins to match the order given in the maps
    var genomes = genomesMap();

    // NB THIS FOREACH FUNCTION IS MODIFYING THE BIN OBJECTS
    // PASSED IN.
    bins.map(function(bin) {
      bin.assembly = genomes.get(bin.taxon_id);
      bin.region = bin.assembly.region(bin.region);
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
      var name = 'uniform_' + binWidth + 'Mb__bin';
      if(!isNumber(binWidth)) {
        throw new Error('binWidth must be numeric: ' + binWidth);
      }
      return bins(name, function getGlobalBinWidth() {
        return binWidth;
      })
    },
    fixedBinMapper: function(binsPerGenome) {
      var name = 'fixed_' + binsPerGenome + '__bin';
      if(!isNumber(binsPerGenome)) {
        throw new Error('binsPerGenome must be numeric: ' + binsPerGenome);
      }
      return bins(name, function determineBinWidthForGenome(genome) {
        if (genome.assembledGenomeSize === 0) return 0;

        if (genome.assembledGenomeSize < 100000) {
          throw new Error('assembled genome sizes between 1 and 100000 are not supported');
        }

        var binSize = Math.floor(genome.assembledGenomeSize / binsPerGenome);

        function countBins(binSize) {
          var nbins = 0;
          genome.eachRegion(function(region) {
            if (region.name === 'UNANCHORED') {
              nbins++
            }
            else {
              nbins += Math.ceil(region.size / binSize);
            }
          });
          return nbins;
        }

        var nbins = countBins(binSize);
        if (nbins > binsPerGenome) {
          var a = Math.floor(genome.assembledGenomeSize / (binsPerGenome - genome.regionCount()));
          var b = binSize;
          while (a != b && countBins(a) != binsPerGenome) { // infinite loop without a != b
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
