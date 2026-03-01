# QuantX: Decentralized Recurring Payments Infrastructure for Web3

<div align="center">

<img width="595" height="452" alt="image" src="https://github.com/user-attachments/assets/714580e4-cc93-48f2-a111-a5bd269d784b" />



**The "Stripe" for Web3 Recurring Payments**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Stellar](https://img.shields.io/badge/Stellar-Soroban-blue.svg)](https://stellar.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-blue.svg)](https://www.typescriptlang.org/)
[![Rust](https://img.shields.io/badge/Rust-1.70+-orange.svg)](https://www.rust-lang.org/)

[Live Demo](https://quantx.fi) • [Documentation](https://docs.quantx.fi) • [Contract Explorer](https://stellar.expert) • [Discord](https://discord.gg/quantx)

</div>

---


###UI
<img width="1919" height="906" alt="image" src="https://github.com/user-attachments/assets/777b3649-823c-45fc-802f-676fabe19898" />

<img width="1919" height="917" alt="image" src="https://github.com/user-attachments/assets/eb1c4ad7-2978-476f-9637-3b5591fc39b5" />

<img width="343" height="628" alt="image" src="https://github.com/user-attachments/assets/4a39a08e-aac4-4214-9520-daea8e438084" />




## 🎯 Overview

QuantX is a **Recurring Finance Infrastructure (RFI)** protocol built on Stellar's Soroban smart contract platform. It solves the critical automation gap in Web3 by enabling trustless, non-custodial recurring payments using stablecoins (USDC/XLM).

Unlike traditional Web3 transactions that require manual signing for each payment, QuantX implements a smart contract vault system allowing users to pre-authorize recurring payments while maintaining full custody of their assets.

### 🏆 Key Features

- ✅ **Non-Custodial:** Users maintain full control of their funds
- ✅ **Trustless Automation:** Smart contracts execute payments based on predefined conditions
- ✅ **Multi-Token Support:** USDC, XLM, and other Stellar assets
- ✅ **Flexible Scheduling:** Daily, weekly, monthly, or custom intervals
- ✅ **Multi-Platform:** Web dashboard, SDK integration, and Telegram bot
- ✅ **Gas-Efficient:** Optimized Soroban contracts with minimal transaction costs
- ✅ **Decentralized Execution:** Open keeper network for payment triggering

---

## 📋 Table of Contents

- [Use Cases](#-use-cases)
- [System Architecture](#-system-architecture)
- [Smart Contract Details](#-smart-contract-details)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Local Development](#local-development)
- [Usage Guide](#-usage-guide)
  - [Web Dashboard](#1-web-dashboard)
  - [SDK Integration](#2-sdk-integration)
  - [Telegram Bot](#3-telegram-bot)
- [Smart Contract Deployment](#-smart-contract-deployment)
- [API Reference](#-api-reference)
- [Security](#-security)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 💡 Use Cases

### For SaaS & Content Creators
- **Subscription Services:** Accept recurring payments for your SaaS, newsletter, or premium content
- **Membership Platforms:** Automate member dues and tiered access
- **Creator Economy:** Enable fans to support creators with automated monthly contributions

### For DAOs & Employers
- **Automated Payroll:** Schedule recurring payments to contributors and employees
- **Vesting Schedules:** Implement token vesting with automated distributions
- **Treasury Management:** Automate recurring operational expenses

### For DeFi Protocols
- **Dollar-Cost Averaging:** Enable users to automate investment strategies
- **Loan Repayments:** Schedule automated loan installments
- **Yield Distribution:** Automate rewards distribution to stakeholders

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interfaces                          │
├──────────────────┬──────────────────┬──────────────────────────┤
│  Web Dashboard   │   Telegram Bot   │   Third-party dApps      │
│   (Next.js)      │   (Telegraf)     │   (via SDK)              │
└────────┬─────────┴────────┬─────────┴──────────┬───────────────┘
         │                  │                    │
         └──────────────────┼────────────────────┘
                            │
                   ┌────────▼────────┐
                   │   QuantX SDK    │
                   │  (TypeScript)   │
                   └────────┬────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
    ┌────▼─────┐   ┌───────▼────────┐   ┌────▼─────┐
    │ Freighter│   │ Soroban RPC    │   │ Horizon  │
    │  Wallet  │   │   Indexer      │   │   API    │
    └────┬─────┘   └───────┬────────┘   └────┬─────┘
         │                  │                  │
         └──────────────────┼──────────────────┘
                            │
                ┌───────────▼────────────┐
                │   Stellar Blockchain   │
                ├────────────────────────┤
                │  QuantX Smart Contract │
                │  - Subscription Vault  │
                │  - Payment Executor    │
                │  - Token Allowances    │
                └───────────┬────────────┘
                            │
                ┌───────────▼────────────┐
                │   Keeper Network       │
                │  (Automated Executors) │
                └────────────────────────┘
```

### Architecture Components

#### 1. **User Layer**
- **Web Dashboard:** Next.js application for creating and managing subscriptions
- **Telegram Bot:** Chat interface for subscription management on-the-go
- **SDK:** TypeScript library for third-party integrations

#### 2. **Integration Layer**
- **QuantX SDK:** Handles wallet connections, transaction building, and state management
- **Dual-Layer Polling:** Bridges Soroban RPC and Horizon API for reliable transaction indexing

#### 3. **Blockchain Layer**
- **Smart Contracts:** Rust-based Soroban contracts managing vaults and payment logic
- **Token Standards:** Compatible with SEP-41 (Stellar Asset Contract)

#### 4. **Execution Layer**
- **Keeper Network:** Decentralized nodes monitoring and triggering due payments
- **Incentive Mechanism:** Executors earn fees for successfully processing payments

---

## 📜 Smart Contract Details

### Contract Addresses

#### Testnet Deployment
```
Network: Stellar Testnet (Soroban)
Contract ID: CDIDTRRDNMK4D6CIWFNLEML5L6FCVLMEVKCXXSAB6PJZ3J5JS74M7GFD
Explorer: https://stellar.expert/explorer/testnet/contract/[CONTRACT_ID]
```

#### Mainnet Deployment
```
Status: Pending Security Audit
Expected Launch: Q2 2025
```

### Core Contract Functions

#### 1. **create_subscription**
```rust
pub fn create_subscription(
    env: Env,
    payer: Address,
    recipient: Address,
    token: Address,
    amount: i128,
    interval: u64,
    start_time: u64,
) -> Result<u64, Error>
```
Creates a new recurring payment subscription.

**Parameters:**
- `payer`: Address authorizing the recurring payment
- `recipient`: Address receiving the payments
- `token`: Asset contract address (USDC, XLM, etc.)
- `amount`: Payment amount per interval
- `interval`: Time between payments (in seconds)
- `start_time`: Unix timestamp for first payment

**Returns:** Subscription ID

#### 2. **execute_payment**
```rust
pub fn execute_payment(
    env: Env,
    subscription_id: u64,
) -> Result<(), Error>
```
Executes a due payment for an active subscription.

**Authorization:** Can be called by anyone (keeper network)

**Validation:**
- Checks if payment is due based on timestamp
- Verifies payer has sufficient allowance
- Ensures payer has adequate balance

#### 3. **cancel_subscription**
```rust
pub fn cancel_subscription(
    env: Env,
    subscription_id: u64,
) -> Result<(), Error>
```
Cancels an active subscription.

**Authorization:** Only subscription payer or recipient

#### 4. **get_subscription**
```rust
pub fn get_subscription(
    env: Env,
    subscription_id: u64,
) -> Subscription
```
Retrieves subscription details.

**Returns:**
```rust
pub struct Subscription {
    pub payer: Address,
    pub recipient: Address,
    pub token: Address,
    pub amount: i128,
    pub interval: u64,
    pub next_payment: u64,
    pub is_active: bool,
}
```

### Security Features

- **Allowance-Based:** Contract uses token allowances, never holding user funds
- **Time-Locked:** Payments can only execute after designated intervals
- **Atomic Transactions:** All operations are atomic, preventing partial states
- **Reentrancy Protection:** Guard mechanisms prevent reentrancy attacks
- **Access Control:** Role-based permissions for sensitive operations

---

## 📁 Project Structure

```
QuantX/
├── contracts/                  # Soroban Smart Contracts
│   ├── src/
│   │   ├── lib.rs             # Main contract logic
│   │   ├── storage.rs         # Storage definitions
│   │   ├── types.rs           # Custom types
│   │   └── test.rs            # Contract tests
│   ├── Cargo.toml
│   └── README.md
│
├── quantx-sdk/                 # TypeScript SDK
│   ├── src/
│   │   ├── contract/          # Contract interaction layer
│   │   ├── wallet/            # Wallet connection handlers
│   │   ├── polling/           # Transaction status polling
│   │   └── types/             # TypeScript definitions
│   ├── package.json
│   └── README.md
│
├── quantx-bot/                 # Telegram Bot
│   ├── src/
│   │   ├── bot.ts             # Bot initialization
│   │   ├── commands/          # Command handlers
│   │   ├── scenes/            # Conversation flows
│   │   └── utils/             # Helper functions
│   ├── package.json
│   └── README.md
│
├── web/                        # Next.js Web Dashboard
│   ├── app/
│   │   ├── (dashboard)/       # Dashboard routes
│   │   ├── api/               # API routes
│   │   └── layout.tsx
│   ├── components/            # React components
│   ├── lib/                   # Utilities
│   ├── public/                # Static assets
│   └── package.json
│
├── keeper/                     # Automated Executor
│   ├── src/
│   │   ├── monitor.ts         # Subscription monitoring
│   │   ├── executor.ts        # Payment execution
│   │   └── config.ts          # Configuration
│   └── package.json
│
├── docs/                       # Documentation
├── scripts/                    # Deployment scripts
├── .github/                    # GitHub workflows
└── README.md                   # This file
```

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **Rust** (v1.70 or higher)
- **Stellar CLI** (Soroban)
- **Git**
- **Freighter Wallet** (Browser extension)

### Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/iamomm-hack/QuantX.git
cd QuantX
```

#### 2. Install Stellar CLI
```bash
# macOS
brew install stellar-cli

# Linux
cargo install --locked stellar-cli --features opt

# Verify installation
stellar --version
```

#### 3. Configure Stellar Network
```bash
# Add Testnet network
stellar network add \
  --global testnet \
  --rpc-url https://soroban-testnet.stellar.org:443 \
  --network-passphrase "Test SDF Network ; September 2015"

# Generate a test identity
stellar keys generate alice --network testnet

# Fund the account (get test XLM)
stellar keys fund alice --network testnet
```

#### 4. Install Dependencies

```bash
# Install all workspace dependencies
npm install

# Or install individually
cd web && npm install
cd ../quantx-sdk && npm install
cd ../quantx-bot && npm install
cd ../keeper && npm install
```

### Local Development

#### 1. Build Smart Contracts
```bash
cd contracts
stellar contract build

# Deploy to testnet
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/quantx_contract.wasm \
  --source alice \
  --network testnet
```

#### 2. Run Web Dashboard
```bash
cd web
cp .env.example .env.local

# Edit .env.local with your contract address
# NEXT_PUBLIC_CONTRACT_ID=CXXXXXXX...

npm run dev
```

Access at `http://localhost:3000`

#### 3. Run Telegram Bot
```bash
cd quantx-bot
cp .env.example .env

# Edit .env with your bot token
# BOT_TOKEN=your_telegram_bot_token
# CONTRACT_ID=CXXXXXXX...

npm run dev
```

#### 4. Run Keeper (Executor)
```bash
cd keeper
cp .env.example .env

# Configure keeper settings
# PRIVATE_KEY=your_executor_private_key
# CONTRACT_ID=CXXXXXXX...

npm start
```

---

## 📖 Usage Guide

### 1. Web Dashboard

#### Creating a Subscription (Merchant/Recipient)

1. **Connect Wallet**
   - Click "Connect Wallet" and approve Freighter connection
   - Ensure you're on Stellar Testnet

2. **Create Subscription Plan**
   - Navigate to "Create Subscription"
   - Fill in details:
     - Amount (e.g., 10 USDC)
     - Interval (e.g., 30 days)
     - Description
   - Click "Create Plan"
   - Confirm transaction in Freighter

3. **Share Subscription Link**
   - Copy the generated subscription link
   - Share with customers

#### Subscribing to a Service (Customer/Payer)

1. **Visit Subscription Link**
   - Open the merchant's subscription link

2. **Review & Approve**
   - Review subscription details
   - Click "Subscribe"
   - **Approve Token Allowance** in Freighter (first time only)
   - Confirm subscription creation

3. **Manage Subscriptions**
   - View active subscriptions in dashboard
   - Cancel anytime with one click

### 2. SDK Integration

#### Installation
```bash
npm install @quantx/sdk
```

#### Basic Usage
```typescript
import { QuantXClient } from '@quantx/sdk';

// Initialize client
const client = new QuantXClient({
  network: 'testnet',
  contractId: 'CXXXXXXX...',
});

// Connect wallet
await client.connectWallet();

// Create subscription
const subscriptionId = await client.createSubscription({
  recipient: 'GXXXXXXX...',
  token: 'USDC_CONTRACT_ADDRESS',
  amount: '10.00',
  interval: 30 * 24 * 60 * 60, // 30 days in seconds
});

// Get subscription details
const subscription = await client.getSubscription(subscriptionId);

// Cancel subscription
await client.cancelSubscription(subscriptionId);
```

#### Advanced: Custom Integration
```typescript
// Listen to subscription events
client.on('payment_executed', (event) => {
  console.log('Payment processed:', event);
});

// Execute payment manually (keeper functionality)
await client.executePayment(subscriptionId);

// Batch operations
const subscriptions = await client.getUserSubscriptions(address);
```

### 3. Telegram Bot

#### Getting Started

1. **Find the Bot**
   - Search for `@QuantXBot` on Telegram
   - Send `/start`

2. **Connect Wallet**
   - Use `/connect` command
   - Scan QR code with Freighter mobile or use deep link
   - Approve connection
  
   - <img width="1585" height="1006" alt="image" src="https://github.com/user-attachments/assets/97f666c1-b0a7-4324-8253-a46a41118d2c" />


3. **Commands**

```
/start          - Initialize bot
/connect        - Connect wallet
/subscribe      - Create new subscription
/mysubs         - View your subscriptions
/cancel [id]    - Cancel subscription
/balance        - Check token balances
/help           - Show all commands
```

#### Creating a Subscription via Bot

1. Send `/subscribe`
2. Follow the interactive prompts:
   - Enter recipient address
   - Select token (USDC/XLM)
   - Enter amount
   - Choose interval (Daily/Weekly/Monthly)
3. Confirm via deep link
4. Receive confirmation with subscription ID

---

## 🔧 Smart Contract Deployment

### Testnet Deployment

```bash
# 1. Build the contract
cd contracts
stellar contract build

# 2. Optimize WASM
stellar contract optimize --wasm target/wasm32-unknown-unknown/release/quantx_contract.wasm

# 3. Deploy
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/quantx_contract.optimized.wasm \
  --source alice \
  --network testnet

# 4. Initialize contract (if needed)
stellar contract invoke \
  --id CONTRACT_ID \
  --source alice \
  --network testnet \
  -- initialize \
  --admin GXXXXXXX...
```

### Mainnet Deployment (Future)

```bash
# Switch to mainnet network
stellar network add \
  --global mainnet \
  --rpc-url https://soroban-rpc.mainnet.stellar.org:443 \
  --network-passphrase "Public Global Stellar Network ; September 2015"

# Deploy with mainnet source
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/quantx_contract.optimized.wasm \
  --source mainnet-deployer \
  --network mainnet
```

---

## 📚 API Reference

### QuantX SDK

Complete SDK documentation available at [docs.quantx.fi/sdk](https://docs.quantx.fi/sdk)

#### Core Methods

```typescript
class QuantXClient {
  // Wallet Management
  connectWallet(): Promise<string>
  disconnectWallet(): void
  getAddress(): string
  
  // Subscription Management
  createSubscription(params: CreateSubscriptionParams): Promise<string>
  getSubscription(id: string): Promise<Subscription>
  getUserSubscriptions(address: string): Promise<Subscription[]>
  cancelSubscription(id: string): Promise<void>
  
  // Payment Execution
  executePayment(id: string): Promise<void>
  getPaymentHistory(id: string): Promise<Payment[]>
  
  // Token Operations
  approveToken(token: string, amount: string): Promise<void>
  getAllowance(owner: string, spender: string): Promise<string>
}
```

### REST API (Web Dashboard)

```
GET    /api/subscriptions/:id          - Get subscription details
POST   /api/subscriptions              - Create subscription
DELETE /api/subscriptions/:id          - Cancel subscription
GET    /api/subscriptions/user/:address - Get user subscriptions
POST   /api/payments/:id/execute       - Execute payment
GET    /api/payments/:id/history       - Get payment history
```

---

## 🔒 Security

### Audit Status

- ✅ Internal security review completed
- ⏳ Third-party audit: Scheduled Q2 2025
- ⏳ Bug bounty program: Launching with mainnet

### Security Best Practices

1. **Never share your private keys** - QuantX never asks for them
2. **Verify contract addresses** - Always check official sources
3. **Review allowances** - Only approve what you need
4. **Monitor subscriptions** - Regularly check active subscriptions
5. **Use hardware wallets** - For large-value subscriptions

### Reporting Vulnerabilities

If you discover a security vulnerability, please email: **security@quantx.fi**

We offer rewards for responsible disclosure through our bug bounty program.

---

## 🗺️ Roadmap

### Phase 1: Foundation (✅ Completed)
- [x] Core smart contract development
- [x] Web dashboard MVP
- [x] TypeScript SDK
- [x] Telegram bot integration
- [x] Testnet deployment

### Phase 2: Enhancement (🚧 In Progress)
- [ ] Multi-token support expansion
- [ ] Advanced subscription templates
- [ ] Payment analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Enhanced keeper network

### Phase 3: Decentralization (📅 Q2 2025)
- [ ] Security audit completion
- [ ] Mainnet deployment
- [ ] Open keeper network
- [ ] Governance token launch
- [ ] DAO formation

### Phase 4: Ecosystem (📅 Q3-Q4 2025)
- [ ] Plugin marketplace
- [ ] API marketplace
- [ ] Cross-chain bridges
- [ ] Enterprise solutions
- [ ] White-label offerings

---

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Development Process

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Run tests**
   ```bash
   npm test
   ```
5. **Commit with conventional commits**
   ```bash
   git commit -m "feat: add amazing feature"
   ```
6. **Push and create PR**
   ```bash
   git push origin feature/amazing-feature
   ```

### Contribution Guidelines

- Follow the existing code style
- Write tests for new features
- Update documentation
- Use conventional commit messages
- Ensure all tests pass

### Development Setup

```bash
# Install development dependencies
npm install

# Run tests
npm test

# Run linter
npm run lint

# Format code
npm run format
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🌟 Acknowledgments

- **Stellar Development Foundation** for Soroban platform
- **Freighter Wallet** for seamless integration
- **Community Contributors** for feedback and support

---


<div align="center">

**Built with ❤️ on Stellar**

[⬆ Back to Top](#quantx-decentralized-recurring-payments-infrastructure-for-web3)

</div>
