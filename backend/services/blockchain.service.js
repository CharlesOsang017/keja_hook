import Web3 from 'web3';
import PropertyTokenABI from '../abis/PropertyToken.json';
import RevenueDistributionABI from '../abis/RevenueDistribution.json';
import Property from '../models/property.model.js';
import Payment from '../models/payment.model.js';
import dotenv from 'dotenv';
dotenv.config();

const ETHEREUM = {
  id: 1, // Use 11155111 for Sepolia testnet
  rpc: process.env.ETHEREUM_RPC,
  contracts: {
    propertyToken: process.env.ETH_PROPERTY_TOKEN,
    revenueDistribution: process.env.ETH_REVENUE_DISTRIBUTION
  }
};

export default class BlockchainService {
  constructor() {
    this.chainConfig = ETHEREUM;
    this.web3 = new Web3(this.chainConfig.rpc);

    this.propertyToken = new this.web3.eth.Contract(
      PropertyTokenABI,
      this.chainConfig.contracts.propertyToken
    );

    this.revenueDistribution = new this.web3.eth.Contract(
      RevenueDistributionABI,
      this.chainConfig.contracts.revenueDistribution
    );
  }

  async tokenizeProperty(propertyData, ownerAddress) {
    const { metadataURI, valuation, totalShares } = propertyData;

    // Convert valuation to wei
    const totalValueWei = this.web3.utils.toWei(valuation.toString(), 'ether');

    const txData = this.propertyToken.methods
      .tokenizeProperty(metadataURI, totalValueWei, totalShares, ownerAddress)
      .encodeABI();

    return {
      to: this.chainConfig.contracts.propertyToken,
      data: txData,
      value: '0',
      chainId: this.chainConfig.id
    };
  }

  async purchaseShares(propertyId, shares, investorAddress) {
    const property = await Property.findById(propertyId);
    if (!property.isTokenized) throw new Error('Property not tokenized');

    const propertyOnChain = await this.propertyToken.methods
      .getPropertyDetails(property.tokenId)
      .call();

    const sharePrice = BigInt(propertyOnChain.sharePrice);
    const totalCostWei = BigInt(shares) * sharePrice;

    const txData = this.revenueDistribution.methods
      .distributeFees()
      .encodeABI();

    return {
      to: this.chainConfig.contracts.revenueDistribution,
      data: txData,
      value: totalCostWei.toString(),
      chainId: this.chainConfig.id
    };
  }

  async processTransactionReceipt(txHash, paymentId) {
    const receipt = await this.web3.eth.getTransactionReceipt(txHash);
    if (!receipt.status) throw new Error('Transaction failed');

    await Payment.findByIdAndUpdate(paymentId, {
      status: 'completed',
      transactionHash: txHash,
      completedAt: new Date()
    });

    return receipt;
  }
}
