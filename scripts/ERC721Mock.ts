import fs from "fs";
import hre from "hardhat";

interface AddressBook {
  [networkName: string]: {
    ERC721Mock: string;
  };
}

async function main() {
  const ERC721Mock = await hre.ethers.getContractFactory("ERC721Mock");
  const nftContract = await ERC721Mock.deploy("HartoNft", "HNFT");
  await nftContract.waitForDeployment();
  const nftContractAddress = await nftContract.getAddress();
  console.log("ERC721Mock deployed to:", nftContractAddress);

  const addressFile = "deployedAddress.json";
  const network = hre.network.name;

  let address: AddressBook = {};
  if (fs.existsSync(addressFile)) {
    address = JSON.parse(fs.readFileSync(addressFile, "utf8"));
  }

  address[network] = {
    ERC721Mock: nftContractAddress,
  };
  fs.writeFileSync(addressFile, JSON.stringify(address, null, 2));
  console.log(`contract address save to ${addressFile}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
