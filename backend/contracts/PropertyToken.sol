// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract PropertyToken is ERC20, Ownable, Pausable {
    uint256 public tokenPrice;
    uint256 public totalTokens;
    address public propertyOwner;
    bool public isActive;

    event TokensPurchased(address buyer, uint256 amount);
    event TokensRedeemed(address seller, uint256 amount);
    event PriceUpdated(uint256 newPrice);

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _totalTokens,
        uint256 _tokenPrice,
        address _propertyOwner
    ) ERC20(_name, _symbol) {
        totalTokens = _totalTokens;
        tokenPrice = _tokenPrice;
        propertyOwner = _propertyOwner;
        _mint(_propertyOwner, _totalTokens);
        isActive = true;
    }

    function buyTokens(uint256 _tokens) external payable whenNotPaused {
        require(isActive, "Property not active");
        require(_tokens > 0, "Cannot buy zero tokens");
        require(balanceOf(propertyOwner) >= _tokens, "Not enough tokens available");
        
        uint256 totalCost = _tokens * tokenPrice;
        require(msg.value >= totalCost, "Insufficient ETH sent");

        _transfer(propertyOwner, msg.sender, _tokens);
        payable(propertyOwner).transfer(totalCost);

        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }

        emit TokensPurchased(msg.sender, _tokens);
    }

    function redeemTokens(uint256 _tokens) external whenNotPaused {
        require(balanceOf(msg.sender) >= _tokens, "Insufficient balance");
        _transfer(msg.sender, propertyOwner, _tokens);
        emit TokensRedeemed(msg.sender, _tokens);
    }

    function setTokenPrice(uint256 _newPrice) external onlyOwner {
        tokenPrice = _newPrice;
        emit PriceUpdated(_newPrice);
    }

    function toggleActive() external onlyOwner {
        isActive = !isActive;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}