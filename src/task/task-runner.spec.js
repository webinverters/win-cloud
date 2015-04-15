
"use strict";

var ModuleUnderTest = require('./task-runner');

describe('task-runner', function () {
  var config={};
  var mLogger={};
  var m;

  beforeEach(function(){
    config.loop=false;
    mLogger = {
      log: sinon.stub(),
      logError: sinon.stub()
    };

    m=ModuleUnderTest(config,mLogger);
  });


  describe('m.runTask(task)',function(){
    //task is an object with specific functions.
    it('increase task.runningtask by one')
    it('calls task.run()')
    describe('task.run() returns an error',function(){
      it('catches and logs the error')
    });
    it('decrease task.runningTask By one')
  });

  describe('m.taskify(taskName,action,queue)',function(){
    describe('only taskName and action are supplied',function(){
      it('returns a task object')
    });
    describe('queue object has been supplied',function(){
      it('returns a queue object.')
    })
  });

  describe('m.runNextScheduleTask(schedule,task)',function(){
    it('looks at the current schedule and runs it if it falls in schedule.')

  })

  describe('m.run(schedule)',function(){
    describe('no arguments has been passed in',function(){
      it('uses the schedule passed in from config')
    })
    describe('loop is set to true,',function(){
      it('loops over tasklisk indefinitely')
    })
  })


  describe("m.getDate(time,timezone)",function(){
    it('returns the correct unix timestamp',function(){
      var result=moment().tz("UTC").startOf("day").hour(12).unix();
      expect(m.getDate("12:00:00","utc")).to.equal(result)
    });

    it('returns the correct unix timestamp',function(){
      var result=moment().tz("UTC").startOf("day").hour(15).minute(12).second(14).unix();
      expect(m.getDate("15:12:14","utc")).to.equal(result)
    })

    it('returns the correct unix timestamp',function(){
      var result=moment().tz("UTC").startOf("day").hour(7).minute(2).second(0).unix();
      expect(m.getDate("7:02:00","utc")).to.equal(result)
    });

    it('returns the correct unix timestamp',function(){
      var result=moment().tz("EST").startOf("day").unix();
      expect(m.getDate("0:00:00","EST")).to.equal(result)
    })
  })

});