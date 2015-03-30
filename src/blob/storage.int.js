/**
 * Created by justin on 2014-11-29.
 */
var StringStream = require('string-stream')
;

/**
 * Created by justin on 2014-11-28.
 */

var Storage = require('./storage');

var ext = Math.floor(Math.random() * 999999);
var testBucket = 'storage-test'+ext;
describe('storage.int.js', function() {
  this.timeout(10000);
  var s = Storage(testBucket);

  after(function() {
    return s.destroy();
  });

  describe('s.listBuckets()', function() {
    it('lists all buckets in the account', function(done) {
      return s.listBuckets().then(function(buckets) {
        expect(buckets).to.be.a('Array');
        done();
      });
    });
  });

  describe('if bucketName doesnt exist', function() {
    it('creates the bucket', function(done) {
      return s.ready().then(function() {
        expect(s._bucketName).to.equal(testBucket);
        done();
      });
    });
  });

  describe('storage.write()', function() {
    it('by default names the file {dateISOFormat}-{suffix}', function(done) {
      return s.write({data:'hello', suffix: 'awesome.log'})
          .then(function(key) {
            expect(key).to.be.a('string');
            expect(key).to.contain('awesome.log');
            done();
          }).then(null, done);
    });

    it('can write a stream to s3', function(done) {
      var testStream = new StringStream('test text');
      testStream.byteLength = 'test text'.length;  // HACK: looks like a bug in AWS
      return s.write({data:testStream, key: 'test.txt'})
          .then(function(key) {
            return s.list(key);
          })
          .then(function(objectList) {
            expect(objectList[0].Key).to.equal('test.txt');
            done();
          })
          .then(null, done);
    });
  });

  describe('storage.read(key)', function() {
    it('returns a readable stream of the file', function(done) {
      var testStream = new StringStream('test text');
      testStream.byteLength = 'test text'.length;  // HACK: looks like a bug in AWS
      return s.read('test.txt')
          .then(function(ss) {
            var str = '';
            ss.on('data', function(data) {
              str += data;
            });
            ss.on('end', function() {
              expect(str).to.equal('test text');
              done();
            });
          }).then(null, done);
    });
  });

  describe('storage.readString(key)', function() {
    it('returns a string', function(done) {
      s.readString('test.txt')
          .then(function(result) {
            expect(result).to.equal('test text');
            done()
          })
          .then(null, done);
    });
  });

  describe('storage.list()', function() {
    it('lists all the files in the bucket', function(done) {
      s.list().then(function(fileNames) {
        expect(fileNames.length).to.equal(2);
        done();
      }).then(null, done);
    });
  });

  describe('storage.list(prefix)', function() {
    it('lists only those that match the prefix', function(done) {
      s.list('test').then(function(fileNames) {
        expect(fileNames.length).to.equal(1);
        done();
      }).then(null, done);
    });
  });

  describe('storage.copyResourceToCloudStorageUntilTheResourceMatchesLocalFileLength(localFileName, resKey)',
    function() {
      describe('The localFile is open and being written to:', function() {
        beforeEach(function() {
          // intentionally running an async operation here and not returning promise to mocha.
          //openFileAndWriteAHugeString100000CharactersLong('awesome');
        });

        it('fails unless we call the special method.', function() {
          //return s.write({
          //  data: fs.createReadStream('awesome'),
          //  key: 'awesome'
          //})
          //.then(function(key) {
          //  resourceKey = key;
          //  // passing the key as the first parameter since then list will only return the resource
          //  return s.list(key);
          //})
          //.then(function(stats) {
          //  expect(stats[0].Size).to.equal(100000);
          //})
        });

        it('still copies the entire file', function() {
          //return s.copyResourceToCloudStorageUntilTheResourceMatchesLocalFileLength('awesome', 'awesome')
          //    .then(function(fileSizeInBytes) {
          //      expect(fileSizeInBytes).to.equal(100000);
          //      return fs.unlinkAsync('awesome');
          //    });
        });
      });
    });
});

function openFileAndWriteAHugeString100000CharactersLong(fileName) {
  return fs.writeFileAsync(fileName, Array(100001).join('x'));
}
