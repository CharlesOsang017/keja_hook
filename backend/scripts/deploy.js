import  hre from "hardhat";

async function main() {
    const PropertyFactory = await hre.ethers.getContractFactory("PropertyFactory");
    const factory = await PropertyFactory.deploy();
    await factory.deployed();
    console.log("PropertyFactory deployed to:", factory.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});