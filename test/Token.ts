import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("Token", function () {
  async function deployToken() {
    const [owner, addr1, addr2] = await hre.ethers.getSigners();
    const Token = await hre.ethers.getContractFactory("Token");
    const token = await Token.deploy("HARTO", "HTO", 100000);
    return { Token, token, owner, addr1, addr2 };
  }
  describe("Deployment", async function () {
    it("should deploy the token with stated initial token", async function () {
      const { token, owner } = await loadFixture(deployToken);
      const totalSupply = await token.totalSupply();
      const ownerBalance = await token.balanceOf(owner.address);
      // 10000 tokens with 18 decimals
      expect(totalSupply).to.equal(hre.ethers.parseEther("100000"));
      expect(ownerBalance).to.equal(hre.ethers.parseEther("100000"));
    });

    it("should allow the owner to mint token", async function () {
      const { token, owner, addr1 } = await loadFixture(deployToken);
      await token.mint(addr1.address, hre.ethers.parseEther("10000"));
      const addr1Balance = await token.balanceOf(addr1.address);
      const totalSupply = await token.totalSupply();
      const ownerBalance = await token.balanceOf(owner.address);

      expect(totalSupply).to.be.equal(ownerBalance + addr1Balance);
      expect(totalSupply).to.be.equal(hre.ethers.parseEther("110000"));
      expect(addr1Balance).to.be.equal(hre.ethers.parseEther("10000"));
    });

    it("should prevent non-owners from minting tokens", async function () {
      const { token, owner, addr1 } = await loadFixture(deployToken);
      expect(
        token.mint(owner.address, hre.ethers.parseEther("10000"))
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Transfer", async function () {
    it("Should allow token transfers between accounts", async function () {
      const { token, owner, addr1 } = await loadFixture(deployToken);
      const ownerStartingBalance = await token.balanceOf(owner.address);
      const transferAmount = hre.ethers.parseEther("500");
      await token.transfer(addr1.address, transferAmount);

      const ownerAfterTransferBalance = await token.balanceOf(owner.address);

      expect(ownerStartingBalance).to.equal(
        transferAmount + ownerAfterTransferBalance
      );
    });

    it("should prevent transfer exceeding balance", async function () {
      const { token, owner, addr1 } = await loadFixture(deployToken);
      await expect(
        token.connect(addr1).transfer(owner.address, hre.ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
    });
  });

  describe("Token details", async function () {
    it("should handle decimals properly", async function () {
      const { token } = await loadFixture(deployToken);
      const decimals = await token.decimals();
      expect(decimals).to.equal(18);
    });

    it("should return correct token details", async function () {
      const { token } = await loadFixture(deployToken);
      const name = await token.name();
      const symbol = await token.symbol();
      expect(name).to.equal("HARTO");
      expect(symbol).to.equal("HTO");
    });
  });
});
