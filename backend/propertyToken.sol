// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PropertyToken is ERC1155, Ownable {
    struct Property {
        uint256 totalTokens;
        uint256 availableTokens;
        uint256 tokenPrice; // In wei
        bool isActive;
    }

    mapping(uint256 => Property) public properties;
    uint256 public constant FEE_PERCENTAGE = 200; // 2% (in basis points, 100 = 1%)
    address public feeRecipient;

    event TokensPurchased(uint256 indexed propertyId, address buyer, uint256 amount, uint256 cost);
    event PropertyTokenized(uint256 indexed propertyId, uint256 totalTokens, uint256 tokenPrice);
    event FeesCollected(address recipient, uint256 amount);

    constructor(address _feeRecipient) ERC1155("https://api.yourapp.com/tokens/{id}.json") Ownable(msg.sender) {
        feeRecipient = _feeRecipient;
    }

    function tokenizeProperty(uint256 propertyId, uint256 totalTokens, uint256 tokenPrice) external onlyOwner {
        require(!properties[propertyId].isActive, "Property already tokenized");
        properties[propertyId] = Property({
            totalTokens: totalTokens,
            availableTokens: totalTokens,
            tokenPrice: tokenPrice,
            isActive: true
        });
        _mint(address(this), propertyId, totalTokens, "");
        emit PropertyTokenized(propertyId, totalTokens, tokenPrice);
    }

    function buyTokens(uint256 propertyId, uint256 amount) external payable {
        Property storage property = properties[propertyId];
        require(property.isActive, "Property not tokenized");
        require(amount > 0 && amount <= property.availableTokens, "Invalid token amount");
        uint256 totalCost = amount * property.tokenPrice;
        require(msg.value >= totalCost, "Insufficient ETH sent");

        // Calculate fees
        uint256 fee = (totalCost * FEE_PERCENTAGE) / 10000;
        uint256 amountAfterFee = totalCost - fee;

        // Transfer fees to recipient
        (bool feeSuccess, ) = feeRecipient.call{value: fee}("");
        require(feeSuccess, "Fee transfer failed");
        emit FeesCollected(feeRecipient, fee);

        // Transfer remaining ETH to contract owner (or property owner)
        (bool ownerSuccess, ) = owner().call{value: amountAfterFee}("");
        require(ownerSuccess, "Owner transfer failed");

        // Update available tokens
        property.availableTokens -= amount;

        // Transfer tokens to buyer
        _safeTransferFrom(address(this), msg.sender, propertyId, amount, "");

        emit TokensPurchased(propertyId, msg.sender, amount, totalCost);
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    function setFeeRecipient(address _newRecipient) external onlyOwner {
        require(_newRecipient != address(0), "Invalid address");
        feeRecipient = _newRecipient;
    }

    receive() external payable {}
}