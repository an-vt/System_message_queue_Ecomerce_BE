"use strict";

const { connectToRabbitMQForTest } = require("../dbs/init.rabbitmq");

describe("RabbitMQ Connection", () => {
  it("Should connect success to RabbitMQ", async () => {
    const result = await connectToRabbitMQForTest();
    expect(result).toBeUndefined();
  });
});
