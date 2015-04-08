/**
 * Created by justin on 2014-11-28.
 */

module.exports = function(queueName, provider) {
  var q = {};

  provider = provider || new AWS.SQS();  // default to sqs
  provider.delete = p.promisify(provider.deleteQueue);
  provider.sendMessage= p.promisify(provider.sendMessage);
  provider.createQueue = p.promisify(provider.createQueue);
  provider.listQueues = p.promisify(provider.listQueues);
  provider.deleteQueue = p.promisify(provider.deleteQueue);
  provider.receiveMessage = p.promisify(provider.receiveMessage);
  provider.deleteMessage = p.promisify(provider.deleteMessage);
  provider.changeMessageVisibility = p.promisify(provider.changeMessageVisibility);

  function awaitQueueCreation() {
    if (!q._queueURL) {
      return provider.createQueue({
        QueueName: queueName,
        Attributes: {
          MessageRetentionPeriod: '1209600' // 14 days total---up from the default of 4 days.
        }
      }).then(function(data) {
        q._queueURL = data.QueueUrl;
        return q._queueURL;
      });
    }
    else return p.resolve(q._queueURL);
  }

  q.ready = awaitQueueCreation;

  q.sendMsg = function(params) {
    if (_.isObject(params.body)) {
      params.body = JSON.stringify(params.body);
    }
    if (!params.body && _.isObject(params)) {
      params = {body: JSON.stringify(params)}; // the params itself can be the msg
    }
    return awaitQueueCreation().then(function(queueName) {
      return provider.sendMessage({
        MessageBody: params.body,
        QueueUrl: queueName,
        MessageAttributes: {
          //MsgType: {
          //  DataType: 'String',
          //  StringValue: 'type:parse'
          //}
        }
      }).then(function(response) {
        return response.MessageId;
      });
    });
  };

  q.receiveMsg = function(params) {
    params = params || {};
    return awaitQueueCreation().then(function(qid) {
      return provider.receiveMessage({
        QueueUrl: qid,
        VisibilityTimeout: params ? params.visibilityTimeout : undefined,
        MaxNumberOfMessages: params.max || 1,
        WaitTimeSeconds: params.waitTimeSeconds,
        AttributeNames: ['SenderId', 'SentTimestamp']
      }).then(function(data) {
        if (!data.Messages || !data.Messages.length) {
          return null;
        }
        return _.map(data.Messages, function(msg) {
          var result = parseJSON(msg.Body);
          result.receiptHandle = msg.ReceiptHandle;
          result.messageId = msg.MessageId;
          result.senderId = msg.Attributes.SenderId;
          result.sentTimestamp = msg.Attributes.SentTimestamp;
          return result;
        });
      });
    });
  };

  q.delete = function(qid) {
    qid = qid || q._queueURL;
    console.log('deleting queue: ', qid);
    return provider.deleteQueue({
      QueueUrl: qid
    });
  };

  q.getAllQueueIds = function() {
    return provider.listQueues().then(function(data) {
      return data.QueueUrls;
    })
  };

  q.deleteMsg = function(id) {
    return awaitQueueCreation().then(function(queueUrl) {
      return provider.deleteMessage({QueueUrl: queueUrl, ReceiptHandle: id});
    });
  };

  q.updateMsg = function(params, qid) {
    return awaitQueueCreation().then(function(queueUrl) {
      qid = qid || queueUrl;
      if (params.visibilityTimeout!== undefined) {
        return provider.changeMessageVisibility({
          QueueUrl: qid,
          ReceiptHandle: params.id,
          VisibilityTimeout: params.visibilityTimeout
        });
      }
      else {
        throw new Error('updateMsg(): expected "id" and "visibilityTimeout" in params.');
      }
    });
  };

  return q;
};


function parseJSON(json) {
  try {
    return JSON.parse(json);
  } catch(ex) {
    return {value: json};
  }
}