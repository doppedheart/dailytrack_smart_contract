import hre from "hardhat";

const paymentTokenAddress = "0xF542ea2B164fBB345eeCF1848474F7091454144e";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const NFTMarketplace = await hre.ethers.getContractFactory("NFTMarketplace");
  const marketplace = await NFTMarketplace.deploy(paymentTokenAddress);

  await marketplace.waitForDeployment();

  console.log("NFTMarketplace deployed to:", await marketplace.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
