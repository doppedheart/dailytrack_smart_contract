import { ethers } from "hardhat";

async function main() {
  console.log("Deploying CustomToken...");

  const Token = await ethers.getContractFactory("Token");
  const initialSupply = 100000;
  const transferAmount = ethers.parseEther("1000");

  const customToken = await Token.deploy("HARTO", "HTO", initialSupply);
  await customToken.waitForDeployment();
  const tokenAddress = await customToken.getAddress();
  console.log(`Custom Token deployed at : ${tokenAddress}`);

  console.log("Deploying DailyLoginRewards...");
  const DailyTrack = await ethers.getContractFactory("DailyTrack");
  const dailyReward = ethers.parseEther("1"); // 10 tokens per login
  const dailyTrack = await DailyTrack.deploy(tokenAddress, dailyReward);
  await dailyTrack.waitForDeployment();
  const dailyTrackAddress = await dailyTrack.getAddress();

  const tx = await customToken.transfer(dailyTrackAddress, transferAmount);
  await tx.wait();
  console.log(`DailyLoginRewards deployed at: ${dailyTrackAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error during deployment:", error);
    process.exit(1);
  });
