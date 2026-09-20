import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';

/**
 * hardhat.config.ts — LifeVault Blockchain Configuration
 *
 * Networks:
 *  hardhat   — in-process ephemeral node (for unit tests)
 *  localhost — persistent local node (`npx hardhat node`)
 *  amoy      — Polygon Amoy testnet (requires POLYGON_RPC_URL + DEPLOYER_PRIVATE_KEY in env)
 *  polygon   — Polygon mainnet (production)
 */

const POLYGON_RPC_URL      = process.env.POLYGON_RPC_URL      || '';
const AMOY_RPC_URL         = process.env.AMOY_RPC_URL         || 'https://rpc-amoy.polygon.technology';
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || '';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: {
        enabled: true,
        runs:    200,
      },
    },
  },

  networks: {
    // ── Local development ──────────────────────────────────────────
    hardhat: {
      // Default in-process network for `hardhat test`
      chainId: 31337,
    },
    localhost: {
      // Persistent node started with `npx hardhat node` or Docker
      url:     'http://127.0.0.1:8545',
      chainId: 31337,
    },

    // ── Polygon Amoy testnet ───────────────────────────────────────
    amoy: {
      url:      AMOY_RPC_URL,
      chainId:  80002,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
    },

    // ── Polygon mainnet ────────────────────────────────────────────
    polygon: {
      url:      POLYGON_RPC_URL,
      chainId:  137,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
    },
  },

  paths: {
    sources:   './contracts',
    tests:     './test',
    cache:     './cache',
    artifacts: './artifacts',
  },
};

export default config;
