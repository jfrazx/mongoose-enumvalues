const { Mockgoose: MockGoose } = require('mockgoose');
const mongoose = require('mongoose');
const mockgoose = new MockGoose(mongoose);

mongoose.Promise = global.Promise;

before(function(done) {
  mockgoose.prepareStorage()
    .then(function() {
      mongoose.connect('mongodb:://localhost/enumvalues', done);

      mongoose.connection.on('connected', () => console.log('MockGoose connected'));
  });
});
