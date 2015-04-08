/**
 * Created by justin on 2014-11-30.
 */

var EventLogger = require('./event-logger');

describe('if it fails to add the event', function() {
  it('logs error to file.');
});

describe('event-logger', function() {
  var m, mQueue;

  beforeEach(function() {
    mQueue = {
      sendMsg: sinon.stub().resolves('msgid'),
      receiveMsg: sinon.stub().resolves([
        {
          eventLabel: 'FIRST'
        },
        {
          eventLabel: 'SECOND'
        },
        {
          eventLabel: 'THIRD'
        }
      ])
    };

    m = EventLogger({}, mQueue);
  });
  describe('logging an event', function() {
    describe('logger.log(eventLabel, details)', function() {
      it('logs the event to the queue', function() {
        return m.log('SOME_TEST_LABEL', {}).then(function(id) {
          expect(id).to.equal('msgid');
          expect(mQueue.sendMsg).to.have.been.calledWith(sinon.match({
            eventLabel: 'SOME_TEST_LABEL',
            details: {}
          }));
        });
      });
      describe('error sending or connecting to queue', function() {
        beforeEach(function(){
          sinon.spy(console,'log');
        });
        afterEach(function(){
          console.log.restore();
        });
        xit('logs error to error console.',function(){
          return m.logEvent('SOME_TEST_LABEL', {}).then(function(id) {
            expect(console.log).to.be.calledWith("failed to connect to queue")
          })
        });
        //it('retries every minute');
      });
    });

    describe('logger.logError(eventLabel, details)', function() {
      beforeEach(function(){
        sinon.spy(console,'log');
      });
      afterEach(function(){
        console.log.restore();
      });
      it('logs the event to the queue', function() {
        return m.logError('SOME_TEST_LABEL', {}).then(function(id) {
          expect(id).to.equal('msgid');
          expect(mQueue.sendMsg).to.have.been.calledWith(sinon.match({
            eventLabel: 'SOME_TEST_LABEL',
            details: {}
          }));
        });
      });
      xdescribe('error sending or connecting to queue', function() {
        it('logs error to error console.',function(){
          return m.logError('SOME_TEST_LABEL', {}).then(function(id) {

          });
          //expect(console.log).to.have.been.called
        });
        it('retries every minute');
      });
    });
  });

  describe('logger.getEvents(options)', function() {
    describe('called with no parameters', function() {
      it('resolves the next event in the queue', function() {
        return m.getEvents().then(function(events) {
          expect(mQueue.receiveMsg).to.have.been.calledWith(undefined);
        });
      });
    });
    it('resolves up to max events from the queue', function() {
      return m.getEvents({max: 3}).then(function() {
        return m.getEvents().then(function(events) {
          expect(mQueue.receiveMsg).to.have.been.calledWith({
            max: 3});
          expect(events[0]).to.deep.equal({ eventLabel: 'FIRST'});
        });
      });
    });

    it('uses options.visibilityTimeout', function() {
      return m.getEvents({visibilityTimeout: 0}).then(function() {
        return m.getEvents().then(function(events) {
          expect(mQueue.receiveMsg).to.have.been.calledWith({visibilityTimeout: 0});
        });
      });
    });

    describe('If no events in the event queue:', function() {
      beforeEach(function() {
        mQueue.receiveMsg = sinon.stub().resolves([]);
      });
      it('resolves an empty array', function() {
        return m.getEvents().then(function(events) {
          expect(events.length).to.equal(0);
        });
      });
    });

    //should be handled in constructor?
    //describe('error sending or connecting to queue', function() {
    //  it('logs error to error console.');
    //  it('retries every minute');
    //});
  });
});