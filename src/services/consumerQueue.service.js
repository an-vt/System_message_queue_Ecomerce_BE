'use strict';

const { connectToRabbitMQ, consumerQueue } = require('../dbs/init.rabbitmq');
const { sendMail } = require('../models/email.service');

const log = console.log;
console.log = function () {
  log.apply(console, [new Date()].concat(arguments));
};
async function sendNotification(a, retryCount) {
  return Promise.reject('Failed');
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
      const notificationQueue = 'notificationQueueProcess';

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
          if (randomNum < 1) {
            throw new Error('Send notification failed, HOT FIXED');
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
      const notificationQueueHandler = 'notificationQueueHotfix';
      const notificationExchangeDLX = 'notificationExDLX';
      const notificationRoutingKeyDLX = 'notificationRoutingKeyDLX';
      const MAX_RETRY = 3; // Maximum retry attempts

      await channel.assertExchange(notificationExchangeDLX, 'direct', {
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
              msgFailed.properties.headers['x-retry-count'] || 1;
            const delayTime = 3000;

            if (retryCount <= MAX_RETRY) {
              try {
                await sendNotification(
                  msgFailed.content.toString(),
                  retryCount
                );
                console.log('Notification sent successfully');
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
                        'x-retry-count': retryCount + 1,
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
            }
          } catch (error) {
            console.error('Error handling retry:', error);
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
  consumerQueueEmail: async () => {
    try {
      const { channel } = await connectToRabbitMQ();
      const emailQueue = 'emailQueueProcess';
      const emailExchangeDLX = 'emailExDLX';
      const emailRoutingKeyDLX = 'emailRoutingKeyDLX';

      // ensure have queue before consume
      await channel.assertQueue(emailQueue, {
        durable: true,
        deadLetterExchange: emailExchangeDLX,
        deadLetterRoutingKey: emailRoutingKeyDLX,
      });

      // 2. Handle Error Logic
      channel.consume(emailQueue, async (msg) => {
        const data = JSON.parse(msg.content.toString());
        await sendMail(
          data,
          () => channel.ack(msg),
          () => channel.nack(msg, false, false)
        );
      });
    } catch (error) {
      console.error(error);
    }
  },
  consumerQueueEmailFail: async () => {
    try {
      const { channel } = await connectToRabbitMQ();
      const emailQueueHandler = 'emailQueueHotfix';
      const emailExchangeDLX = 'emailExDLX';
      const emailRoutingKeyDLX = 'emailRoutingKeyDLX';
      const MAX_RETRY = 3; // Maximum retry attempts

      // create exchange if not exist
      await channel.assertExchange(emailExchangeDLX, 'direct', {
        durable: true,
      });

      // create queue if not exist
      const resultQueue = await channel.assertQueue(emailQueueHandler, {
        exclusive: false,
      });

      // bind queue to exchange
      await channel.bindQueue(
        resultQueue.queue,
        emailExchangeDLX,
        emailRoutingKeyDLX
      );

      channel.consume(
        resultQueue.queue,
        async (msgFailed) => {
          const data = JSON.parse(msgFailed.content.toString());

          try {
            const retryCount =
              msgFailed.properties.headers['x-retry-count'] || 1;
            const delayTime = 3000;

            if (retryCount <= MAX_RETRY) {
              await sendMail(
                data,
                () => channel.ack(msgFailed),
                () => {
                  // If email sending failed, increment retry count and resend the message
                  setTimeout(() => {
                    console.log(
                      `Email sending failed, retrying... ::: ${
                        retryCount * delayTime
                      }`
                    );

                    channel.sendToQueue(emailQueueHandler, msgFailed.content, {
                      headers: {
                        'x-retry-count': retryCount + 1,
                      },
                    });
                    channel.ack(msgFailed);
                  }, retryCount * delayTime);
                }
              );
            } else {
              console.log(
                `Maximum retry attempts reached for message: ${msgFailed.content.toString()}`
              );
              channel.ack(msgFailed);
            }
          } catch (error) {
            console.error('Error handling retry:', error);
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
