"use strict";

const { connectToRabbitMQ, consumerQueue } = require("../dbs/init.rabbitmq");

const messageService = {
  consumerQueue: async (queueName) => {
    try {
      const { channel, connection } = await connectToRabbitMQ();
      await consumerQueue(channel, queueName);
    } catch (error) {
      console.error(`Error consumerQueue :::`, error);
    }
  },
};

module.exports = messageService;
