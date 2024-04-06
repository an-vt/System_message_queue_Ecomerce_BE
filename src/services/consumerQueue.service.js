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

      const timeoutEx = 5000;
      setTimeout(() => {
        channel.consume(notificationQueue, (msg) => {
          console.log(
            `consumerToQueueNormal Received message: ${msg.content.toString()}`
          );
          channel.ack(msg);
        });
      }, 15000);
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
