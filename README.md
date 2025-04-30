# Stobix Auto Mining Start Bot

## Overview

Stobix Auto Bot is an automated tool designed to interact with the Stobix platform for airdrop farming. The bot automates the following tasks:

- Automatically claims available tasks
- Starts and monitors mining operations
- Handles multiple wallets with proxy support
- Periodic monitoring of mining status

## Register : https://stobix.com/invite/1c2az

## Features

- ✅ Multi-wallet support
- ✅ Proxy support for avoiding IP restrictions
- ✅ Automated task claiming
- ✅ Auto-mining with periodic status checks
- ✅ Colorful console logging
- ✅ Error handling with retry mechanisms

## Requirements

- Node.js (v16 or newer)
- npm or yarn

## Installation

1. Clone the repository:

```bash
git clone https://github.com/BidyutRoy2/stobix.git
cd stobix
```

2. Install dependencies:

```bash
npm install
```

3. Edit .env File & Add Your EVM Wallet Private Key (CTRL+X+Y+ENTER) To Save
```
nano .env
```

### How to Setup Multi Wallet
```
PRIVATE_KEY_1=32302cbe95c10 Your EVM Wallet Private Key
PRIVATE_KEY_2=your_second_private_key_here
```

Start the bot with:

```
npm Start
```

(Optional) Configure proxies by creating a `proxies.txt` file with one proxy per line:

```
http://username:password@proxy1.example.com:8080
username:password@proxy2.example.com:8080
```

The bot will:
1. Process each wallet sequentially
2. Claim available tasks
3. Start mining operations if not already mining
4. Monitor mining status every hour and restart mining when ready

## Tasks Automated

The bot automates claiming points for the following tasks:
- Following on X (Twitter)
- Joining Discord server
- Joining Telegram channel
- Joining Telegram chat
- Starting Telegram bot
- Leaving Trustpilot review

## Console Output

The bot provides detailed colored console output:
- ✅ Green: Success messages
- ⚠️ Yellow: Warning messages
- ❌ Red: Error messages
- ⟳ Cyan: Loading/Information messages
- ➤ White: Step indicators

## Disclaimer

This bot is provided for educational purposes only. Use at your own risk. The developers are not responsible for any consequences resulting from the use of this bot.
