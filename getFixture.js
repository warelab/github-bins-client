var promise = require('./src/promise');

promise.get(true).then(function(data) {
  console.log(JSON.stringify(data.uniformBinMapper(100000000).binnedGenomes()));
});