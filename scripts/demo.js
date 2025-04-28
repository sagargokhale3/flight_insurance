const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Running demo with account:", deployer.address);

  // Deploy contracts
  console.log("\n1. DEPLOYING CONTRACTS");
  // Factory
  const Factory = await hre.ethers.getContractFactory("InsuranceFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  console.log("Factory deployed to:", await factory.getAddress());
  
  // Oracle
  const Oracle = await hre.ethers.getContractFactory("MockOracle");
  const oracle = await Oracle.deploy();
  await oracle.waitForDeployment();
  console.log("Oracle deployed to:", await oracle.getAddress());

  // Create insurance pool
  console.log("\n2. CREATING INSURANCE POOL");
  const premiumAmount = hre.ethers.parseEther("0.01");  // 0.01 ETH
  const payoutAmount = hre.ethers.parseEther("0.05");   // 0.05 ETH
  
  console.log(`Premium: ${hre.ethers.formatEther(premiumAmount)} ETH`);
  console.log(`Payout: ${hre.ethers.formatEther(payoutAmount)} ETH`);
  
  const tx = await factory.createFlightInsurancePool(
    premiumAmount,
    payoutAmount
  );
  const receipt = await tx.wait();
  
  // Extract pool address from event
  const events = receipt.logs.map(log => {
    try {
      return factory.interface.parseLog({
        topics: log.topics,
        data: log.data
      });
    } catch (e) {
      return null;
    }
  }).filter(Boolean);
  
  const event = events.find(e => e && e.name === 'InsurancePoolCreated');
  const poolAddress = event.args[0]; // poolAddress is the first arg
  console.log("Pool created at:", poolAddress);
  
  // Get insurance pool contract
  const Insurance = await hre.ethers.getContractFactory("FlightInsurance");
  const insurance = Insurance.attach(poolAddress);
  
  // Add funds to pool
  console.log("\n3. ADDING FUNDS TO POOL");
  await insurance.addFunds({ value: hre.ethers.parseEther("1.0") });
  console.log("Added 1.0 ETH to insurance pool");
  
  // Purchase policy
  console.log("\n4. PURCHASING POLICY");
  const flightNumber = "AA123";
  const departureTime = Math.floor(Date.now() / 1000) + 86400; // Tomorrow
  
  await insurance.purchasePolicy(
    flightNumber, 
    departureTime,
    { value: premiumAmount }
  );
  console.log(`Policy purchased for flight ${flightNumber}`);
  
  // Simulate flight delay
  console.log("\n5. SIMULATING FLIGHT DELAY");
  await oracle.updateFlightStatus(flightNumber, true);
  console.log("Flight marked as delayed in oracle");
  
  // Process claim
  console.log("\n6. PROCESSING CLAIM");
  await insurance.processClaim(0, await oracle.isFlightDelayed(flightNumber));
  console.log("Claim processed");
  
  // Check policy status
  const policy = await insurance.policies(0);
  console.log("Policy claimed:", policy.claimed);
  
  console.log("\nDEMO COMPLETE!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });