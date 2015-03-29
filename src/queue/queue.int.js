/**
 * Created by justin on 2014-11-28.
 */

var Queue = rrequire('common/queue');
var queueExt = Math.floor(Math.random() * 1000000);

describe('queue.integration.js', function() {
  this.timeout(10000);
  var q, thirdMessageReceiptId;

  beforeEach(function() {
    q = Queue('test-queue'+queueExt);
  });

  describe('queue.sendMsg(data)', function() {
    it('creates the queue if it doesnt exist', function(done) {
      q.sendMsg({
        body: 'first message pushed'
      }).then(function(id) {
        expect(id).to.be.a('String');
        done();
      }).then(null, done);
    });

    it('adds a message to the queue that can be retrieved with queue.receiveMsg()', function(done) {
      return q.receiveMsg().then(function(msgs) {
        expect(msgs[0].value).to.equal('first message pushed');
        return q.deleteMsg(msgs[0].receiptHandle);
      }).
      then(function() {
        done();
      }).then(null, done);
    });

    it('can queue objects', function(done) {
      return q.sendMsg({
        body: {test: '3rd msg pushed'}
      }).then(function(id) {
        expect(id).to.be.a('String');
        done();
      }).then(null, done);
    });
  });

  describe('queue.receiveMsg()', function() {
    it('sets the receiptHandle.', function(done) {
      return q.receiveMsg({visibilityTimeout:0}).then(function(msgs) {
        expect(msgs[0].receiptHandle).to.be.a('String');
        done();
      }).then(null, done);
    });
    it ('uses the visibility timeout value if specified.', function(done) {
      return q.receiveMsg({visibilityTimeout:0}).then(function(msgs) {
        expect(msgs.length).to.equal(1);
        done();
      }).then(null, done);
    });
    it('automatically converts to an object if possible', function(done) {
      return q.receiveMsg().then(function(msgs) {
        expect(msgs[0].test).to.equal('3rd msg pushed');
        thirdMessageReceiptId = msgs[0].receiptHandle;
        done();
      }).then(null, done);
    });
    it('receives null when there is no more messages to receive.', function(done) {
      q.receiveMsg().then(function(msgs) {
        expect(msgs).to.be.null();
        done();
      }).then(null, done);
    });
  });

  describe('queue.updateMsg()', function() {
    it('can update the visibility of a message', function(done) {
      q.updateMsg({id: thirdMessageReceiptId, visibilityTimeout: 0}).then(function() {
        return q.receiveMsg({visibilityTimeout:0}) // the next test requires visibility to be 0.
      })
      .then(function(msgs) {
        expect(msgs[0].test).to.equal('3rd msg pushed');
            thirdMessageReceiptId = msgs[0].receiptHandle;
        done();
      }).then(null, done);
    });
  });

  describe('queue.deleteMsg()', function() {
    it('removes the message from the queue', function(done) {
      q.deleteMsg(thirdMessageReceiptId).then(function() {
        return q.receiveMsg({visibilityTimeout:0})
      })
      .then(function(msgs) {
        expect(msgs).to.be.null();
        done();
      }).then(null, done);
    });
  });

  describe('queue.delete()', function() {
    it('deletes the queue', function(done) {
      q.ready()
          .then(function(qid) {
            expect(q._queueURL).to.equal(qid);
            return q.delete();  // the queue is gauranteed not to exist.
          })
          .then(function() {
            return q.getAllQueueIds();
          })
          .then(function(ids) {
            expect(ids).to.not.contain(q._queueURL);
            done();
          })
          .then(null, done);
    });
  });
});
