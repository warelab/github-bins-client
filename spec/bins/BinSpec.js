describe('Bins', function () {
  // json response to http://data.gramene.org/maps/select?type=genome
  // converted into a commonJS module by prepending json doc with
  // `module.exports = `
  var genomes = require('../support/genomes.js');
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
    bins = binsGenerator(genomes.data.response);
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
    var expectedNumberOfBins = genomes.data.response.reduce(function (acc, genome) {
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
          a: {size: 1000},
          b: {size: 1000}
        }
      }),
      A: new Genome({
        name: 'A',
        assembledGenomeSize: 200000,
        regions: { // calculated bin size is 1007; shouldn't it be 1005?
          a: {name: 'a', size: 1000},
          b: {name: 'b', size: 1100},
          c: {name: 'c', size: 197900}
        }
      }),
      B: new Genome({
        name: 'B',
        assembledGenomeSize: 200000,
        regions: { // cacluated bin size is 1010
          a: {name: 'a', size: 100},
          b: {name: 'b', size: 900},
          c: {name: 'c', size: 198900},
          UNANCHORED: {name: 'UNANCHORED'}
        }
      }),
      C: new Genome({
        name: 'C',
        assembledGenomeSize: 200000,
        regions: { // cacluated bin size is 1010; shouldn't it be 1006?
          a: {name: 'a', size: 0},
          b: {name: 'b', size: 200000},
          c: {name: 'c', size: 0},
          UNANCHORED: {name: 'UNANCHORED'}
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
    var binnedResults = require('../support/results-fixed_1000_bin');
    var binnedGenomes = mapper_200.binnedGenomes();

    // when
    function shouldThrow() {
      binnedGenomes.setResults(binnedResults);
    }

    // then
    expect(shouldThrow).toThrow('Results are for fixed_1000_bin bins. Should be fixed_200_bin');
  });

  it('should map result counts to the appropriate bins', function () {
    // given
    var binnedResults = require('../support/results-fixed_200_bin');
    var binnedGenomes = mapper_200.binnedGenomes();

    // when
    var objBin = binnedGenomes.get(chocolate_taxon_id).region(chocolate_region_name).firstBin();
    binnedGenomes.setResults(binnedResults);

    // then
    expect(objBin.results).toBeDefined();
    expect(objBin.results.count).toEqual(356);

  });

  it('should use results as total if flag is passed', function () {
    // given
    var binnedResults = require('../support/results-fixed_200_bin');
    var binnedGenomes = mapper_200.binnedGenomes();

    // when
    var objBin = binnedGenomes.get(chocolate_taxon_id).region(chocolate_region_name).firstBin();
    binnedGenomes.setResults(binnedResults, true);

    // then
    expect(objBin.total).toBeDefined();
    expect(objBin.total.count).toEqual(356);
  });

  it('should throw if the largest bin index is greater than the number of bins', function () {
    // given
    var binnedResults = _.cloneDeep(require('../support/results-fixed_200_bin'));
    var binnedGenomes = mapper_200.binnedGenomes();

    // when we hack the data to have a very large bin
    binnedResults.data[999999999] = {count: 1};
    function thrower() { return binnedGenomes.setResults(binnedResults); }

    // then
    expect(thrower).toThrow('Bin count mismatch!');
  });

  it('should roll up result counts to regions and genomes', function () {
    // given
    var binnedResults = require('../support/results-fixed_200_bin');
    var binnedGenomes = mapper_200.binnedGenomes();
    binnedGenomes.setResults(binnedResults);

    // then
    expect(binnedGenomes.results.count).toEqual(1661880);
    expect(binnedGenomes.get(chocolate_taxon_id).results.count).toEqual(29188);
    expect(binnedGenomes.get(chocolate_taxon_id).region(chocolate_region_name).results.count).toEqual(4087);
  });

  it('should roll up bins count to regions and genomes', function () {
    // given
    var binnedResults = require('../support/results-fixed_200_bin');
    var binnedGenomes = mapper_200.binnedGenomes();
    binnedGenomes.setResults(binnedResults);

    // then
    expect(binnedGenomes.results.bins).toEqual(5987);
    expect(binnedGenomes.get(chocolate_taxon_id).results.bins).toEqual(200);
    expect(binnedGenomes.get(chocolate_taxon_id).region(chocolate_region_name).results.bins).toEqual(23);
  });

  it('should roll up result totals to regions and genomes', function () {
    // given
    var binnedResults = require('../support/results-fixed_200_bin');
    var binnedGenomes = mapper_200.binnedGenomes();
    binnedGenomes.setResults(binnedResults, true);

    // then
    expect(binnedGenomes.results.total).toEqual(1661880);
    expect(binnedGenomes.get(chocolate_taxon_id).results.total).toEqual(29188);
    expect(binnedGenomes.get(chocolate_taxon_id).region(chocolate_region_name).results.total).toEqual(4087);
  });

  it('should throw with non-numeric param', function() {
    expect(function() { bins.uniformBinMapper('foo'); }).toThrow('binWidth must be numeric: foo');
    expect(function() { mapper_200 = bins.fixedBinMapper('bar'); }).toThrow('binsPerGenome must be numeric: bar');
  });

  it('with no genes in a result set, the results property of the bin should contain an object equal to `{count: 0}`', function() {
    // given
    var binnedResults = require('../support/results-fixed_200_bin');
    var binnedGenomes = mapper_200.binnedGenomes();
    binnedGenomes.setResults(binnedResults);

    // when
    var bin = binnedGenomes.get(4558).region('1').bin(10);

    // then
    expect(bin.results).toEqual({count: 0});
  });
});