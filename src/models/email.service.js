const transporter = require('../dbs/init.nodemailer');

const sendMail = async (data, onSuccess, onError) => {
  return transporter.sendMail(data, (error, info) => {
    if (error) {
      console.log('Send email error: ', error);
      onError?.();
    } else {
      onSuccess?.();
      console.log('Email successful: ' + info.messageId);
    }
  });
};

module.exports = {
  sendMail,
};
