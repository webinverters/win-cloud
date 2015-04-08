/**
 * @module myModule
 * @summary: This module's purpose is to:
 *
 * @description:
 *
 * Author: justin
 * Created On: 2015-04-07.
 * @license Apache-2.0
 */

"use strict";

var ModuleUnderTest = require('./task-runner');

describe('task-runner', function () {
  var m, config;

  var mLogger, task;  // task is used as just a namespace for taskify().

  var taskResults = [];
  beforeEach(function () {
    mLogger = {
      log: sinon.stub(),
      logError: sinon.stub()
    };

    task = ModuleUnderTest(config, mLogger); // used as a namespace for taskify...

    config = {
      loop: false,
      peekIntervalMS: 1000, // change to 1 second for tests.
      taskList: [
        task.taskify('Make-1000-ItemsTask', function() {
          var result = [];
          _.each(_.range(1000), function(i) {
            result.push(i);
          });
          taskResults.push(result);
        })
      ]
    };

    m = ModuleUnderTest(config, mLogger);
  });

  afterEach(function() {
    taskResults = [];
  });

  describe('run()', function() {
    describe('one task', function() {
      it('runs to completion.', function() {
        return m.run()
          .then(function() {
            expect(taskResults.length).to.equal(1);
            expect(taskResults[0].length).to.equal(1000);
          });
      });
    });

    describe('multiple tasks', function() {
      beforeEach(function () {
        config = {
          loop: false,
          peekIntervalMS: 1000, // change to 1 second for tests.
          taskList: [
            task.taskify('Make-1000-ItemsTask', function() {
              var result = [];
              _.each(_.range(1000), function(i) {
                result.push(i);
              });
              taskResults.push(result);
            }),
            task.taskify('Make-1000-ItemsTask2', function() {
              var result = [];
              _.each(_.range(2000), function(i) {
                result.push(i);
              });
              taskResults.push(result);
            }),
            task.taskify('Make-1000-ItemsTask3', function() {
              var result = [];
              _.each(_.range(3000), function(i) {
                result.push(i);
              });
              taskResults.push(result);
            })
          ]
        };

        m = ModuleUnderTest(config, mLogger);
      });

      it('runs all tasks to completion in task list order.', function() {
        return m.run()
          .then(function() {
            expect(taskResults.length).to.equal(3);
            expect(taskResults[0].length).to.equal(1000);
            expect(taskResults[1].length).to.equal(2000);
            expect(taskResults[2].length).to.equal(3000);
          });
      });
    });

    describe('a task throws an error', function() {
      beforeEach(function () {
        config = {
          loop: false,
          peekIntervalMS: 1000, // change to 1 second for tests.
          taskList: [
            task.taskify('Make-1000-ItemsTask', function() {
              var result = [];
              _.each(_.range(1000), function(i) {
                result.push(i);
              });
              taskResults.push(result);
            }),
            task.taskify('Make-1000-ItemsTask2', function() {
              var result = [];
              _.each(_.range(1000), function(i) {
                result.push(i);
              });
              throw error('TEST_ERROR', 'Help I am dying');
            }),
            //NOTE: notice that we are mixing async tasks with sync ones
            // and the tests should still pass.
            task.taskify('Make-1000-ItemsTask3', function() {
              var deferred = p.defer();
              setTimeout(function() {
                var result = [];
                _.each(_.range(1000), function(i) {
                  result.push(i);
                });
                taskResults.push(result);
                deferred.resolve();
              });
              return deferred.promise;
            })
          ]
        };

        m = ModuleUnderTest(config, mLogger);
      });

      it('runs healthy tasks to completion.', function() {
        return m.run()
          .then(function() {
            expect(taskResults.length).to.equal(2);
            expect(taskResults[0].length).to.equal(1000);
            expect(taskResults[1].length).to.equal(1000);
          });
      });

      it('calls logger.logError on task failure.', function() {
        return m.run()
          .then(function() {
            expect(mLogger.logError).to.have.been.called.once;
            expect(mLogger.logError).to.have.been.calledWith('TASK_ERROR');
          });
      });
    });
  });
});