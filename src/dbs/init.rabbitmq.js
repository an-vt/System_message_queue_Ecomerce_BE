const amqp = require("amqplib");

const connectToRabbitMQ = async () => {
  try {
    const connection = await amqp.connect("amqp://localhost");
    if (!connection) throw new Error("Connection to RabbitMQ not establish");
    const channel = await connection.createChannel();

    return { connection, channel };
  } catch (error) {
    console.error(`Connect fail to RabbitMQ`, error);
  }
};

const connectToRabbitMQForTest = async () => {
  try {
    const { connection, channel } = await connectToRabbitMQ();

    // publish a message to queue
    const queue = "test-queue";
    const message = "Hello from Michael";
    await channel.assertQueue(queue);
    await channel.sendToQueue(queue, Buffer.from(message));

    // close connection
    await connection.close();
  } catch (error) {
    console.error(`Test connect fail to RabbitMQ`, error);
  }
};

module.exports = {
  connectToRabbitMQ,
  connectToRabbitMQForTest,
};
