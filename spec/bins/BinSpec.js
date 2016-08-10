describe('Bins', function () {
  // json response to http://data.gramene.org/maps/select?type=genome
  // converted into a commonJS module by prepending json doc with
  // `module.exports = `
  var genomes = require('../support/genomes.json').obj;
  var binsGenerator = require('../../src/bins');
  var _ = require('lodash');
  var bins;
  var mapper_2Mb;
  var mapper_200;

  // example data for mapper_2Mb
  var chocolate_taxon_id = 3641;
  var chocolate_region_name = "1";
  var chocolate_start = 1;
  var chocolate_end = 2000000;
  var chocolate_bin = 2;
  var chocolate_unanchored_bin = 201;

  var chocolate_genome_length = 330456197;
  var chocolate_end_fixed200 = 1697356;//Math.floor(chocolate_genome_length / 200);

  var arabidopsis_thaliana_taxon_id = 3702;


  beforeEach(function () {
    bins = binsGenerator(genomes);
    mapper_2Mb = bins.uniformBinMapper(2000000);
    mapper_200 = bins.fixedBinMapper(200);
  });

  it('pos2bin should work with uniform', function () {
    // when
    var startBin = mapper_2Mb.pos2bin(chocolate_taxon_id, chocolate_region_name, chocolate_start);
    var endBin = mapper_2Mb.pos2bin(chocolate_taxon_id, chocolate_region_name, chocolate_end);

    // then
    expect(startBin).toEqual(chocolate_bin);
    expect(endBin).toEqual(chocolate_bin);
  });

  it('bin2pos should work with uniform', function () {
    // when
    var result = mapper_2Mb.bin2pos(chocolate_bin);

    // then
    expect(Object.keys(result).length).toEqual(5);
    expect(Object.keys(result)).toEqual(['taxon_id', 'region', 'start', 'end', 'idx']);
    expect(result.taxon_id).toEqual(chocolate_taxon_id);
    expect(result.region).toEqual(chocolate_region_name);
    expect(result.start).toEqual(chocolate_start);
    expect(result.end).toEqual(chocolate_end);
  });

  it('pos2bin should work with fixed', function () {
    // when
    var startBin = mapper_200.pos2bin(chocolate_taxon_id, chocolate_region_name, chocolate_start);
    var endBin = mapper_200.pos2bin(chocolate_taxon_id, chocolate_region_name, chocolate_end_fixed200);

    // then
    expect(startBin).toEqual(chocolate_bin);
    expect(endBin).toEqual(chocolate_bin);
  });

  it('bin2pos should work with fixed', function () {
    // when
    var result = mapper_200.bin2pos(chocolate_bin);

    // then
    expect(Object.keys(result).length).toEqual(5);
    expect(Object.keys(result)).toEqual(['taxon_id', 'region', 'start', 'end', 'idx']);
    expect(result.taxon_id).toEqual(chocolate_taxon_id);
    expect(result.region).toEqual(chocolate_region_name);
    expect(result.start).toEqual(chocolate_start);
    expect(result.end).toEqual(chocolate_end_fixed200);
  });

  it('bin2pos should throw with illegal parameters', function () {
    // when
    var bin2posFixed = function () { mapper_200.bin2pos(1e9) };
    var bin2posUniform = function () { mapper_2Mb.bin2pos(1e9) };

    // then
    expect(bin2posFixed).toThrow();
    expect(bin2posUniform).toThrow();
  });

  it('pos2bin should throw with illegal taxon_id', function () {
    // when
    var illegalTaxonId = function () {mapper_200.pos2bin(1, -1, -1)};

    // then
    expect(illegalTaxonId).toThrow();
  });

  it('pos2bin should assume you are asking for an UNANCHORED region if ' +
  'the region is not recognized and the genome has an UNANCHORED region', function () {
    // when
    var illegalRegion1 = mapper_200.pos2bin(chocolate_taxon_id, "100", -1);

    // then
    expect(illegalRegion1).toEqual(chocolate_unanchored_bin);
  });

  it('pos2bin should throw when an unrecognized region is requested from a ' +
  'genome without UNANCHORED sequence', function () {
    // when
    var illegalRegion1 = function () {mapper_200.pos2bin(arabidopsis_thaliana_taxon_id, "100", -1)};

    // then
    expect(illegalRegion1).toThrow();
  });

  it('pos2bin should throw when an illegal position is requested', function () {
    // when
    var illegalRegion1 = function () {mapper_200.pos2bin(arabidopsis_thaliana_taxon_id, "1", -1)};
    var illegalRegion2 = function () {
      mapper_200.pos2bin(arabidopsis_thaliana_taxon_id, "1", 1e11)
    };

    // then
    expect(illegalRegion1).toThrow();
    expect(illegalRegion2).toThrow();
  });

  it('should support custom mapping', function () {
    // given
    var myBins = [
      {taxon_id: 3702, region: "1", start: 123, end: 432},
      {taxon_id: 3702, region: "1", start: 555, end: 888},
      {taxon_id: 3702, region: "2", start: 111, end: 444}
    ];
    var customMapper = bins.variableBinMapper(myBins);

    // when
    var bin1start = customMapper.pos2bin(3702, "1", 123);
    var bin1start2 = customMapper.pos2bin(3702, 1, 123);
    var bin1end = customMapper.pos2bin(3702, "1", 432);
    var bin1end2 = customMapper.pos2bin(3702, "1", "432");
    var bin1end3 = customMapper.pos2bin("3702", "1", "432");

    // then
    expect(bin1start).toEqual(0);
    expect(bin1start2).toEqual(0);
    expect(bin1end).toEqual(0);
    expect(bin1end2).toEqual(0);
    expect(bin1end3).toEqual(0);
  });

  it('should return -1 with illegal bin positions', function () {
    // given
    var myBins = [
      {taxon_id: 3702, region: "1", start: 123, end: 432},
      {taxon_id: 3702, region: "1", start: 555, end: 888},
      {taxon_id: 3702, region: "2", start: 111, end: 444}
    ];
    var customMapper = bins.variableBinMapper(myBins);

    // when
    var nobin1 = customMapper.pos2bin(3702, "1", 433);
    var nobin2 = customMapper.pos2bin(3702, "1", 0);
    var nobin3 = customMapper.pos2bin(3702, "1", new Date());
    var nobin4 = customMapper.pos2bin(3702, "1", Array.prototype.slice);
    var nobin5 = customMapper.pos2bin(3702, Array.prototype.slice, 123);
    var nobin6 = customMapper.pos2bin(Array.prototype.slice, "1", 123);

    // then
    expect(nobin1).toEqual(-1);
    expect(nobin2).toEqual(-1);
    expect(nobin3).toEqual(-1);
    expect(nobin4).toEqual(-1);
    expect(nobin5).toEqual(-1);
    expect(nobin6).toEqual(-1);
  });

  it('should return the variable bin by index', function () {
    // given
    var myBins = [
      {taxon_id: 3702, region: "1", start: 123, end: 432},
      {taxon_id: 3702, region: "1", start: 555, end: 888},
      {taxon_id: 3702, region: "2", start: 111, end: 444}
    ];
    var customMapper = bins.variableBinMapper(myBins);
    var idx = 0;

    // when
    var bin = customMapper.bin2pos(idx);

    // then
    expect(bin).toEqual(myBins[idx]);
  });

  it('should error out when asking for unreasonable bins', function () {
    // given
    var myBins = [
      {taxon_id: 3702, region: "1", start: 123, end: 432},
      {taxon_id: 3702, region: "1", start: 555, end: 888},
      {taxon_id: 3702, region: "2", start: 111, end: 444}
    ];
    var customMapper = bins.variableBinMapper(myBins);
    var illegalIdx = 5;

    // when
    var bin = function () {customMapper.bin2pos(illegalIdx);};

    // then
    expect(bin).toThrow();
  });

  it('should disallow overlapping custom bins', function () {
    // given
    var myBins = [
      {taxon_id: 3702, region: "1", start: 1, end: 432},
      {taxon_id: 3702, region: "1", start: 3, end: 888},
      {taxon_id: 3702, region: "2", start: 2, end: 444}
    ];

    // when
    var shouldFail = function () {bins.variableBinMapper(myBins);};

    // then
    expect(shouldFail).toThrow();
  });

  it('should create the requested number of fixed bins', function () {
    var expectedNumberOfBins = genomes.reduce(function (acc, genome) {
      return acc + (genome.length > 0 ? 200 : 1);
    }, 0);
    expect(mapper_200.nbins).toEqual(expectedNumberOfBins);
  });

  it('fixedBinMapper should correctly determine bin width for test genomes', function () {
    // given
    var Genome = require('../../src/genomes').Genome;
    var binSizeFunction = mapper_200._getBinSizeForGenome;

    var genomes = {
      tooSmall: new Genome({
        name: 'tooSmall',
        assembledGenomeSize: 2000,
        regions: { // calculated bin size is 10
          names: ['a', 'b'],
          lengths: [1000, 1000]
        }
      }),
      A: new Genome({
        name: 'A',
        assembledGenomeSize: 200000,
        regions: { // calculated bin size is 1007; shouldn't it be 1005?
          names: ['a', 'b', 'c'],
          lengths: [1000, 1100, 197900]
        }
      }),
      B: new Genome({
        name: 'B',
        assembledGenomeSize: 200000,
        regions: { // cacluated bin size is 1010
          names: ['a', 'b', 'c', 'UNANCHORED'],
          lengths: [100, 900, 198900]
        }
      }),
      C: new Genome({
        name: 'C',
        assembledGenomeSize: 200000,
        regions: { // cacluated bin size is 1010; shouldn't it be 1006?
          names: ['a', 'b', 'c', 'UNANCHORED'],
          lengths: [0, 200000, 0]
        }
      })
    };

    expect(function () {
      binSizeFunction(genomes.tooSmall)
    }).toThrow('assembled genome sizes between 1 and 100000 are not supported');

    expect(binSizeFunction(genomes.A)).toEqual(1007); // TODO this should be 1005?
    expect(binSizeFunction(genomes.B)).toEqual(1010);
    expect(binSizeFunction(genomes.C)).toEqual(1010); // TODO this should be 1006?
  });

  it('should decorate genome/assembly data object with bin information', function () {
    // given
    var binnedGenomes = mapper_200.binnedGenomes();

    // when
    var genome = binnedGenomes.get(chocolate_taxon_id);
    var firstRegion = genome.region(chocolate_region_name);

    // then
    expect(firstRegion.startBin).toEqual(chocolate_bin);
    expect(firstRegion.binCount()).toEqual(23);

    expect(genome.startBin).toEqual(firstRegion.startBin);
    expect(genome.nbins).toEqual(200);
  });

  it('should provide consistent information from pos2bin/bin2pos and annotated assembly object', function () {
    // given
    var binnedGenomes = mapper_200.binnedGenomes();

    // when
    var objBin = binnedGenomes.get(chocolate_taxon_id).region(chocolate_region_name).firstBin();
    var bin2pos = mapper_200.bin2pos(objBin.idx);
    var pos2bin = mapper_200.pos2bin(chocolate_taxon_id, chocolate_region_name, 1);

    // then
    expect(bin2pos.start).toEqual(objBin.start);
    expect(bin2pos.end).toEqual(objBin.end);
    expect(bin2pos.region).toEqual(chocolate_region_name);
    expect(pos2bin).toEqual(objBin.idx);
  });

  it('binnedGenomes.setResults should throw with illegal results param', function () {
    // given
    var binnedGenomes = mapper_200.binnedGenomes();

    // when
    var throwers = [
      function throw1() { binnedGenomes.setResults(); },
      function throw2() { binnedGenomes.setResults(-1); },
      function throw3() { binnedGenomes.setResults('hello'); },
      function throw4() { binnedGenomes.setResults(new Date()); },
      function throw5() { binnedGenomes.setResults({}); }
    ];

    // then
    throwers.map(function (fn) {
      expect(fn).toThrow('Please supply valid results parameter');
    });
  });

  it('should throw with results from incorrect bin configuration', function () {
    // given
    var binnedResults = require('../support/results-fixed_1000__bin');
    var binnedGenomes = mapper_200.binnedGenomes();

    // when
    function shouldThrow() {
      binnedGenomes.setResults(binnedResults);
    }

    // then
    expect(shouldThrow).toThrow('Results are for fixed_1000__bin bins. Should be fixed_200__bin');
  });

  it('should map result counts to the appropriate bins', function () {
    // given
    var binnedResults = require('../support/results-fixed_200__bin');
    var binnedGenomes = mapper_200.binnedGenomes();

    // when
    var objBin = binnedGenomes.get(chocolate_taxon_id).region(chocolate_region_name).firstBin();
    binnedGenomes.setResults(binnedResults);

    // then
    expect(objBin.results).toBeDefined();
    expect(objBin.results.count).toEqual(356);

  });

  it('should throw if the largest bin index is greater than the number of bins', function () {
    // given
    var binnedResults = _.cloneDeep(require('../support/results-fixed_200__bin'));
    var binnedGenomes = mapper_200.binnedGenomes();

    // when we hack the data to have a very large bin
    binnedResults.data[999999999] = {count: 1};
    function thrower() { return binnedGenomes.setResults(binnedResults); }

    // then
    expect(thrower).toThrow('Bin count mismatch!');
  });

  it('should roll up result counts to regions and genomes', function () {
    // given
    var binnedResults = require('../support/results-fixed_200__bin');
    var binnedGenomes = mapper_200.binnedGenomes();
    binnedGenomes.setResults(binnedResults);

    // then
    expect(binnedGenomes.results.count).toEqual(1661880);
    expect(binnedGenomes.get(chocolate_taxon_id).results.count).toEqual(29188);
    expect(binnedGenomes.get(chocolate_taxon_id).region(chocolate_region_name).results.count).toEqual(4087);
  });

  it('should roll up bins count to regions and genomes', function () {
    // given
    var binnedResults = require('../support/results-fixed_200__bin');
    var binnedGenomes = mapper_200.binnedGenomes();
    binnedGenomes.setResults(binnedResults);

    // then
    expect(binnedGenomes.results.bins).toEqual(5987);
    expect(binnedGenomes.get(chocolate_taxon_id).results.bins).toEqual(200);
    expect(binnedGenomes.get(chocolate_taxon_id).region(chocolate_region_name).results.bins).toEqual(23);
  });

  it('should throw with non-numeric param', function() {
    expect(function() { bins.uniformBinMapper('foo'); }).toThrow('binWidth must be numeric: foo');
    expect(function() { mapper_200 = bins.fixedBinMapper('bar'); }).toThrow('binsPerGenome must be numeric: bar');
  });

  it('with no genes in a result set, the results property of the bin should contain an object equal to `{count: 0}`', function() {
    // given
    var binnedResults = require('../support/results-fixed_200__bin');
    var binnedGenomes = mapper_200.binnedGenomes();
    binnedGenomes.setResults(binnedResults);

    // when
    var bin = binnedGenomes.get(4558).region('1').bin(10);

    // then
    expect(bin.results).toEqual({count: 0});
  });

  it('should have stats for the genomes object', function() {
    // given

    // when
    var sum = _.sum(genomes, 'num_genes');

    // then
    expect(sum).toEqual(1568831); // this is the number of genes that are db_type:"core" (i.e. not "otherfeatures")
  });

    it('should have stats for the genomes object', function() {
    // given
    var binnedResults = require('../support/results-fixed_200__bin');
    var binnedGenomes = mapper_200.binnedGenomes();

    // when
    binnedGenomes.setResults(binnedResults);
    var stats = binnedGenomes.stats;

    // then
    expect(stats).toBeDefined();
    expect(stats.genomes).toBeDefined();
    expect(stats.bins).toBeDefined();

    expect(stats.genomes.count).toEqual(39);
    expect(stats.bins.count).toEqual(5979); // not 6009 because we filter out UNFILTERED

    expect(stats.genomes.sum).toEqual(1661880);
    expect(stats.bins.sum).toEqual(1339923);

    expect(stats.genomes.min).toEqual(0);
    expect(stats.bins.min).toEqual(0);

    expect(stats.genomes.max).toEqual(146879);
    expect(stats.bins.max).toEqual(1137);

    expect(+stats.genomes.avg.toPrecision(3)).toEqual(42600);
    expect(+stats.bins.avg.toPrecision(3)).toEqual(224);

    expect(+stats.genomes.stdev.toPrecision(3)).toEqual(28600);
    expect(+stats.bins.stdev.toPrecision(3)).toEqual(172);

  });

  it('should return a bin for a given index', function() {
    // given
    // var binnedResults = require('../support/results-fixed_200__bin');
    var binnedGenomes = mapper_200.binnedGenomes();
    var testBinIdx = 1;

    // when
    var bin = binnedGenomes.getBin(testBinIdx);

    expect(bin.idx).toEqual(testBinIdx);
  });

  it('should return a bin for a given index', function() {
    // given
    // var binnedResults = require('../support/results-fixed_200__bin');
    var binnedGenomes = mapper_200.binnedGenomes();
    var testBinIdx = 1000;

    // when
    var bin = binnedGenomes.getBin(testBinIdx);

    expect(bin.idx).toEqual(testBinIdx);
  });

  it('should not return a bin for an illegal index', function() {
    // given
    // var binnedResults = require('../support/results-fixed_200__bin');
    var binnedGenomes = mapper_200.binnedGenomes();
    var testBinIdx = 1000000000;

    // when
    var binFn = function() {binnedGenomes.getBin(testBinIdx)};

    // then
    expect(binFn).toThrow("Supplied index out of range.");
  });

  it('should not return a bin for a negative index', function() {
    // given
    // var binnedResults = require('../support/results-fixed_200__bin');
    var binnedGenomes = mapper_200.binnedGenomes();
    var testBinIdx = -1;

    // when
    var binFn = function() {binnedGenomes.getBin(testBinIdx)};

    // then
    expect(binFn).toThrow("Supplied index out of range.");
  });

  it('should not return a bin if the index is equal to the total number of bins', function() {
    // given
    // var binnedResults = require('../support/results-fixed_200__bin');
    var binnedGenomes = mapper_200.binnedGenomes();
    var testBinIdx = binnedGenomes.binCount();

    // when
    var binFn = function() {binnedGenomes.getBin(testBinIdx)};

    // then
    expect(binFn).toThrow("Supplied index out of range.");
  });

  it('should not return a bin for a Date index', function() {
    // given
    // var binnedResults = require('../support/results-fixed_200__bin');
    var binnedGenomes = mapper_200.binnedGenomes();
    var testBinIdx = new Date();

    // when
    var binFn = function() {binnedGenomes.getBin(testBinIdx)};

    // then
    expect(binFn)
        .toThrow("Supplied index not a finite number.");
  });
  
  it('should not return a bin if index argument is NaN', function() {
    // given
    // var binnedResults = require('../support/results-fixed_200__bin');
    var binnedGenomes = mapper_200.binnedGenomes();
    var testBinIdx = NaN;

    // when
    var binFn = function() {binnedGenomes.getBin(testBinIdx)};

    // then
    expect(binFn).toThrow("Supplied index not a finite number.");
  });
  
  it('should not return a bin if index argument is infinite', function() {
    // given
    // var binnedResults = require('../support/results-fixed_200__bin');
    var binnedGenomes = mapper_200.binnedGenomes();
    var testBinIdx = Infinity;

    // when
    var binFn = function() {binnedGenomes.getBin(testBinIdx)};

    // then
    expect(binFn).toThrow("Supplied index not a finite number.");
  });

  it('should return a list of bins in a range', function() {
    // given
    // var binnedResults = require('../support/results-fixed_200__bin');
    var binnedGenomes = mapper_200.binnedGenomes();
    var startBinIdx = 1;
    var endBinIdx = 1000;

    // when
    var bins = binnedGenomes.getBins(startBinIdx, endBinIdx);

    expect(bins.length).toEqual(endBinIdx - startBinIdx + 1); // start and end indexes, inclusive.
    expect(_.head(bins).idx).toEqual(startBinIdx);
    expect(_.last(bins).idx).toEqual(endBinIdx)
  });

  it('should return a list of bins in a range', function() {
    // given
    // var binnedResults = require('../support/results-fixed_200__bin');
    var binnedGenomes = mapper_200.binnedGenomes();
    var startBinIdx = 0;
    var endBinIdx = 999;

    // when
    var bins = binnedGenomes.getBins(startBinIdx, endBinIdx);

    expect(bins.length).toEqual(endBinIdx - startBinIdx + 1); // start and end indexes, inclusive.
    expect(_.head(bins).idx).toEqual(startBinIdx);
    expect(_.last(bins).idx).toEqual(endBinIdx)
  });

  it('should return a list of bins in a range', function() {
    // given
    // var binnedResults = require('../support/results-fixed_200__bin');
    var binnedGenomes = mapper_200.binnedGenomes();
    var startBinIdx = 1000;
    var endBinIdx = 2000;

    // when
    var bins = binnedGenomes.getBins(startBinIdx, endBinIdx);

    expect(bins.length).toEqual(endBinIdx - startBinIdx + 1); // start and end indexes, inclusive.
    expect(_.head(bins).idx).toEqual(startBinIdx);
    expect(_.last(bins).idx).toEqual(endBinIdx)
  });

  it('should return all bins using start of 0 and end of binCount()', function() {
    // given
    // var binnedResults = require('../support/results-fixed_200__bin');
    var binnedGenomes = mapper_200.binnedGenomes();
    var startBinIdx = 0;
    var endBinIdx = binnedGenomes.binCount() - 1;

    // when
    var bins = binnedGenomes.getBins(startBinIdx, endBinIdx);

    expect(bins.length).toEqual(endBinIdx - startBinIdx + 1); // start and end indexes, inclusive.
    expect(_.head(bins).idx).toEqual(startBinIdx);
    expect(_.last(bins).idx).toEqual(endBinIdx)
  });

  it('should return all bins', function() {
    // given
    // var binnedResults = require('../support/results-fixed_200__bin');
    var binnedGenomes = mapper_200.binnedGenomes();
    var startBinIdx = 0;
    var endBinIdx = binnedGenomes.binCount() - 1;

    // when
    var allBins = binnedGenomes.allBins();
    var lessSugar = binnedGenomes.getBins(startBinIdx, endBinIdx);

    // then
    expect(allBins).toEqual(lessSugar);
  });

  it('modifying result of all bins should not alter state of genomes', function() {
    // given
    // var binnedResults = require('../support/results-fixed_200__bin');
    var binnedGenomes = mapper_200.binnedGenomes();
    var allBins = binnedGenomes.allBins();

    allBins.push('nefarious');
    var removed = allBins.shift(); // remove first
    var allBinsAgain = binnedGenomes.allBins();

    // then
    expect(_.last(allBins)).toEqual('nefarious');
    expect(removed).toEqual(_.head(allBinsAgain));
    expect(_.head(allBins)).toEqual(allBinsAgain[1]);
    expect(_.last(allBinsAgain)).not.toEqual('nefarious');
  });

  it('should not return a list of bins if the start index is after the end index', function() {
    // given
    // var binnedResults = require('../support/results-fixed_200__bin');
    var binnedGenomes = mapper_200.binnedGenomes();
    var startBinIdx = 1000;
    var endBinIdx = 1;

    // when
    var binsFn = function() {binnedGenomes.getBins(startBinIdx, endBinIdx)};

    // then
    expect(binsFn).toThrow("Start index is after end index.");
  });

  it('should not return a list of bins if the start index is NaN', function() {
    // given
    // var binnedResults = require('../support/results-fixed_200__bin');
    var binnedGenomes = mapper_200.binnedGenomes();
    var startBinIdx = NaN;
    var endBinIdx = 1;

    // when
    var binsFn = function() {binnedGenomes.getBins(startBinIdx, endBinIdx)};

    // then
    expect(binsFn).toThrow("Supplied index not a finite number.");
  });

  it('should not return a list of bins if the end index is NaN', function() {
    // given
    // var binnedResults = require('../support/results-fixed_200__bin');
    var binnedGenomes = mapper_200.binnedGenomes();
    var startBinIdx = 1;
    var endBinIdx = NaN;

    // when
    var binsFn = function() {binnedGenomes.getBins(startBinIdx, endBinIdx)};

    // then
    expect(binsFn).toThrow("Supplied index not a finite number.");
  });

  it('should not fail if the bin with assignment fails to converge', function() {
    var dodgyGenome = [{"_id":"GCA_000341285.1","db":"plants_rhodophyta1_collection_core_51_85_1","taxon_id":130081,"system_name":"galdieria_sulphuraria","type":"genome","length":180086,"regions":{"names":["Pt","UNANCHORED"],"lengths":[180086,104800334]},"num_genes":16564}];
    var dodgyBins = binsGenerator(dodgyGenome);

    // this used to be an infinite loop.
    var dodgyMapper = dodgyBins.fixedBinMapper(1000);

    expect(true).toBe(true);
  });
});