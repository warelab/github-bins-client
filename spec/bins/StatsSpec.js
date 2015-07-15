describe('Stats', function() {
  var stats, resultSet;

  beforeEach(function() {
    stats = require('../../src/stats');
    resultSet = [
      {results:{count:3}},
      {results:{count:4}},
      {results:{count:4}},
      {results:{count:5}},
      {results:{count:6}},
      {results:{count:8}}
    ]
  });

  it('should calculate stats correctly', function() {
    // given
    var results = stats.calcStats(resultSet);

    expect(results.count).toEqual(6);
    expect(results.sum).toEqual(30);
    expect(results.min).toEqual(3);
    expect(results.max).toEqual(8);
    expect(results.sumSq).toEqual(166);
    expect(results.avg).toEqual(5);
    expect(+results.stdev.toPrecision(3)).toEqual(1.63);
  });
});