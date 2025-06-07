import { ethers } from "ethers";
     import hre from "hardhat";

     async function main() {
       const [deployer] = await hre.ethers.getSigners();
       console.log("Deploying with account:", deployer.address);

       const PropertyToken = await hre.ethers.getContractFactory("PropertyToken");
       const propertyToken = await PropertyToken.deploy(process.env.PLATFORM_WALLET_ADDRESS);
       await propertyToken.waitForDeployment();

       const contractAddress = await propertyToken.getAddress();
       console.log("PropertyToken deployed to:", contractAddress);
     }

     main().catch((error) => {
       console.error(error);
       process.exitCode = 1;
     });