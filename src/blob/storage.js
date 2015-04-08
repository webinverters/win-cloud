/**
 * Created by justin on 2014-11-29.
 */

var
    StringStream = require('string-stream'),
    batcher = require('win-common')({projectRoot:__dirname}).batcher;

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
    return s.ready().then(function () {
      return s.list()
    })
    .then(function (allObjects) {
      console.log('Destroying:', allObjects.length, 'objects from bucket:', bucketName);
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
    .then(function (test) {
      return provider.deleteBucket().then(function () {
        s._bucketName = null;
      });
    });
  };

  s.ready = function () {
    if (s._bucketName) {
      return p.resolve(s._bucketName);
    }
    else if (s._async) {
      return s._async;
    }
    else {
      console.log('creating bucket...', bucketName);
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

  s.list = function (prefix) {
    return s.ready().then(function () {
      return listAllObjects(prefix);
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

  s.copyResourceToCloudStorageUntilTheResourceMatchesLocalFileLength = function(fileName, dstResourceKey) {
    var resourceKey = null;
    return s.write({
      data: fs.createReadStream(fileName),
      key: dstResourceKey
    })
    .then(function(key) {
      resourceKey = key;
      // passing the key as the first parameter since then list will only return the resource
      return s.list(key);
    })
    .then(function(resources) {
      return fs.statAsync(fileName)
          .then(function(localFileDetails) {
            return {localFileDetails: localFileDetails, cloudResource: resources[0]};
          })
    })
    .then(function(the) {
      if (the.localFileDetails.size != the.cloudResource.Size) {
        // it must not have copied the entire file to cloud storage, retry:
        return s.copyResourceToCloudStorageUntilTheResourceMatchesLocalFileLength(fileName, dstResourceKey);
      }
      return the.localFileDetails.size;
    });
  };


  function listAllObjects(prefix) {
    var allKeys = [], deferred = p.defer();

    function listAllKeys(marker, prefix) {
      provider.listObjects({Prefix: prefix, Marker: marker}, function (err, data) {
        if (err) {
          deferred.reject(err);
          return;
        }
        allKeys.push(data.Contents);
        if (data.IsTruncated)
          listAllKeys(data.Contents.slice(-1)[0].Key, prefix);
        else
          deferred.resolve(_.flatten(allKeys));
      });
    }

    listAllKeys(null, prefix);
    return deferred.promise;
  }

  return s;
};



