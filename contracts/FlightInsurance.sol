// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract FlightInsurance is Ownable {
    uint256 public premiumAmount;
    uint256 public payoutAmount;
    
    struct Policy {
        address policyholder;
        string flightNumber;
        uint256 departureTime;
        bool claimed;
        bool active;
    }
    
    mapping(uint256 => Policy) public policies;
    uint256 public policyCount;
    
    event PolicyPurchased(uint256 policyId, address policyholder, string flightNumber);
    event ClaimPaid(uint256 policyId, address policyholder);
    
    constructor(
        uint256 _premiumAmount,
        uint256 _payoutAmount,
        address _owner
    ) Ownable(_owner) {
        premiumAmount = _premiumAmount;
        payoutAmount = _payoutAmount;
    }
    
    function purchasePolicy(string memory _flightNumber, uint256 _departureTime) external payable {
        require(msg.value == premiumAmount, "Incorrect premium amount");
        require(_departureTime > block.timestamp, "Departure time must be in future");
        
        uint256 policyId = policyCount;
        policyCount++;
        
        policies[policyId] = Policy({
            policyholder: msg.sender,
            flightNumber: _flightNumber,
            departureTime: _departureTime,
            claimed: false,
            active: true
        });
        
        emit PolicyPurchased(policyId, msg.sender, _flightNumber);
    }
    
    function processClaim(uint256 _policyId, bool _isDelayed) external onlyOwner {
        Policy storage policy = policies[_policyId];
        require(policy.active, "Policy not active");
        require(!policy.claimed, "Policy already claimed");
        
        if (_isDelayed) {
            policy.claimed = true;
            (bool success, ) = policy.policyholder.call{value: payoutAmount}("");
            require(success, "Payment failed");
            emit ClaimPaid(_policyId, policy.policyholder);
        }
    }
    
    function addFunds() external payable {}
    
    receive() external payable {}
}