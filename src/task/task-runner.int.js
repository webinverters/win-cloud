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

  describe('Runs with a cloud task', function() {
    var taskQ;
    beforeEach(function() {
      taskQ = require('./task-queue')({}, null, mLogger, global.random);
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
          task.taskify('QueuedTask1', function(taskDef) {
            var result = [];
            _.each(_.range(taskDef.itemCount), function(i) {
              result.push(i);
            });
            // The taskQ is not FIFO by default (due to SQS not being FIFO)
            // therefore we add sequence number (seq) for this test...
            // This could be fixed in the future by adding "seq" automatically in the
            // TaskQueue and ensuring FIFO in there.
            taskResults[taskDef.seq]= result;
          }, 'QueuedTask')
        ]
      };
      m = ModuleUnderTest(config, mLogger);
    });
    it('runs both queued and non queued tasks.', function() {
      return taskQ.createTask('QueuedTask1', {itemCount:50, seq: 1})
        .then(function() {
          return m.run();
        })
        .then(function() {
          expect(taskResults.length).to.equal(2);
          expect(taskResults[0].length).to.equal(1000);
          expect(taskResults[1].length).to.equal(50);
        });
    });
    it('runs all queued tasks by default', function() {
      return p.join(
        taskQ.createTask('QueuedTask1', {itemCount:50, seq: 1}),
        taskQ.createTask('QueuedTask1', {itemCount:60, seq: 2}),
        taskQ.createTask('QueuedTask1', {itemCount:70, seq: 3})
      )
      .then(function() {
        return m.run();
      })
      .then(function() {
        expect(taskResults.length).to.equal(4);
        expect(taskResults[0].length).to.equal(1000);
        expect(taskResults[1].length).to.equal(50);
        expect(taskResults[2].length).to.equal(60);
        expect(taskResults[3].length).to.equal(70);
      });
    });

    it('does the same even with a schedule.', function() {
      return p.join(
        taskQ.createTask('QueuedTask1', {itemCount:50, seq: 1})
      )
      .then(function() {
        return m.run({QueuedTask1: {intervalMS: 1000}});
      })
      .then(function() { return p.delay(2000); })// add enough delay to ensure the intervalMS is hit.
      .then(function() {
        expect(taskResults[0].length).to.equal(1000);
        expect(taskResults[1].length).to.equal(50);
      });
    });

    it('runs with a specific time schdedule', function() {
      return p.join(
        taskQ.createTask('QueuedTask1', {itemCount:50, seq: 1})
      )
      .then(function() {
        return m.run({QueuedTask1: {intervalMS: 1000}});
      })
      .then(function() { return p.delay(2000); })// add enough delay to ensure the intervalMS is hit.
      .then(function() {
        expect(taskResults[0].length).to.equal(1000);
        expect(taskResults[1].length).to.equal(50);
      });
    });
  });


  describe('schedule.specificTimes', function() {
    beforeEach(function () {
      taskResults = [];
      config = {
        loop: true,
        peekIntervalMS: 1000, // change to 1 second for tests.
        taskList: [
          task.taskify('Specific-Time-Task', function() {
            var result = [];
            _.each(_.range(1000), function(i) {
              result.push(i);
            });
            taskResults.push(result);
          })
          ,
          task.taskify('Task-2', function() {
            var result = [];
            _.each(_.range(2000), function(i) {
              result.push(i);
            });

            taskResults.push(result);
          })
        ]
      };

      m = ModuleUnderTest(config, mLogger);
    });

    afterEach(function() {
      m.stopAll();  // clean up the task loop interval...
    });

    it('runs the task on the specific time using default timezone (UTC). ', function() {
      m.run({
        'Specific-Time-Task': {
          specificTimes: [
            {
              time: moment().tz("europe/london").add(3,"second").unix()*1000, // 3 seconds from now
              timezone:"europe/london"
            }
          ]
        }
      });
      return p.delay(5000)
      .then(function() {
        expect(taskResults[0].length).to.equal(2000);
        expect(taskResults[1].length).to.equal(1000);
      })
    });
    xit('runs the task on the specific time using the specified timezone', function() {
      m.run({
        'Specific-Time-Task': {
          specificTimes: [
            {

              time: (moment().tz("america/toronto").add(3,"second").unix()*1000), // 3 seconds from now
              timezone:"america/toronto"
            }
          ]
        }
      });
      return p.delay(5000)
        .then(function() {
          expect(taskResults[0].length).to.equal(2000);
          expect(taskResults[1].length).to.equal(1000);
        })
    });
  });
});




