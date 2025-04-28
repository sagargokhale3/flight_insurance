const hre = require("hardhat");

async function main() {
  console.log("Deploying Flight Insurance Protocol...");

  // Deploy InsuranceFactory
  const Factory = await hre.ethers.getContractFactory("InsuranceFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  console.log("InsuranceFactory deployed to:", await factory.getAddress());

  // Deploy MockOracle
  const Oracle = await hre.ethers.getContractFactory("MockOracle");
  const oracle = await Oracle.deploy();
  await oracle.waitForDeployment();
  console.log("MockOracle deployed to:", await oracle.getAddress());

  console.log("Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });