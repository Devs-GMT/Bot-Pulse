# BOT Pulse

The live heartbeat of BOT Chain. A dashboard for block time, transactions per block, gas, new contracts, active addresses, RPC latency and block fullness on Mainnet and Testnet, plus an on-chain Trending Board where anyone can pin a contract.

Everything is read from the public RPC endpoints in the browser. There is no backend.

## Contracts

| Network | Chain ID | PinBoard |
| --- | --- | --- |
| Mainnet | 677 | [`0x5892647b49F9b7Cbc26f2e8df492726CaF3a6a4F`](https://scan.botchain.ai/address/0x5892647b49F9b7Cbc26f2e8df492726CaF3a6a4F#code) (verified) |
| Testnet | 968 | [`0xB7c10b6F7C6F97AA02B15ef87804b71FEa0d9cfE`](https://scan.bohr.life/address/0xB7c10b6F7C6F97AA02B15ef87804b71FEa0d9cfE#code) (verified) |

`contracts/PinBoard.sol`: one pin per wallet per contract per week, the first pinner names the contract (32 / 80 characters), free apart from gas.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build in dist/
npm run test:unit    # metrics and mascot-mood tests
npm test             # PinBoard contract tests (Hardhat)
```

Deploying a contract needs a funded wallet: copy `.env.example` to `.env`, set `DEPLOYER_PRIVATE_KEY`, then `npm run deploy:testnet` or `npm run deploy:mainnet`. `.env` is git-ignored; never commit it.

## Stack

Vite, React, Tailwind CSS, ethers v6, GSAP, html-to-image. Fonts are self-hosted (General Sans, Inter, IBM Plex Mono).
