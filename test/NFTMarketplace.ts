import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { token } from "../typechain-types/@openzeppelin/contracts";

describe("NFTMarketplace", async function () {
  async function deployMarketPlace() {
    let tokenId = 1;
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("Token");
    const token = await Token.deploy("HARTO", "HTO", 100000);
    await token.waitForDeployment();

    const NFTFactory = await ethers.getContractFactory("ERC721Mock");
    const nftContract = await NFTFactory.deploy("TestNFT", "TNFT");
    await nftContract.waitForDeployment();

    const testUri = "https://marve-jade.vercel.app";
    await nftContract.mint(owner.address, tokenId, testUri);

    const NFTMarketplaceFactory = await ethers.getContractFactory(
      "NFTMarketplace"
    );
    const marketplace = await NFTMarketplaceFactory.deploy(
      await token.getAddress()
    );
    await marketplace.waitForDeployment();

    return {
      Token,
      token,
      owner,
      addr1,
      addr2,
      NFTFactory,
      nftContract,
      testUri,
      tokenId,
      NFTMarketplaceFactory,
      marketplace,
    };
  }
  describe("List an NFT", async function () {
    it("should list an NFT", async function () {
      const { owner, nftContract, marketplace, tokenId } = await loadFixture(
        deployMarketPlace
      );

      await nftContract
        .connect(owner)
        .approve(await marketplace.getAddress(), tokenId);

      const price = ethers.parseEther("10");
      await expect(
        marketplace
          .connect(owner)
          .listNFT(nftContract.getAddress(), tokenId, price)
      )
        .to.emit(marketplace, "NFTListed")
        .withArgs(0, nftContract.getAddress(), tokenId, owner.address, price);

      const listing = await marketplace.listings(0);
      expect(listing.seller).to.equal(owner.address);
      expect(listing.price).to.equal(price);
      expect(listing.isActive).to.be.true;
    });

    it("revert if price is less than zero", async function () {
      const { owner, nftContract, marketplace, tokenId } = await loadFixture(
        deployMarketPlace
      );

      await nftContract
        .connect(owner)
        .approve(await marketplace.getAddress(), tokenId);

      await expect(
        marketplace.connect(owner).listNFT(nftContract.getAddress(), tokenId, 0)
      ).to.be.revertedWith("Price must be greater than 0");
    });

    it("should be owner of nft", async function () {
      const { owner, nftContract, marketplace, tokenId } = await loadFixture(
        deployMarketPlace
      );
      const price = ethers.parseEther("10");
      await expect(
        marketplace
          .connect(owner)
          .listNFT(nftContract.getAddress(), tokenId, price)
      ).to.be.revertedWith("Marketplace not approved");
    });
  });

  describe("Purchase an NFT", async function () {
    it("should purchase an NFT", async function () {
      const { nftContract, owner, marketplace, tokenId, token, addr1 } =
        await loadFixture(deployMarketPlace);
      const price = ethers.parseEther("10");
      await token.connect(owner).transfer(addr1.address, price);

      const ownerBalance = await token.balanceOf(owner.address);
      const platformFee = (price * 500n) / 10000n;
      const ownerProceeds = price - platformFee;

      await nftContract
        .connect(owner)
        .approve(marketplace.getAddress(), tokenId);
      await marketplace
        .connect(owner)
        .listNFT(nftContract.getAddress(), tokenId, price);

      // Approve payment from buyer to the marketplace
      await token.connect(addr1).approve(marketplace.getAddress(), price);

      await expect(marketplace.connect(addr1).purchaseNFT(0))
        .to.emit(marketplace, "NFTPurchased")
        .withArgs(0, addr1.address, price);

      const ownerAfterSellingBalance = await token.balanceOf(owner.address);

      const listing = await marketplace.listings(0);
      expect(listing.isActive).to.be.false;
      expect(await nftContract.ownerOf(tokenId)).to.equal(addr1.address);

      expect(ownerAfterSellingBalance - ownerBalance).to.equal(ownerProceeds);
      expect(await token.balanceOf(marketplace.getAddress())).to.equal(
        platformFee
      );
    });

    it("listing should be active", async function () {
      const { nftContract, owner, marketplace, tokenId } = await loadFixture(
        deployMarketPlace
      );
      const price = ethers.parseEther("10");
      await nftContract
        .connect(owner)
        .approve(marketplace.getAddress(), tokenId);
      await marketplace
        .connect(owner)
        .listNFT(nftContract.getAddress(), tokenId, price);

      await marketplace.connect(owner).cancelListing(0);
      await expect(marketplace.purchaseNFT(0)).to.be.revertedWith(
        "Listing is not active"
      );
    });
    it("buyer should not be owner", async function () {
      const { nftContract, owner, marketplace, tokenId } = await loadFixture(
        deployMarketPlace
      );
      const price = ethers.parseEther("10");
      await nftContract
        .connect(owner)
        .approve(marketplace.getAddress(), tokenId);
      await marketplace
        .connect(owner)
        .listNFT(nftContract.getAddress(), tokenId, price);

      await expect(
        marketplace.connect(owner).purchaseNFT(0)
      ).to.be.revertedWith("Cannot buy your own NFT");
    });

    // it("payment of token failed", async function () {
    //   const { nftContract, owner, marketplace, tokenId, token, addr1 } =
    //     await loadFixture(deployMarketPlace);
    //   const price = ethers.parseEther("10");
    //   await token.connect(owner).transfer(addr1.address, price);

    //   await nftContract
    //     .connect(owner)
    //     .approve(marketplace.getAddress(), tokenId);
    //   await marketplace
    //     .connect(owner)
    //     .listNFT(nftContract.getAddress(), tokenId, price);

    //   await expect(
    //     marketplace.connect(addr1).purchaseNFT(0)
    //   ).to.be.revertedWith("Platform fee transfer failed");
    // });
  });
  describe("Cancel an NFT", async function () {
    it("should cancel an NFT listing", async function () {
      const { nftContract, owner, marketplace, tokenId, token, addr1 } =
        await loadFixture(deployMarketPlace);
      const price = ethers.parseEther("10");
      await nftContract
        .connect(owner)
        .approve(marketplace.getAddress(), tokenId);
      await marketplace
        .connect(owner)
        .listNFT(nftContract.getAddress(), tokenId, price);

      await expect(marketplace.connect(owner).cancelListing(0))
        .to.emit(marketplace, "ListingCancelled")
        .withArgs(0);

      const listing = await marketplace.listings(0);
      expect(listing.isActive).to.be.false;
      expect(await nftContract.ownerOf(tokenId)).to.equal(owner.address);
    });
  });

  describe("Update platorm fee", async function () {
    it("should update platform fee by the owner", async function () {
      const { nftContract, owner, marketplace, tokenId, token, addr1 } =
        await loadFixture(deployMarketPlace);
      const newFeePercent = 800; // 8%
      await expect(marketplace.connect(owner).updatePlatformFee(newFeePercent))
        .to.emit(marketplace, "PlatformFeeUpdated")
        .withArgs(newFeePercent);

      expect(await marketplace.platformFeePercent()).to.equal(newFeePercent);
    });
  });

  /**
   * owner - starting balance - 1000
   * owner send 10 to addr1 - 990
   * addr1 approve token to marketplace - 10
   * marketplace store 5% and send rest to owner of nft - 0.5
   * owner - 999.5
   * owner withdraw nft processfee - 999.5 + 0.5
   * owner ending balance - 1000
   */
  describe("Withdraw platform fee", async function () {
    it("should withdraw accumulated platform fees", async function () {
      const { nftContract, owner, marketplace, tokenId, token, addr1 } =
        await loadFixture(deployMarketPlace);
      const price = ethers.parseEther("10");
      const ownerStartingBalance = await token.balanceOf(owner.address);
      await token.connect(owner).transfer(addr1.address, price);
      const platformFee = (price * 500n) / 10000n;

      await nftContract
        .connect(owner)
        .approve(marketplace.getAddress(), tokenId);
      await marketplace
        .connect(owner)
        .listNFT(nftContract.getAddress(), tokenId, price);

      await token.connect(addr1).approve(marketplace.getAddress(), price);
      await marketplace.connect(addr1).purchaseNFT(0);

      await expect(marketplace.connect(owner).withdrawToken())
        .to.emit(marketplace, "FeeWithdrawn")
        .withArgs(platformFee);

      expect(await token.balanceOf(owner.address)).to.equal(
        ownerStartingBalance
      );
    });
  });
});
