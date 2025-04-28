const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Flight Insurance Protocol", function () {
  let factory;
  let oracle;
  let owner;
  let user1;
  let user2;
  let poolAddress;
  let insurance;

  // Define standard values
  const PREMIUM_AMOUNT = ethers.parseEther("0.01"); // 0.01 ETH
  const PAYOUT_AMOUNT = ethers.parseEther("0.05"); // 0.05 ETH
  const FLIGHT_NUMBER = "AA123";
  let DEPARTURE_TIME;

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();
    
    // Set departure time to tomorrow
    DEPARTURE_TIME = Math.floor(Date.now() / 1000) + 86400;

    // Deploy InsuranceFactory
    const Factory = await ethers.getContractFactory("InsuranceFactory");
    factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Deploy MockOracle
    const Oracle = await ethers.getContractFactory("MockOracle");
    oracle = await Oracle.deploy();
    await oracle.waitForDeployment();

    // Create flight insurance pool
    const tx = await factory.createFlightInsurancePool(
      PREMIUM_AMOUNT,
      PAYOUT_AMOUNT
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
    poolAddress = event.args[0]; // poolAddress is the first arg
    
    // Get FlightInsurance contract
    const Insurance = await ethers.getContractFactory("FlightInsurance");
    insurance = Insurance.attach(poolAddress);
    
    // Add funds to the pool
    await insurance.addFunds({ value: ethers.parseEther("1.0") });
  });

  describe("Factory", function () {
    it("Should create a new insurance pool", async function () {
      const pools = await factory.getAllPools();
      expect(pools.length).to.equal(1);
      expect(pools[0]).to.equal(poolAddress);
    });
  });

  describe("FlightInsurance", function () {
    it("Should have correct initial values", async function () {
      expect(await insurance.premiumAmount()).to.equal(PREMIUM_AMOUNT);
      expect(await insurance.payoutAmount()).to.equal(PAYOUT_AMOUNT);
    });

    it("Should allow users to purchase policies", async function () {
      // Purchase policy as user1
      await insurance.connect(user1).purchasePolicy(
        FLIGHT_NUMBER,
        DEPARTURE_TIME,
        { value: PREMIUM_AMOUNT }
      );
      
      // Check policy exists
      const policy = await insurance.policies(0);
      expect(policy.policyholder).to.equal(user1.address);
      expect(policy.flightNumber).to.equal(FLIGHT_NUMBER);
      expect(policy.departureTime).to.equal(DEPARTURE_TIME);
      expect(policy.claimed).to.be.false;
      expect(policy.active).to.be.true;
    });

    it("Should reject purchase with incorrect premium", async function () {
      await expect(
        insurance.connect(user1).purchasePolicy(
          FLIGHT_NUMBER,
          DEPARTURE_TIME,
          { value: ethers.parseEther("0.005") }
        )
      ).to.be.revertedWith("Incorrect premium amount");
    });

    it("Should process claims for delayed flights", async function () {
      // Purchase policy as user1
      await insurance.connect(user1).purchasePolicy(
        FLIGHT_NUMBER,
        DEPARTURE_TIME,
        { value: PREMIUM_AMOUNT }
      );
      
      // Check user1 balance before claim
      const balanceBefore = await ethers.provider.getBalance(user1.address);
      
      // Process claim (flight delayed)
      await insurance.processClaim(0, true);
      
      // Check policy is marked as claimed
      const policy = await insurance.policies(0);
      expect(policy.claimed).to.be.true;
      
      // Check user1 balance after claim
      const balanceAfter = await ethers.provider.getBalance(user1.address);
      expect(balanceAfter - balanceBefore).to.equal(PAYOUT_AMOUNT);
    });

    it("Should not process claims for on-time flights", async function () {
      // Purchase policy as user1
      await insurance.connect(user1).purchasePolicy(
        FLIGHT_NUMBER,
        DEPARTURE_TIME,
        { value: PREMIUM_AMOUNT }
      );
      
      // Process claim (flight on time)
      await insurance.processClaim(0, false);
      
      // Check policy is not marked as claimed
      const policy = await insurance.policies(0);
      expect(policy.claimed).to.be.false;
    });
  });

  describe("MockOracle", function () {
    it("Should update flight status", async function () {
      // Initially, flight status is false (not delayed)
      expect(await oracle.flightDelayStatus(FLIGHT_NUMBER)).to.be.false;
      
      // Update flight status to delayed
      await oracle.updateFlightStatus(FLIGHT_NUMBER, true);
      expect(await oracle.flightDelayStatus(FLIGHT_NUMBER)).to.be.true;
    });
  });

  describe("End-to-End Flow", function () {
    it("Should handle the full policy lifecycle", async function () {
      // Purchase policy as user1
      await insurance.connect(user1).purchasePolicy(
        FLIGHT_NUMBER,
        DEPARTURE_TIME,
        { value: PREMIUM_AMOUNT }
      );
      
      // Update flight status in oracle
      await oracle.updateFlightStatus(FLIGHT_NUMBER, true);
      
      // Check flight status
      const isDelayed = await oracle.isFlightDelayed(FLIGHT_NUMBER);
      expect(isDelayed).to.be.true;
      
      // Process claim based on oracle data
      await insurance.processClaim(0, isDelayed);
      
      // Check policy is claimed
      const policy = await insurance.policies(0);
      expect(policy.claimed).to.be.true;
    });
  });
});