require('dotenv').config();
const axios = require('axios');
const ethers = require('ethers');
const fs = require('fs');
const { HttpsProxyAgent } = require('https-proxy-agent');

const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  white: "\x1b[37m",
  bold: "\x1b[1m"
};

const logger = {
  info: (msg) => console.log(`${colors.green}[✓] ${msg}${colors.reset}`),
  infomining: (msg) => console.log(`${colors.cyan}[✓] ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}[⚠] ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}[✗] ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}[✅] ${msg}${colors.reset}`),
  loading: (msg) => console.log(`${colors.cyan}[⟳] ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.white}[➤] ${msg}${colors.reset}`),
  banner: () => {
    console.log(`${colors.cyan}${colors.bold}`);
    console.log(`---------------------------------------------`);
    console.log(`      Stobix Bot - HiddenGem - t.me/hiddengemnews  `);
    console.log(`---------------------------------------------${colors.reset}`);
    console.log();
  }
};

const headers = {
  "accept": "application/json, text/plain, */*",
  "accept-language": "en-US,en;q=0.9",
  "content-type": "application/json",
  "priority": "u=1, i",
  "sec-ch-ua": "\"Microsoft Edge\";v=\"135\", \"Not-A.Brand\";v=\"8\", \"Chromium\";v=\"135\"",
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": "\"Windows\"",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-site",
  "Referer": "https://app.stobix.com/",
  "Referrer-Policy": "strict-origin-when-cross-origin"
};

const loadProxies = () => {
  try {
    const proxies = fs.readFileSync('proxies.txt', 'utf8').split('\n').filter(p => p.trim());
    if (proxies.length === 0) {
      logger.warn('No proxies found in proxies.txt. Proceeding without proxy.');
      return [];
    }
    return proxies.map(proxy => {
      proxy = proxy.trim();
      if (!proxy.startsWith('http')) {
        proxy = `http://${proxy}`;
      }
      return proxy;
    });
  } catch (error) {
    logger.error(`Failed to load proxies: ${error.message}`);
    return [];
  }
};

const getNonce = async (address, proxyAgent, silent = false) => {
  try {
    const response = await axios.post('https://api.stobix.com/v1/auth/nonce', 
      { address },
      { headers, httpsAgent: proxyAgent }
    );
    return response.data.nonce;
  } catch (error) {
    
    if (error.response && error.response.data) {
      
    }
    throw error;
  }
};

const verifySignature = async (nonce, signature, proxyAgent, silent = false) => {
  try {
    const response = await axios.post('https://api.stobix.com/v1/auth/web3/verify',
      { nonce, signature, chain: 8453 },
      { headers, httpsAgent: proxyAgent }
    );
    if (!silent) {
      logger.info(`Token retrieved`);
    }
    return response.data.token;
  } catch (error) {
    logger.error(`Failed to verify signature: ${error.message}`);
    if (error.response && error.response.data) {
      logger.error(`Server response: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
};

const claimTask = async (token, taskId, proxyAgent) => {
  try {
    const response = await axios.post('https://api.stobix.com/v1/loyalty/tasks/claim',
      { taskId },
      { 
        headers: { ...headers, authorization: `Bearer ${token}` },
        httpsAgent: proxyAgent
      }
    );
    logger.success(`Claimed task ${taskId}: ${response.data.points} points`);
    return true;
  } catch (error) {
    if (error.response && error.response.status === 400) {
      logger.warn(`Task ${taskId}: already claimed`);
      return false;
    }
    logger.error(`Failed to claim task ${taskId}: ${error.response ? error.response.status : 'Unknown error'} - ${error.message}`);
    if (error.response && error.response.data) {
      logger.error(`Server response: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
};

const checkMiningStatus = async (token, walletAddress, proxyAgent, silent = false) => {
  try {
    const response = await axios.get('https://api.stobix.com/v1/loyalty',
      { 
        headers: { ...headers, authorization: `Bearer ${token}` },
        httpsAgent: proxyAgent
      }
    );
    const miningClaimAt = response.data.user.miningClaimAt;
    if (miningClaimAt) {
      if (!silent) {
        logger.info(`Mining status for ${walletAddress}: claimAt ${miningClaimAt}`);
      }
      return miningClaimAt;
    }
    throw new Error('No miningClaimAt found in response');
  } catch (error) {
    logger.warn(`Failed to check mining status for ${walletAddress}: ${error.message}`);
    if (error.response && error.response.data) {
      logger.error(`Server response: ${JSON.stringify(error.response.data)}`);
    }
    const fallbackClaimAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    if (!silent) {
      logger.info(`Using fallback claimAt: ${fallbackClaimAt}`);
    }
    return fallbackClaimAt;
  }
};

const retry = async (fn, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      logger.warn(`Retrying (${i + 1}/${retries}) after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

const startMining = async (token, walletAddress, proxyAgent, silent = false) => {
  try {
    const response = await axios.post('https://api.stobix.com/v1/loyalty/points/mine',
      {},
      { 
        headers: { ...headers, authorization: `Bearer ${token}` },
        httpsAgent: proxyAgent
      }
    );
    const { amount, claimAt } = response.data;
    if (!silent) {
      logger.success(`Mining started for ${walletAddress}: ${amount} points`);
    }
    return claimAt;
  } catch (error) {
    if (error.response && error.response.status === 400 && error.response.data.error === 'Already mining') {
      logger.warn(`Wallet ${walletAddress}: already mining`);
      const claimAt = await checkMiningStatus(token, walletAddress, proxyAgent, silent);
      return claimAt;
    }
    logger.error(`Failed to start mining for ${walletAddress}: ${error.response ? error.response.status : 'Unknown error'} - ${error.message}`);
    if (error.response && error.response.data) {
      logger.error(`Server response: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
};

const displayTimeLeft = (claimAt, address) => {
  const claimTime = new Date(claimAt).getTime();
  const now = Date.now();
  const timeLeft = claimTime - now;
  if (timeLeft <= 0) {
    logger.info(`Mining ready for wallet ${address}`);
    return;
  }
  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
  logger.infomining(`Time left for wallet ${address}: ${hours}h ${minutes}m ${seconds}s`);
};

const checkMiningStatusPeriodically = async (wallets, proxies) => {
  while (true) {
    console.log('============================================');
    logger.step('Checking mining status for all wallets...');
    console.log('============================================');
    for (const wallet of wallets) {
      const { privateKey, proxy } = wallet;
      try {
        const signer = new ethers.Wallet(privateKey);
        const walletAddress = signer.address;
        let proxyAgent = null;
        if (proxy) {
          try {
            proxyAgent = new HttpsProxyAgent(proxy);
          } catch (error) {
            logger.warn(`Invalid proxy ${proxy} for ${walletAddress}. Proceeding without proxy.`);
          }
        }

        const nonce = await retry(() => getNonce(walletAddress, proxyAgent, true));
        const message = `Sign this message to authenticate: ${nonce}`;
        const signature = await signer.signMessage(message);
        const token = await retry(() => verifySignature(nonce, signature, proxyAgent, true));
        const claimAt = await checkMiningStatus(token, walletAddress, proxyAgent, true);
        displayTimeLeft(claimAt, walletAddress);

        if (new Date(claimAt).getTime() <= Date.now()) {
          const newClaimAt = await retry(() => startMining(token, walletAddress, proxyAgent, true));
          displayTimeLeft(newClaimAt, walletAddress);
        }
      } catch (error) {
        logger.error(`Error checking mining status for wallet ${wallet.address}: ${error.message}`);
      }
    }
    logger.info('Waiting 1 hour before next mining status check...');
    await new Promise(resolve => setTimeout(resolve, 60 * 60 * 1000)); 
  }
};

const processWallet = async (privateKey, proxy) => {
  if (!privateKey) {
    logger.error('Invalid private key. Skipping.');
    return null;
  }

  try {
    const signer = new ethers.Wallet(privateKey);
    const walletAddress = signer.address;
    console.log('=======================================================================');
    logger.step(`Processing wallet: ${walletAddress}`);
    console.log('=======================================================================');

    let proxyAgent = null;
    if (proxy) {
      try {
        proxyAgent = new HttpsProxyAgent(proxy);
        logger.info(`Using proxy: ${proxy}`);
      } catch (error) {
        logger.warn(`Invalid proxy ${proxy}. Proceeding without proxy.`);
      }
    } else {
      logger.warn('No proxy used for this wallet');
    }

    logger.loading('Getting nonce...');
    const nonce = await retry(() => getNonce(walletAddress, proxyAgent));
    const message = `Sign this message to authenticate: ${nonce}`;

    const signature = await signer.signMessage(message);

    logger.loading('Verifying signature...');
    const token = await retry(() => verifySignature(nonce, signature, proxyAgent));

    const tasks = [
      'follow_x',
      'join_discord',
      'join_telegram_channel',
      'join_telegram_chat',
      'start_telegram_bot',
      'leave_trustpilot_review'
    ];
    let tasksCompleted = 0;

    for (const task of tasks) {
      const success = await claimTask(token, task, proxyAgent);
      if (success) {
        tasksCompleted++;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    logger.info(`Completed ${tasksCompleted}/${tasks.length} tasks for ${walletAddress}`);

    logger.loading('Starting mining...');
    const claimAt = await retry(() => startMining(token, walletAddress, proxyAgent));

    return { privateKey, proxy, claimAt, address: walletAddress };
  } catch (error) {
    logger.error(`Error processing wallet: ${error.message}`);
    return null;
  }
};

const main = async () => {
  logger.banner();

  const proxies = loadProxies();

  const privateKeys = Object.keys(process.env)
    .filter(key => key.startsWith('PRIVATE_KEY_'))
    .map(key => process.env[key].trim())
    .filter(key => key); 

  if (privateKeys.length === 0) {
    logger.error('No private keys found in .env file. Exiting.');
    return;
  }

  const wallets = [];
  for (let i = 0; i < privateKeys.length; i++) {
    const privateKey = privateKeys[i];
    const proxy = proxies.length > 0 ? proxies[Math.floor(Math.random() * proxies.length)] : null;
    logger.info(`Processing wallet ${i + 1}/${privateKeys.length}`);
    const walletInfo = await processWallet(privateKey, proxy);
    if (walletInfo) {
      wallets.push(walletInfo);
      displayTimeLeft(walletInfo.claimAt, walletInfo.address);
    }
    if (i < privateKeys.length - 1) {
      logger.info('Waiting 5 seconds before processing next wallet...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  if (wallets.length > 0) {
    checkMiningStatusPeriodically(wallets, proxies);
  } else {
    logger.error('No valid wallets processed. Exiting.');
  }
};

main().catch(error => logger.error(`Fatal error: ${error.message}`));
