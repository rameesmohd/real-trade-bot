const cron = require('node-cron');
const { notifyTransactions } = require('./controller/transactionAutomater');

const randomNotify = async() => {
    // Generate a random number of notifications between 10 and 20
    const numberOfNotifications = Math.floor(Math.random() * 11) + 10;

    for (let i = 0; i < numberOfNotifications; i++) {
        const randomHours = Math.floor(Math.random() * 24);
        const randomMinutes = Math.floor(Math.random() * 60);
        const randomMilliseconds = ((randomHours * 60) + randomMinutes) * 60 * 1000;

        setTimeout(async () => {
            await notifyTransactions({ type: 'withdraw', wallet: 'usdt' });
        }, randomMilliseconds);
    }
};

// Schedule the randomNotify function to run once daily at midnight
cron.schedule('0 0 * * *', randomNotify)

module.exports = {
    randomNotify
};


