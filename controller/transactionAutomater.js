const botToken = process.env.BOT_API;
const channelId = process.env.CHANNEL_ID
const TRC20_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const axios = require('axios');
const {getRandomCountryByName,names} = require('./helper')

const escapeMarkdownV2 = (text) => {
    text = String(text);
    return text.replace(/([_*[\]()~`>#+\-={}|.!\\])/g, '\\$1');
};
  
const formatTxid = (txid) => {
      if (txid.length <= 8) {
      return txid; 
      }
      const firstFour = txid.substring(0, 10);
      const lastFour = txid.substring(txid.length - 10);
      return `${firstFour}...${lastFour}`;
};

const addToWidrawList = async({transaction,user,amount})=>{
  try {   

    // Prepare payload for the API
    const apiPayload = {
      txnId: transaction,
      name: user,
      country: getRandomCountryByName(user), // Assign random country here
      amount: parseFloat(amount).toFixed(2),
    };

    console.log("test ::::::::::::::: ",apiPayload);
    
    // API call
    const apiUrl = `${process.env.MAIN_SERVER_URL}/admin/withdrawal`;

    await axios.post(apiUrl, {formValue : apiPayload}, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Error sending withdraws to list :', error);
    return false
  }
}
    
const sendWithdrawMessage = async ({user,amount,transaction,type}) => {
      const fName =user.length > 3 ? `${user.substring(0, 3)}...` : user
      const escapedFName = escapeMarkdownV2(fName);
      const nAmount = parseFloat(amount).toFixed(2).toString().replace(/\./g, '\\.');

      let explorerUrl
      let formattedTxid
  
      if(transaction!=null){
          explorerUrl = `https://tronscan.org/#/transaction/${transaction}`;
          formattedTxid = formatTxid(transaction);
          formattedTxid = escapeMarkdownV2(formattedTxid)
      }
  
      const caption =`*✅ USDT Withdrawal Confirmed:*\n\n💰Amount: $${nAmount}\n👨‍💻User: ${escapedFName}\n🔗TxId:${transaction!=null ? `[${formattedTxid}](${explorerUrl})` : `${formattedTxid}`}`;
  
      const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
      
      const params = {
        chat_id: channelId,
        photo: 
          type==='payout' 
            ? 'https://res.cloudinary.com/dj5inosqh/image/upload/v1726167463/IMG_1444_o6wjzi.png' 
            : 'https://res.cloudinary.com/dj5inosqh/image/upload/v1726058380/IMG_1440_izjgwv.png',
        caption: caption, 
        parse_mode: 'MarkdownV2',
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [
              {
                text: 'Discord',
                url: 'https://discord.gg/67PcC6U4db',
              },
              {
                text: 'Login',
                url: 'https://www.realtradecapital.com/login',
              }
            ], 
          ],
        }),
      };
    
      try {
        const response = await axios.post(url, params);
        // console.log('Photo sent successfully:', response.data);

        await addToWidrawList({transaction,user,amount})
      } catch (error) {
        console.error('Error sending photo:', error.response ? error.response.data : error.message);
      }
      return true
}
  
const fetchUsdtTransactions = async()=> {
    try {
        const response = await axios.get(`https://api.tronscan.org/api/token_trc20/transfers?limit=50&start=0&contract_address=${TRC20_CONTRACT}`);
        
        const transactions = response.data.token_transfers || []; 
        
        if (!transactions || transactions.length === 0) {
            console.log('No transactions found');
            return [];
        }
        console.log(transactions.length);
        
        const isContractAddress = async (address) => {
          try {
              const contractCheckResponse = await axios.get(`https://api.tronscan.org/api/account?address=${address}`);
              return contractCheckResponse.data.isContract;
          } catch (error) {
              console.error(`Error checking address ${address}:`, error);
              return false;
          }
        };
        
        const filteredTransactions = [];
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
        for (const tx of transactions) {
            const amount = parseFloat(tx.quant) / 1e6;
            if (amount >= 100 && amount <= 10000) {
                // const fromIsContract = await isContractAddress(tx.from_address);
                // await delay(2000);
                // const toIsContract = await isContractAddress(tx.to_address);
                // if (!fromIsContract && !toIsContract) {
                  filteredTransactions.push(tx);
                  //  return filteredTransactions
                // }
            }
          await delay(2000);
        }
        
        return filteredTransactions;
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }
}

function getRandomName(lang) {
    const languageNames = names[lang] || names.en;
    
    if (lang === 'en') {
        const weightedNames = [...languageNames, ...languageNames, ...languageNames]; 
        return weightedNames[Math.floor(Math.random() * weightedNames.length)];
    }
    
    return languageNames[Math.floor(Math.random() * languageNames.length)];
}

const notifyTransactions = async({type,wallet})=> {
    const lang =  'en' 
    const userName = getRandomName(lang);
    try {
      if(type == 'withdraw'){
          if(wallet=='usdt'){
              const transactions = await fetchUsdtTransactions();
              if (transactions.length === 0) {
                  console.log('No transactions in the specified range.');
                  return;
              }

              console.log(transactions.length , 'transactions');
              
              const targetTransaction = transactions.find(tx => {
                  const amount = parseFloat(tx.quant) / 1e6;
                  return amount >= 500 && amount < 3000 && amount % 5 !== 0;;
              });

              const selectedTransaction = targetTransaction || transactions[0];
              console.log( 'target withdraw transaction :',selectedTransaction );
              const amount = parseFloat(selectedTransaction.quant) / 1e6;
              
              if(selectedTransaction == null){
                  return;
              }

              await sendWithdrawMessage({
                  user: userName,
                  amount: amount,
                  wallet: 'main',
                  transaction: selectedTransaction.transaction_id,
                  type:'withdraw'
              });
          }
      }
      if(type == 'payout'){
        if(wallet=='usdt'){
            const transactions = await fetchUsdtTransactions();
            if (transactions.length === 0) {
                console.log('No transactions in the specified range.');
                return;
            }

            console.log(transactions.length , 'transactions');
            
            const targetTransaction = transactions.find(tx => {
                const amount = parseFloat(tx.quant) / 1e6;
                return amount >= 20 && amount < 200;
            });

            const selectedTransaction = targetTransaction 
            console.log( 'target withdraw transaction :',selectedTransaction );
            const amount = parseFloat(selectedTransaction.quant) / 1e6;
            
            if(selectedTransaction == null){
                return;
            }

            await sendWithdrawMessage({
                user: userName,
                amount: amount,
                wallet: 'main',
                transaction: selectedTransaction.transaction_id,
                 type:'payout'
            });
        }
    }
    } catch (error) {
        console.error('Unexpected error in notifyTransactions function:', error);
    }
}

module.exports = {
    notifyTransactions,
}