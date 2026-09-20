/**
 * blockchain.service.ts — LifeVault Blockchain Integration
 *
 * Uses ethers.js v5 (CommonJS-compatible — works with ts-node out of the box).
 *
 * Provides:
 *  - register(documentId, fileHash) — submit hash to DocumentIntegrity contract
 *  - verify(documentId, fileHash)   — verify hash against on-chain record (free view call)
 *  - getOnChainRecord(documentId)   — retrieve record for dashboard display
 *
 * Design:
 *  - BLOCKCHAIN_ENABLED env flag allows graceful opt-in (no errors if not configured)
 *  - All blockchain errors are caught and logged; they NEVER propagate to document processing
 *  - Uses ethers.js v5 provider + signer pattern
 *
 * To enable: set BLOCKCHAIN_ENABLED=true and fill blockchain vars in .env
 */
import { ethers } from 'ethers';
import { logger } from '../utils/logger';

// ── ABI: only the functions we call ─────────────────────────────────
const CONTRACT_ABI = [
  'function register(string calldata documentId, bytes32 fileHash) external',
  'function verify(string calldata documentId, bytes32 fileHash) external view returns (bool verified, uint256 timestamp)',
  'function getRecord(string calldata documentId) external view returns (bytes32 fileHash, address registeredBy, uint256 timestamp, bool exists)',
  'event DocumentRegistered(string indexed documentId, bytes32 fileHash, address indexed registeredBy, uint256 timestamp)',
];

export interface BlockchainRegistrationResult {
  txHash:      string;
  blockNumber: number;
  network:     string;
}

export interface BlockchainVerificationResult {
  verified:    boolean;
  timestamp:   Date | null;   // null if document is not registered
  registered:  boolean;       // true if a record exists on-chain at all
}

export interface OnChainRecord {
  fileHash:     string;
  registeredBy: string;
  timestamp:    Date;
  exists:       boolean;
}

class BlockchainService {
  private provider:    ethers.providers.JsonRpcProvider | null = null;
  private signer:      ethers.Wallet | null = null;
  private contract:    ethers.Contract | null = null;
  private enabled:     boolean = false;
  private networkName: string = 'unknown';

  /**
   * Initialize the blockchain connection.
   * Called once on server startup if BLOCKCHAIN_ENABLED=true.
   * Failures here are non-fatal — the service remains disabled.
   */
  async initialize(): Promise<void> {
    const enabled = process.env.BLOCKCHAIN_ENABLED === 'true';
    if (!enabled) {
      logger.info('BlockchainService: disabled (BLOCKCHAIN_ENABLED != true)');
      return;
    }

    const rpcUrl          = process.env.BLOCKCHAIN_RPC_URL;
    const privateKey      = process.env.BLOCKCHAIN_PRIVATE_KEY;
    const contractAddress = process.env.BLOCKCHAIN_CONTRACT_ADDRESS;

    if (!rpcUrl || !privateKey || !contractAddress) {
      logger.warn('BlockchainService: missing env vars (RPC_URL / PRIVATE_KEY / CONTRACT_ADDRESS) — disabled');
      return;
    }

    try {
      this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      this.signer   = new ethers.Wallet(privateKey, this.provider);
      this.contract = new ethers.Contract(contractAddress, CONTRACT_ABI, this.signer);

      const network = await this.provider.getNetwork();
      this.networkName = network.name !== 'unknown' ? network.name : `chainId-${network.chainId}`;
      this.enabled = true;

      logger.info(`BlockchainService: initialized on ${this.networkName}`, {
        contractAddress,
        signer: this.signer.address,
      });
    } catch (err) {
      logger.error('BlockchainService: initialization failed — blockchain disabled', {
        error: (err as Error).message,
      });
      this.enabled = false;
    }
  }

  /** Returns true if the blockchain service is operational */
  isEnabled(): boolean {
    return this.enabled && this.contract !== null;
  }

  // ── Write ─────────────────────────────────────────────────────────

  /**
   * Register a document hash on-chain.
   * @param documentId  MongoDB ObjectId string
   * @param fileHashHex SHA-256 hex string (64 chars, no 0x prefix)
   * @returns Registration result or null if blockchain is disabled/error
   */
  async register(
    documentId: string,
    fileHashHex: string,
  ): Promise<BlockchainRegistrationResult | null> {
    if (!this.isEnabled() || !this.contract) {
      logger.debug('BlockchainService: register skipped (disabled)', { documentId });
      return null;
    }

    try {
      const fileHashBytes32 = this.hexToBytes32(fileHashHex);
      logger.info('BlockchainService: registering document', { documentId });

      const tx: ethers.ContractTransaction = await this.contract['register'](
        documentId,
        fileHashBytes32,
      );
      const receipt = await tx.wait();

      logger.info('BlockchainService: document registered', {
        documentId,
        txHash:      receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        network:     this.networkName,
      });

      return {
        txHash:      receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        network:     this.networkName,
      };
    } catch (err) {
      logger.error('BlockchainService: register failed', {
        documentId,
        error: (err as Error).message,
      });
      return null;
    }
  }

  // ── Read (free, no gas) ──────────────────────────────────────────

  /**
   * Verify a file hash against the on-chain record.
   * This is a pure view call — no gas, no transaction.
   *
   * @param documentId   MongoDB ObjectId string
   * @param fileHashHex  SHA-256 hex of the current file bytes
   */
  async verify(
    documentId: string,
    fileHashHex: string,
  ): Promise<BlockchainVerificationResult> {
    const notRegistered: BlockchainVerificationResult = {
      verified:   false,
      timestamp:  null,
      registered: false,
    };

    if (!this.isEnabled() || !this.contract) {
      return notRegistered;
    }

    try {
      const fileHashBytes32 = this.hexToBytes32(fileHashHex);
      const result = await this.contract['verify'](documentId, fileHashBytes32);
      const verified: boolean = result[0];
      const timestampBN: ethers.BigNumber = result[1];

      const registered = timestampBN.gt(0);
      const timestamp  = registered ? new Date(timestampBN.toNumber() * 1000) : null;

      return { verified, timestamp, registered };
    } catch (err) {
      logger.error('BlockchainService: verify failed', {
        documentId,
        error: (err as Error).message,
      });
      return notRegistered;
    }
  }

  /**
   * Retrieve the full on-chain record for a document.
   * @returns Record or null if not registered / blockchain disabled
   */
  async getOnChainRecord(documentId: string): Promise<OnChainRecord | null> {
    if (!this.isEnabled() || !this.contract) return null;

    try {
      const result = await this.contract['getRecord'](documentId);
      const fileHash:     string             = result[0];
      const registeredBy: string             = result[1];
      const timestampBN:  ethers.BigNumber   = result[2];
      const exists:       boolean            = result[3];

      return {
        fileHash,
        registeredBy,
        timestamp: new Date(timestampBN.toNumber() * 1000),
        exists,
      };
    } catch (err) {
      logger.error('BlockchainService: getOnChainRecord failed', {
        documentId,
        error: (err as Error).message,
      });
      return null;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────

  /**
   * Convert a 64-char SHA-256 hex string to a bytes32 (0x-prefixed, 66 chars).
   * Pads with leading zeros if shorter than 32 bytes.
   */
  private hexToBytes32(hex: string): string {
    const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
    return '0x' + clean.padStart(64, '0');
  }
}

/** Singleton — import this instance across the backend */
export const blockchainService = new BlockchainService();
