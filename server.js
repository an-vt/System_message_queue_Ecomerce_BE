"use strict";

const messageService = require("./src/services/consumerQueue.service");
const queueName = "test-topic";
const queueSendEmail = "send_mail";

messageService
  .consumerQueue(queueName)
  .then(() => {
    console.log(`Consumer queue ${queueName} started success`);
  })
  .catch((error) => {
    console.error(`Consumer queue ${queueName} fail`, error);
  });

// messageService
//   .consumerToQueueNormal()
//   .then(() => {
//     console.log(`consumerToQueueNormal queue started success`);
//   })
//   .catch((error) => {
//     console.error(`consumerToQueueNormal queue fail`, error);
//   });

// messageService
//   .consumerToQueueFail()
//   .then(() => {
//     console.log(`consumerToQueueFail queue started success`);
//   })
//   .catch((error) => {
//     console.error(`consumerToQueueFail queue fail`, error);
//   });

// consumer queue send_mail
messageService
  .consumerQueueEmail(queueSendEmail)
  .then(() => {
    console.log(`Consumer queue ${queueSendEmail} started success`);
  })
  .catch((error) => {
    console.error(`Consumer queue ${queueSendEmail} fail`, error);
  });
