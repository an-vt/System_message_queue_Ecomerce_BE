'use strict';

require('dotenv').config();
const messageService = require('./src/services/consumerQueue.service');
const queueName = 'send_mail';
// messageService
//   .consumerQueue(queueName)
//   .then(() => {
//     console.log(`Consumer queue ${queueName} started success`);
//   })
//   .catch((error) => {
//     console.error(`Consumer queue ${queueName} fail`, error);
//   });

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

// queue for handle send email
messageService
  .consumerQueueEmail()
  .then(() => {
    console.log(`consumerQueueEmail queue started success`);
  })
  .catch((error) => {
    console.error(`consumerQueueEmail queue fail`, error);
  });

messageService
  .consumerQueueEmailFail()
  .then(() => {
    console.log(`consumerQueueEmailFail queue started success`);
  })
  .catch((error) => {
    console.error(`consumerQueueEmailFail queue fail`, error);
  });
