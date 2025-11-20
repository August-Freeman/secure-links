
## ✨ Features

- 🔒 **Fully Encrypted**: Links are stored with homomorphic encryption
- 🎨 **Modern UI**: Beautiful, responsive interface with gradient designs
- 🔗 **Decentralized**: All data stored on blockchain
- 👥 **Social Discovery**: View trending links from the community
- 🔐 **Privacy-First**: Your data stays encrypted until you decrypt it

## 🛠️ Technology Stack

- **Backend**: Solidity smart contracts with FHEVM (`@fhevm/solidity@0.9.1` + `ZamaEthereumConfig`)
- **Frontend**: React + TypeScript with `@zama-fhe/relayer-sdk` for decryption
- **Encryption**: FHE (Fully Homomorphic Encryption) with `FHE.fromExternal`, `FHE.add`, and permission management

## 🚀 Quick Start

### Local Development

1. **Start local blockchain and deploy contracts:**
   ```bash
   cd backend
   npm install
   npx hardhat node
   npm run deploy:local
   ```

2. **Launch frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. Open your browser and connect MetaMask to start using Secure Links!

### Deploy to Sepolia Testnet

```bash
cd backend
npx hardhat vars set MNEMONIC "<your-mnemonic>"
npx hardhat vars set INFURA_API_KEY "<your-infura-key>"
npm run deploy:sepolia
```

**Note**: Contract ABIs and addresses are automatically exported to `frontend/src/abi`.

## 📖 How It Works

1. **Connect Wallet**: Connect your MetaMask wallet to the dApp
2. **Add Links**: Enter URLs with optional tags - they'll be encrypted on-chain
3. **Decrypt**: View your encrypted link counter and decrypt it when needed
4. **Discover**: Browse trending links from the community

## 🔒 Privacy Features

- Link counts are stored as encrypted values using FHEVM
- Only you can decrypt your own link counter
- URL hashes ensure data integrity while maintaining privacy
- EIP-712 signing ensures secure decryption requests


