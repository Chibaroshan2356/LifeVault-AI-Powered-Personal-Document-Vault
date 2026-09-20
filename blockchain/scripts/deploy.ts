import { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

/**
 * deploy.ts — DocumentIntegrity Contract Deployment Script
 *
 * Usage:
 *   Local:  npx hardhat run scripts/deploy.ts --network localhost
 *   Amoy:   npx hardhat run scripts/deploy.ts --network amoy
 *
 * After deployment, this script writes the contract address to
 * `../backend/.blockchain-addresses.json` so the backend can pick it up.
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log('Deploying DocumentIntegrity contract...');
  console.log('Deployer address:', deployer.address);
  console.log(
    'Deployer balance:',
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    'ETH/MATIC',
  );

  // Deploy
  const DocumentIntegrity = await ethers.getContractFactory('DocumentIntegrity');
  const contract = await DocumentIntegrity.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  const network = await ethers.provider.getNetwork();

  console.log('\n✅ DocumentIntegrity deployed!');
  console.log('   Contract address:', contractAddress);
  console.log('   Network:         ', network.name, `(chainId: ${network.chainId})`);

  // ── Write address to a JSON file for the backend ──────────────────
  const outputPath = path.join(__dirname, '..', '..', 'backend', '.blockchain-addresses.json');
  const existing: Record<string, string> = fs.existsSync(outputPath)
    ? JSON.parse(fs.readFileSync(outputPath, 'utf-8'))
    : {};

  existing[network.chainId.toString()] = contractAddress;
  fs.writeFileSync(outputPath, JSON.stringify(existing, null, 2));

  console.log('\n📝 Contract address written to backend/.blockchain-addresses.json');
  console.log(
    '   Add this to your backend/.env:\n' +
    `   BLOCKCHAIN_CONTRACT_ADDRESS=${contractAddress}\n` +
    `   BLOCKCHAIN_CHAIN_ID=${network.chainId}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
