// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./FlightInsurance.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract InsuranceFactory is Ownable {
    constructor() Ownable(msg.sender) {
    }
    address[] public insurancePools;
    
    event InsurancePoolCreated(address poolAddress);
    
    function createFlightInsurancePool(
        uint256 _premiumAmount,
        uint256 _payoutAmount
    ) external returns (address) {
        FlightInsurance newPool = new FlightInsurance(
            _premiumAmount,
            _payoutAmount,
            msg.sender
        );
        
        address poolAddress = address(newPool);
        insurancePools.push(poolAddress);
        
        emit InsurancePoolCreated(poolAddress);
        return poolAddress;
    }
    
    function getAllPools() external view returns (address[] memory) {
        return insurancePools;
    }
}