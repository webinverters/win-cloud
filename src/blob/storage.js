/**
 * Created by justin on 2014-11-29.
 */

var
    StringStream = require('string-stream'),
    batcher = require('win-common')().batcher;

module.exports = function (bucketName, provider) {
  var s = {};
  provider = provider || new AWS.S3({params: {Bucket: bucketName}});

  // technically there is a way to promisfy all in one go, but as can be seen here
  // we do not want all the methods promisified...  (getObject for one...)
  // http://stackoverflow.com/questions/26475486/how-do-i-promisify-the-aws-javascript-sdk
  provider.deleteBucket = p.promisify(provider.deleteBucket);
  provider.createBucket = p.promisify(provider.createBucket);
  provider.putObject = p.promisify(provider.putObject);
  provider.listBuckets = p.promisify(provider.listBuckets);
  provider.deleteObjects = p.promisify(provider.deleteObjects);
  //provider.getObject = p.promisify(provider.getObject);

  s.destroy = function () {
    s.emptyBucket().then(function (test) {
      return provider.deleteBucket().then(function () {
        s._bucketName = null;
      });
    });
  };

  s.emptyBucket = function() {
    return s.ready().then(function () {
      return s.list()
    })
    .then(function (allObjects) {
      log('Deleting:', allObjects.length, 'objects from bucket:', bucketName);
      return p.all(batcher.chunk(allObjects, 1000, function (chunk) {
            return provider.deleteObjects({
              Delete: {
                Objects: _.map(chunk, function (x) {
                  return {Key: x.Key}
                })
              }
            });
          }
        )
      )
    })
  };

  s.ready = function () {
    if (s._bucketName) {
      return p.resolve(s._bucketName);
    }
    else if (s._async) {
      return s._async;
    }
    else {
      log('Initializing bucket:', bucketName);
      return s._async = provider.createBucket().then(function (data) {
        s._bucketName = bucketName;
        s._async = null;
      });
    }
  };

  s.write = function (params) {
    return s.ready().then(function () {
      var key = params.key || s.genKey(params.suffix);
      return provider.putObject({
        Key: key,
        Body: params.data
      }).then(function () {
        return key;
      });
    });
  };

  s.read = function (key) {
    return s.ready().then(function () {
      return provider.getObject({
        Key: key
      }).createReadStream();
    });
  };

  s.genKey = function (suffix) {
    return new Date().toISOString() + '-' + (suffix || Math.floor(Math.random() * 99999));
  };

  s.listBuckets = function () {
    return provider.listBuckets().then(function (data) {
      return data.Buckets;
    });
  };

  s.readString = function (key) {
    return s.read(key).then(function (fileStream) {
      var deferred = p.defer();
      var ss = new StringStream('');
      fileStream.pipe(ss);
      ss.on('end', function () {
        deferred.resolve(ss.toString());
      });
      fileStream.on('error', function (err) {
        deferred.resolve(err);
      });
      return deferred.promise;
    });
  };

  /**
   *
   * @param prefix Only download files that start with this prefix
   * @param marker Only download files after this file (the same thing as s3 api marker.)
   * @param maxCount Will only return up to this amount (it could exceed it by up to 999 at maximum, but no more.)
   * @returns {*}
   */
  s.list = function (prefix, marker, maxCount) {
    return s.ready().then(function () {
      return listAllObjects(prefix, marker, maxCount);
    });
  };

  /***
   * Write the file to S3 if it doesnt already exist.  If file does exist, this does nothing and resolves.
   * @param filePath
   * @param key
   */
  s.writeFile = function(filePath, key) {
    return s.list(key).then(function(results) {
      if (!results || !results.length) {
        return s.write({
          data: fs.createReadStream(filePath),
          key: key
        });
      }
      return key;
    });
  };

  s.save = function(bucket, key, blob) {
    return s.ready().then(function () {
      return p.resolve().then(function() {
        return JSON.stringify(blob);
      })
      .then(function(body) {
        return provider.putObject({
          Key: key,
          Body: body,
          Bucket: bucket
        })
      })
      .then(function () {
        return 's3://'+bucket+'/'+key;
      })
      .catch(function(err) {
        // TODO: check if error is 4xx and if it is just let it bubble up
        // TODO: else if it is 5xx do an exponential backoff retry.
        console.log('Failed to save a file to S3.  Details below:');
        console.log(blob);
        console.error(err);
        throw err;
      });
    });
  };

  s.writeBlobs = function(blobs) {
    return p.map(blobs, function(blob) {
      return s.write(blob);
    });
  };

  s.readBlobs = function(blobs) {
    return p.map(blobs, function(key) {
      return s.readString(key);
    })
    .then(function(data) {
      return _.map(blobs, function(key, idx) {
        return {
          key: key,
          data: data[idx]
        };
      });
    });
  };

  function listAllObjects(prefix, marker, maxCount) {
    var allKeys = [], deferred = p.defer();
    maxCount = maxCount || 100000;

    function listAllKeys(marker, prefix) {
      provider.listObjects({Prefix: prefix, Marker: marker}, function (err, data) {
        if (err) {
          deferred.reject(err);
          return;
        }
        allKeys.push(data.Contents);
        if (data.IsTruncated && _.flatten(allKeys).length < maxCount)
          listAllKeys(data.Contents.slice(-1)[0].Key, prefix);
        else
          deferred.resolve(_.flatten(allKeys));
      });
    }

    listAllKeys(marker, prefix);
    return deferred.promise;
  }

  return s;
};



