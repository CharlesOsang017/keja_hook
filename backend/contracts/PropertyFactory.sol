// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PropertyToken.sol";

contract PropertyFactory {
    address[] public properties;

    event PropertyCreated(address indexed propertyAddress, string name, string symbol);

    function createProperty(
        string memory _name,
        string memory _symbol,
        uint256 _totalTokens,
        uint256 _tokenPrice
    ) external returns (address) {
        PropertyToken newProperty = new PropertyToken(
            _name,
            _symbol,
            _totalTokens,
            _tokenPrice,
            msg.sender
        );
        properties.push(address(newProperty));
        emit PropertyCreated(address(newProperty), _name, _symbol);
        return address(newProperty);
    }

    function getProperties() external view returns (address[] memory) {
        return properties;
    }
}