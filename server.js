"use strict";

const messageService = require("./src/services/consumerQueue.service");
const queueName = "test-topic";
messageService
  .consumerQueue(queueName)
  .then(() => {
    console.log(`Consumer queue ${queueName} started success`);
  })
  .catch((error) => {
    console.error(`Consumer queue ${queueName} fail`, error);
  });
