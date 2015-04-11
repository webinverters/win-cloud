var StringStream = require('string-stream');
var Storage = require('./storage');

var ext = Math.floor(Math.random() * 999999);
var testBucket = 'storage-test'+ext;
describe('storage.int.js', function() {
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

    it('writes a blob to storage', function() {
      return s.write({
        key: 'test1',
        data: 'here is a blob of data'
      })
      .then(function(key) {
        expect(key).to.equal('test1');
      })
      .then(function(data) {
        return s.readString('test1');
      })
      .then(function(blob) {
        expect(blob).to.equal('here is a blob of data');
      });
    });
  });

  describe('storage.read(key)', function() {
    xit('returns a readable stream of the file', function(done) {
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

  describe('storage.writeBlobs(blobs)', function() {
    it('writes all blobs specified in array to bucket.', function() {
      var testBlobs = [
        {
          key: 'blob1',
          data: 'blob1-data'
        },
        {
          key: 'blob2',
          data: 'blob2-data'
        }
      ];
      return s.writeBlobs(testBlobs)
      .then(function(keys) {
        return s.readBlobs(keys);
      })
      .then(function(blobs) {
        expect(blobs.length).to.equal(2);
        expect(blobs).to.deep.equal(testBlobs);
      });
    });
  });
});
