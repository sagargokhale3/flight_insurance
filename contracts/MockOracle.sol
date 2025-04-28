// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract MockOracle is Ownable {
    constructor() Ownable(msg.sender) {
    }
    mapping(string => bool) public flightDelayStatus;
    
    event FlightStatusUpdated(string flightNumber, bool delayed);
    
    function updateFlightStatus(string memory _flightNumber, bool _isDelayed) external onlyOwner {
        flightDelayStatus[_flightNumber] = _isDelayed;
        emit FlightStatusUpdated(_flightNumber, _isDelayed);
    }
    
    function isFlightDelayed(string memory _flightNumber) external view returns (bool) {
        return flightDelayStatus[_flightNumber];
    }
}