"use strict";

const { connectToRabbitMQ, consumerQueue } = require("../dbs/init.rabbitmq");

const log = console.log;
console.log = function () {
  log.apply(console, [new Date()].concat(arguments));
};
async function sendNotification(a, retryCount) {
  if (retryCount === 3) return Promise.resolve("Success");
  return Promise.reject("Failed");
}

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
      const MAX_RETRY = 3; // Maximum retry attempts

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

      channel.consume(
        resultQueue.queue,
        async (msgFailed) => {
          try {
            const retryCount =
              msgFailed.properties.headers["x-retry-count"] || 1;
            const delayTime = 3000;

            if (retryCount <= MAX_RETRY) {
              try {
                await sendNotification(
                  msgFailed.content.toString(),
                  retryCount
                );
                console.log("Notification sent successfully");
                channel.ack(msgFailed);
              } catch (error) {
                // If notification sending failed, increment retry count and resend the message
                setTimeout(() => {
                  console.log(
                    `Notification sending failed, retrying... ::: ${
                      retryCount * delayTime
                    }`
                  );

                  channel.sendToQueue(
                    notificationQueueHandler,
                    msgFailed.content,
                    {
                      headers: {
                        "x-retry-count": retryCount + 1,
                      },
                    }
                  );
                  channel.ack(msgFailed);
                }, retryCount * delayTime);
              }
            } else {
              console.log(
                `Maximum retry attempts reached for message: ${msgFailed.content.toString()}`
              );
              channel.ack(msgFailed);
            }
          } catch (error) {
            console.error("Error handling retry:", error);
            channel.nack(msgFailed);
          }
        },
        {
          noAck: false, // We handle acknowledgement manually
        }
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
};

module.exports = messageService;
