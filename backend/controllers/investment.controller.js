import  { ethers } from 'ethers';

// Blockchain setup
const provider = new ethers.providers.JsonRpcProvider(process.env.INFURA_URL);
const wallet = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY, provider);
import  factoryABI  from './contracts/PropertyFactory.json';
import  propertyABI from  './contracts/PropertyToken.json';

const factoryContract = new ethers.Contract(
    process.env.FACTORY_ADDRESS,
    factoryABI.abi,
    wallet
);
export  const  investInProperty = async (req, res) => {
    try {
        const { propertyAddress, tokens } = req.body;
        const propertyContract = new ethers.Contract(propertyAddress, propertyABI.abi, wallet);
        const tx = await propertyContract.buyTokens(tokens, {
            value: ethers.utils.parseEther((tokens * req.body.tokenPrice).toString())
        });
        await tx.wait();

        const investment = new Investment({
            user: req.body.userId,
            property: req.body.propertyId,
            tokens,
            transactionHash: tx.hash
        });
        await investment.save();

        res.json({ success: true, investment });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

export const getAllProperties = async (req, res) => {
    try {
        const properties = await Property.find();
        res.json({ success: true, properties });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

export const createProperty =  async (req, res) => {
    try {
        const { name, symbol, totalTokens, tokenPrice } = req.body;
        const tx = await factoryContract.createProperty(
            name,
            symbol,
            ethers.utils.parseUnits(totalTokens.toString(), 18),
            ethers.utils.parseEther(tokenPrice.toString())
        );
        await tx.wait();

        const property = new Property({
            name,
            symbol,
            totalTokens,
            tokenPrice,
            contractAddress: tx.events.PropertyCreated.returnValues.propertyAddress,
            owner: wallet.address
        });
        await property.save();

        res.status(201).json({ success: true, property });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}