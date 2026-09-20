import { expect } from 'chai';
import { ethers } from 'hardhat';
import { DocumentIntegrity } from '../typechain-types';

/**
 * DocumentIntegrity.test.ts — Contract Unit Tests
 *
 * Run: npx hardhat test
 */
describe('DocumentIntegrity', function () {
  let contract: DocumentIntegrity;
  let deployer: any;
  let other: any;

  // Sample data
  const DOCUMENT_ID   = '6643f1e2c7a4b3d92e0f8a11';  // fake MongoDB ObjectId
  const FILE_BYTES    = Buffer.from('Hello LifeVault document content!');
  const FILE_HASH_HEX = ethers.keccak256(FILE_BYTES); // use keccak as proxy for SHA-256 in tests
  const FILE_HASH     = ethers.zeroPadValue(FILE_HASH_HEX, 32) as `0x${string}`;

  const WRONG_HASH    = ethers.zeroPadValue(ethers.keccak256(Buffer.from('tampered!')), 32) as `0x${string}`;

  beforeEach(async function () {
    [deployer, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('DocumentIntegrity');
    contract = (await Factory.deploy()) as DocumentIntegrity;
    await contract.waitForDeployment();
  });

  // ── register() ──────────────────────────────────────────────────

  describe('register()', function () {
    it('should register a new document hash', async function () {
      const tx = await contract.register(DOCUMENT_ID, FILE_HASH);
      const receipt = await tx.wait();
      // Verify the event was emitted with correct args
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      expect(receipt!.status).to.equal(1);
      expect(block).to.not.be.null;

      // Confirm the on-chain record was written
      const rec = await contract.getRecord(DOCUMENT_ID);
      expect(rec.fileHash).to.equal(FILE_HASH);
      expect(rec.registeredBy).to.equal(deployer.address);
      expect(rec.timestamp).to.be.greaterThan(0n);
      expect(rec.exists).to.be.true;
    });

    it('should reject empty documentId', async function () {
      await expect(contract.register('', FILE_HASH))
        .to.be.revertedWith('DocumentIntegrity: empty documentId');
    });

    it('should reject zero fileHash', async function () {
      const zeroHash = ethers.ZeroHash as `0x${string}`;
      await expect(contract.register(DOCUMENT_ID, zeroHash))
        .to.be.revertedWith('DocumentIntegrity: empty fileHash');
    });

    it('should reject double registration of the same documentId', async function () {
      await contract.register(DOCUMENT_ID, FILE_HASH);
      await expect(contract.register(DOCUMENT_ID, FILE_HASH))
        .to.be.revertedWith('DocumentIntegrity: already registered');
    });

    it('should allow different accounts to register different documents', async function () {
      await contract.register(DOCUMENT_ID, FILE_HASH);
      const otherId = '7753f1e2c7a4b3d92e0f9b22';
      await contract.connect(other).register(otherId, WRONG_HASH);
      const rec = await contract.getRecord(otherId);
      expect(rec.exists).to.be.true;
    });
  });

  // ── verify() ────────────────────────────────────────────────────

  describe('verify()', function () {
    beforeEach(async function () {
      await contract.register(DOCUMENT_ID, FILE_HASH);
    });

    it('should return verified=true for the correct hash', async function () {
      const [verified, timestamp] = await contract.verify(DOCUMENT_ID, FILE_HASH);
      expect(verified).to.be.true;
      expect(timestamp).to.be.greaterThan(0n);
    });

    it('should return verified=false for a tampered hash', async function () {
      const [verified] = await contract.verify(DOCUMENT_ID, WRONG_HASH);
      expect(verified).to.be.false;
    });

    it('should return verified=false and timestamp=0 for unregistered document', async function () {
      const [verified, timestamp] = await contract.verify('nonexistent-id', FILE_HASH);
      expect(verified).to.be.false;
      expect(timestamp).to.equal(0n);
    });
  });

  // ── getRecord() ─────────────────────────────────────────────────

  describe('getRecord()', function () {
    it('should return exists=false for unregistered document', async function () {
      const rec = await contract.getRecord('unknown-id');
      expect(rec.exists).to.be.false;
      expect(rec.fileHash).to.equal(ethers.ZeroHash);
    });

    it('should return the correct record after registration', async function () {
      await contract.register(DOCUMENT_ID, FILE_HASH);
      const rec = await contract.getRecord(DOCUMENT_ID);
      expect(rec.exists).to.be.true;
      expect(rec.fileHash).to.equal(FILE_HASH);
      expect(rec.registeredBy).to.equal(deployer.address);
      expect(rec.timestamp).to.be.greaterThan(0n);
    });

    it('should store the deployer address as registeredBy', async function () {
      await contract.connect(other).register(DOCUMENT_ID, FILE_HASH);
      const rec = await contract.getRecord(DOCUMENT_ID);
      expect(rec.registeredBy).to.equal(other.address);
    });
  });
});
