/**
 * Created by justin on 2014-11-29.
 */

var TaskQueue = require('./task-queue');

describe('task-queue.js', function() {
  var m, mQueue, mEventLog, mLogger, mQ, mIdGen;

  var fakeTaskDef = {task: 'testTask', taskId: 'guid', receiptHandle: 'mock'};
  var fakeTaskData = {test: 'testdata'};

  beforeEach(function() {
    mQ = {
      sendMsg: sinon.stub().resolves('123'),
      receiveMsg: sinon.stub().resolves([fakeTaskDef]),
      deleteMsg: sinon.stub().resolves(true)
    };
    mQueue = sinon.stub().returns(mQ);

    mLogger = {
      logError: sinon.stub(),
      log: sinon.stub()
    };

    mIdGen = {
      getGUID: function() { return 'uniqueId' }
    };

    m = TaskQueue({}, mQueue, mLogger, mIdGen);
  });

  describe('TaskQueue()', function() {
    it('stores event log on itself', function() {
      expect(m._logger).to.equal(mLogger);
    });
  });

  describe('q.createTask(name, data)', function() {
    it('creates the task definition via the factory func provided.', function() {
      var data = {test: 'test'};
      return m.createTask('testTask', data).then(function(task) {
        expect(mQ.sendMsg).to.have.been.called;
      });
    });

    describe('if the conversion into a task definition throws an exception:', function() {
      it('logs a CREATE_TASK_FAILED event.', function() {
        var data = {test: 'test'};
        return m.createTask('fakeTask', data).then(null, function(err) {
          return expect(mLogger.logError).to.have.been.calledWith('CREATE_TASK_FAILED', {task:'fakeTask', data: data, err:err});
        });
      });
    });

    it('adds the task to the queue.', function() {
      return m.createTask('testTask', fakeTaskData).then(function(task) {
        expect(task.transactionId).to.equal(mIdGen.getGUID());
        expect(task.taskId).to.equal(mIdGen.getGUID());
        expect(mQ.sendMsg).to.have.been.calledWith({body:task});
      });
    });

    it('logs a task creation success event.', function() {
      return m.createTask('testTask', fakeTaskData).then(function(task) {
        expect(mLogger.log).to.have.been.calledWith(
            'CREATE_TASK_SUCCESS', task);
      });
    });

    describe('if the task fails to be added the queue.', function(done) {
      beforeEach(function() {
        mQ.sendMsg = sinon.stub().rejects('some error');
      });

      it('rejects with "Queue inaccessible error."', function(done) {
        return m.createTask('testTask', fakeTaskData).then(function(task) {
          done('Failed to report queue communication error.');
        }).then(null, function(err) {
          expect(err.message).to.equal('Queue inaccessible error.');
          done();
        });
      });

      it('logs CREATE_TASK_FAILED error event.', function() {
        return m.createTask('testTask', fakeTaskData).then(function(task) {
        }).then(null, function(err) {
          expect(mLogger.logError).to.have.been.calledWith('CREATE_TASK_FAILED',
              {taskId:'uniqueId', taskName:'testTask',
                test:'testdata', transactionId: 'uniqueId', err: err});
        });
      });
    });
  });

  describe('q.pullNextTask()', function() {
    it('receives the next task from the queue.', function() {
      return m.pullNextTask('testTask').then(function(task) {
        expect(task).to.equal(fakeTaskDef);
      });
    });
    it('logs a TASK_STARTED event.', function() {
      return m.pullNextTask('testTask').then(function(task) {
        expect(mLogger.log).to.have.been.calledWith('TASK_STARTED', task);
      });
    });
  });

  // TODO: look into handling edge cases around failing to mark a task complete before
  // visibility timeout elapses.
  describe('q.completeTask(task)', function() {
    it('removes the task from the queue.', function() {
      return m.pullNextTask('testTask').then(function(task) {
        return m.completeTask('testTask', task).then(function() {
          expect(mQ.deleteMsg).to.have.been.calledWith(task.receiptHandle);
        });
      });
    });

    it('logs a TASK_COMPLETED event.', function() {
      return m.pullNextTask('testTask').then(function(task) {
        return m.completeTask('testTask',task).then(function() {
          expect(mLogger.log).to.have.been.calledWith('TASK_COMPLETED', task);
        });
      });
    });
  });
});