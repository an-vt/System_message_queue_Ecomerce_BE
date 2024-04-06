"use strict";

const { connectToRabbitMQ, consumerQueue } = require("../dbs/init.rabbitmq");

const log = console.log;
console.log = function () {
  log.apply(console, [new Date()].concat(arguments));
};

const messageService = {
  consumerQueue: async (queueName) => {
    try {
      const { channel, connection } = await connectToRabbitMQ();
      await consumerQueue(channel, queueName);
    } catch (error) {
      console.error(`Error consumerQueue :::`, error);
    }
  },
  consumerToQueueNormal: async () => {
    try {
      const { channel } = await connectToRabbitMQ();
      const notificationQueue = "notificationQueueProcess";

      // 1. Handle Error TTL
      // const timeoutEx = 5000;
      // setTimeout(() => {
      //   channel.consume(notificationQueue, (msg) => {
      //     console.log(
      //       `consumerToQueueNormal Received message: ${msg.content.toString()}`
      //     );
      //     channel.ack(msg);
      //   });
      // }, timeoutEx);

      // 2. Handle Error Logic
      channel.consume(notificationQueue, (msg) => {
        try {
          const randomNum = Math.random();
          if (randomNum < 0.8) {
            throw new Error("Send notification failed, HOT FIXED");
          }

          console.log(
            `consumerToQueueNormal Received message: ${msg.content.toString()}`
          );
          channel.ack(msg);
        } catch (error) {
          // nack: negative acknowledgment
          // allUpTo (first boolean): if false message sẽ đươc đẩy vào hàng đợi vị lỗi, if true message sẽ được đẩy vào hàng đợi ban đầu
          // requeue (second boolean): if false only message will be discarded, if true it will be requeued.
          channel.nack(msg, false, false);
        }
      });
    } catch (error) {
      console.error(error);
    }
  },
  consumerToQueueFail: async () => {
    try {
      const { channel } = await connectToRabbitMQ();
      const notificationQueueHandler = "notificationQueueHotfix";
      const notificationExchangeDLX = "notificationExDLX";
      const notificationRoutingKeyDLX = "notificationRoutingKeyDLX";

      await channel.assertExchange(notificationExchangeDLX, "direct", {
        durable: true,
      });

      const resultQueue = await channel.assertQueue(notificationQueueHandler, {
        exclusive: false,
      });

      await channel.bindQueue(
        resultQueue.queue,
        notificationExchangeDLX,
        notificationRoutingKeyDLX
      );

      await channel.consume(
        resultQueue.queue,
        (msgFailed) => {
          console.log(
            `consumerToQueueFail error message: ${msgFailed.content.toString()}, please hot fix`
          );
        },
        {
          noAck: true,
        }
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
};

module.exports = messageService;
