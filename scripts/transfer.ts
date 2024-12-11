import { ethers } from "hardhat";

const tokenAddress = "0xF542ea2B164fBB345eeCF1848474F7091454144e";
const contractAddress = "0x821369b12D6e368126e7FddF2CE66E6515D0Cc7a";

async function main() {
  const transferAmount = ethers.parseEther("1000");
  const CustomToken = await ethers.getContractAt("Token", tokenAddress);
  const tx = await CustomToken.transfer(contractAddress, transferAmount);
  await tx.wait();

  console.log("tokens transferred successfully");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
