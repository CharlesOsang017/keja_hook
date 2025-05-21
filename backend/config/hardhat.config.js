import '@nomicfoundation/hardhat-toolbox';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  solidity: "0.8.19",
  networks: {
    sepolia: {
      url: process.env.INFURA_URL || "",
      accounts: process.env.WALLET_PRIVATE_KEY ? [process.env.WALLET_PRIVATE_KEY] : []
    }
  }
};

export default config;