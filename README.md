# QuantX: The "Stripe" for Web3 Recurring Payments

[#devchallenge](https://dev.to/t/devchallenge) [#stellarchallenge](https://dev.to/t/stellarchallenge) [#soroban](https://dev.to/t/soroban) [#blockchain](https://dev.to/t/blockchain)

This is a submission for the **Build Better on Stellar: Smart Contract Challenge**: Build a dApp.

## Table of Contents
*   [What I Built](#what-i-built)
*   [Demo](#demo)
*   [My Code](#my-code)
*   [Video Explanation](#video-explanation)
*   [Journey](#journey)
*   [Concepts Learned](#concepts-learned)
*   [Next Steps](#next-steps)

## What I Built
**QuantX** is a decentralized "Recurring Finance Infrastructure" (RFI) protocol designed to solve a critical gap in Web3: **automation**.

In the traditional world, subscriptions (Netflix, Spotify) and payroll are automated. In Web3, users must manually sign every single transaction. QuantX fixes this by creating a non-custodial smart contract vault that allows for **trustless, recurring payments** using stablecoins (USDC/XLM) on the Stellar Soroban network.

It serves two main audiences:
1.  **SaaS & Creators:** Who need to charge monthly subscriptions without off-chain workarounds.
2.  **DAOs & Employers:** Who need to run automated payroll for contributors.

The dApp ensures that payments are executed purely on-chain via a decentralized executor network, meaning no central authority holds user keys. It covers the **Financial Inclusion** and **Utility** categories by providing essential infrastructure for the crypto economy.

## Demo
The dApp leverages **Next.js** for the frontend, **Rust (Soroban)** for the smart contracts, and a **Node.js Keeper** for the automation engine.

**Note:** To interact with the dApp, you need the [Freighter Wallet](https://www.freighter.app/) extension installed and set to **Testnet**.

*   **Public URL:** [QuantX Live Demo](#)
*   **Contract Explorer:** [View on Stellar Expert](#)

## My Code
*   **GitHub Repo:** [Github Repo](https://github.com/Amitshah18/QuantX)
*   **Smart Contract:** `/contracts` (Rust)
*   **SDK:** `/quantx-sdk` (TypeScript)
*   **Telegram Bot:** `/quantx-bot` (Telegraf)

## Video Explanation
[QuantX Demo Video](#)

## Journey
For my project, I wanted to tackle the "passive state" problem of blockchains. The motivation came from seeing DAOs struggle to pay contributors on time—it was always a manual, multi-sig nightmare every month.

I designed QuantX to mimic the "Direct Debit" experience of banking but with the transparency of Stellar. The hardest part was architecting the **"Approve-Subscribe-Trigger"** model. I had to ensure that the contract could "pull" funds from a user's wallet only when specific conditions (time + allowance) were met, without giving the contract unlimited access.

One of the key functions I implemented was `execute_payment()`. This function acts as the heartbeat of the protocol. It validates the timestamp, checks the user's allowance, and transfers the funds in a single atomic transaction.

## Concepts Learned
During the development of QuantX, I deep-dived into several advanced Soroban and Stellar concepts:

**1. Authorization & Allowances (`require_auth`)**
I learned how to use `token.approve` and `transfer_from` effectively. The contract doesn't hold the user's tokens; it only holds an *allowance*. This required understanding how Soroban handles authorization scopes compared to EVM's `approve`.

**2. Intelligent Polling & Indexing**
Soroban RPC can sometimes be slow to index recent transactions. To fix this in the SDK, I implemented a **Dual-Layer Polling** mechanism.
*   **Layer 1:** Checks Soroban RPC for the transaction status.
*   **Layer 2:** Falls back to the **Horizon API** if Soroban is lagging.
This taught me how to bridge the gap between "Futurenet/Testnet bleeding edge" and "production reliability."

**3. Ledger Timestamp Manipulation**
For the `execute_payment` logic, I had to master `env.ledger().timestamp()`. I learned that relying on block times requires careful handling of "next execution" logic to prevent double-spending or skipped payments.

**4. Cross-Platform State Management**
Building the **Telegram Bot** taught me that the "Wallet" isn't just a browser extension. I had to manage state between a chat interface (Telegram) and the blockchain, using deep links to sign transactions via Lobstr or Freighter mobile.

## Next Steps
My roadmap for QuantX includes:
1.  **Mainnet Launch:** conducting a security audit and deploying to Stellar Mainnet.
2.  **Executor Incentivization:** Currently, the executor is a centralized script. I plan to open this up so *anyone* can run an executor node and earn a small fee for triggering payments (Keeper Network).
3.  **Merchant SDK:** Building a React Native widget so mobile apps can accept crypto subscriptions with one line of code.

**Collaborations:**
*   [LinkedIn](#)
*   [Twitter / X](#)
*   [Email](mailto:team@quantx.fi)
