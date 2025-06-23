// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract RevenueDistribution is Ownable {
    address public platformWallet;
    uint256 public platformFee = 500; // 5% in basis points
    
    event FeeDistributed(
        address indexed payer,
        uint256 amount,
        uint256 feeAmount
    );

    constructor(address _platformWallet) {
        platformWallet = _platformWallet;
    }

    function distributeFees() external payable {
        uint256 feeAmount = (msg.value * platformFee) / 10000;
        uint256 remainingAmount = msg.value - feeAmount;
        
        (bool feeSuccess, ) = platformWallet.call{value: feeAmount}("");
        require(feeSuccess, "Fee transfer failed");
        
        emit FeeDistributed(msg.sender, msg.value, feeAmount);
        
        // Forward remaining amount to intended recipient
        (bool remainingSuccess, ) = msg.sender.call{value: remainingAmount}("");
        require(remainingSuccess, "Remaining transfer failed");
    }

    function updatePlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Fee cannot exceed 10%");
        platformFee = newFee;
    }
}