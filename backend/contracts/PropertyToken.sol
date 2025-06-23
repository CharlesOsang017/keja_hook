// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract PropertyToken is ERC721, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    struct Property {
        uint256 propertyId;
        string metadataURI;
        uint256 totalValue;
        uint256 totalShares;
        uint256 sharePrice;
        bool isActive;
        address[] shareholders;
        mapping(address => uint256) sharesOwned;
    }

    mapping(uint256 => Property) public properties;
    mapping(address => uint256[]) public userInvestments;
    
    event PropertyTokenized(
        uint256 indexed propertyId,
        string metadataURI,
        uint256 totalValue,
        uint256 totalShares
    );
    
    event SharesPurchased(
        uint256 indexed propertyId,
        address investor,
        uint256 shares
    );

    constructor() ERC721("KejahookPropertyToken", "KPT") {}

    function tokenizeProperty(
        string memory metadataURI,
        uint256 totalValue,
        uint256 totalShares,
        address initialOwner
    ) external onlyOwner returns (uint256) {
        _tokenIds.increment();
        uint256 newPropertyId = _tokenIds.current();
        
        Property storage p = properties[newPropertyId];
        p.propertyId = newPropertyId;
        p.metadataURI = metadataURI;
        p.totalValue = totalValue;
        p.totalShares = totalShares;
        p.sharePrice = totalValue / totalShares;
        p.isActive = true;
        
        _mint(initialOwner, newPropertyId);
        emit PropertyTokenized(newPropertyId, metadataURI, totalValue, totalShares);
        
        return newPropertyId;
    }

    function purchaseShares(
        uint256 propertyId,
        uint256 shares
    ) external payable {
        Property storage p = properties[propertyId];
        require(p.isActive, "Property not active");
        require(msg.value >= shares * p.sharePrice, "Insufficient payment");
        
        if (p.sharesOwned[msg.sender] == 0) {
            p.shareholders.push(msg.sender);
        }
        
        p.sharesOwned[msg.sender] += shares;
        userInvestments[msg.sender].push(propertyId);
        
        emit SharesPurchased(propertyId, msg.sender, shares);
    }

    function getPropertyDetails(uint256 propertyId) 
        external 
        view 
        returns (
            string memory,
            uint256,
            uint256,
            uint256,
            bool
        ) 
    {
        Property storage p = properties[propertyId];
        return (
            p.metadataURI,
            p.totalValue,
            p.totalShares,
            p.sharePrice,
            p.isActive
        );
    }
}