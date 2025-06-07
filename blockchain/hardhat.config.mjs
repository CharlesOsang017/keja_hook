import { HardhatUserConfig } from "hardhat/config";
     import "@nomicfoundation/hardhat-toolbox";
     import dotenv from "dotenv";

     dotenv.config();

     const config = {
       solidity: "0.8.20",
       networks: {
         sepolia: {
           url: process.env.BLOCKCHAIN_PROVIDER_URL || "https://sepolia.infura.io/v3/your-project-id",
           accounts: [process.env.WALLET_PRIVATE_KEY].filter(Boolean),
         },
         mainnet: {
           url: process.env.ETHEREUM_MAINNET_URL || "https://mainnet.infura.io/v3/your-project-id",
           accounts: [process.env.WALLET_PRIVATE_KEY].filter(Boolean),
         },
       },
     };

     export default config;