// controllers/blockchain.controller.js
import BlockchainService from '../services/blockchain.service.js';
import Property from '../models/property.model.js';
import Payment from '../models/payment.model.js';

export const initiateTokenization = async (req, res) => {
  try {
    const { propertyId } = req.params;

    const property = await Property.findById(propertyId);
    if (!property) throw new Error('Property not found');

    // Validate required fields
    if (property.valuation === undefined || property.valuation === null || isNaN(Number(property.valuation))) {
      throw new Error('Invalid or missing property valuation');
    }

    if (property.totalShares === undefined || property.totalShares === null || isNaN(Number(property.totalShares))) {
      throw new Error('Invalid or missing property totalShares');
    }

    if (!req.user?.blockchainAddress || !req.user.blockchainAddress.startsWith('0x')) {
      throw new Error('User blockchain address is missing or invalid');
    }

    const blockchainService = new BlockchainService('ethereum');

    const metadataURI = `${process.env.API_URL}/properties/${propertyId}/metadata`;

    const txData = await blockchainService.tokenizeProperty(
      {
        metadataURI,
        valuation: property.valuation,
        totalShares: property.totalShares
      },
      req.user.blockchainAddress
    );

    const payment = new Payment({
      user: req.user._id,
      property: propertyId,
      amount: property.tokenizationFee,
      type: 'tokenization',
      status: 'pending',
      transactionId: `TKN-${Date.now()}`,
      blockchain: 'ethereum'
    });

    await payment.save();

    res.json({
      success: true,
      txData,
      paymentId: payment._id
    });
  } catch (error) {
    console.error('Tokenization error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

  
export const investInProperty = async (req, res) => {
  try {
    const { propertyId, shares, blockchain } = req.body;
    
    const property = await Property.findById(propertyId);
    if (!property.isTokenized) throw new Error('Property not tokenized');
    
    const blockchainService = new BlockchainService(blockchain);
    const txData = await blockchainService.purchaseShares(
      propertyId,
      shares,
      req.user.blockchainAddress
    );
    
    // Create investment payment record
    const payment = new Payment({
      user: req.user._id,
      property: propertyId,
      amount: shares * property.sharePrice,
      shares,
      type: 'investment',
      status: 'pending',
      transactionId: `INV-${Date.now()}`,
      blockchain
    });
    await payment.save();
    
    res.json({
      success: true,
      txData,
      paymentId: payment._id
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const confirmTransaction = async (req, res) => {
  try {
    const { paymentId, txHash } = req.body;
    
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new Error('Payment not found');
    
    const blockchainService = new BlockchainService(payment.blockchain);
    const receipt = await blockchainService.processTransactionReceipt(txHash, paymentId);
    
    // Update property status if tokenization
    if (payment.type === 'tokenization') {
      await Property.findByIdAndUpdate(payment.property, {
        isTokenized: true,
        tokenizationDate: new Date(),
        tokenizationTxHash: txHash
      });
    }
    
    res.json({ success: true, receipt });
  } catch (error) {
    await Payment.findByIdAndUpdate(paymentId, { status: 'failed' });
    res.status(400).json({ success: false, error: error.message });
  }
};