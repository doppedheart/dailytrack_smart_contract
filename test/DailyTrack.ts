import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre, { ethers } from "hardhat";

describe("DailyTrack", async function () {
  async function deployDailyTrack() {
    const [owner, addr1, addr2] = await hre.ethers.getSigners();
    const Token = await hre.ethers.getContractFactory("Token");
    const DailyTrack = await hre.ethers.getContractFactory("DailyTrack");

    // deploying token contract
    const token = await Token.deploy("HARTO", "HTO", 100000);
    await token.waitForDeployment();
    const dailyReward = hre.ethers.parseEther("1");

    // deploying main logic contract
    const dailyTrack = await DailyTrack.deploy(
      await token.getAddress(),
      dailyReward
    );
    const contractBalance = hre.ethers.parseEther("1000");
    await dailyTrack.waitForDeployment();
    await token.transfer(await dailyTrack.getAddress(), contractBalance);
    return {
      Token,
      DailyTrack,
      token,
      dailyReward,
      dailyTrack,
      owner,
      addr1,
      addr2,
      contractBalance,
    };
  }

  describe("Deployment", async function () {
    it("Should Initialize with correct values", async function () {
      const { dailyTrack, token, dailyReward, owner } = await loadFixture(
        deployDailyTrack
      );
      expect(await dailyTrack.rewardToken()).to.equal(await token.getAddress());
      expect(await dailyTrack.dailyReward()).to.equal(dailyReward);
      expect(await dailyTrack.owner()).to.equal(owner.address);
    });

    it("Should allow a user to log in and receive rewards", async function () {
      const { dailyTrack, addr1, dailyReward, token, contractBalance } =
        await loadFixture(deployDailyTrack);
      await dailyTrack.connect(addr1).dailyLogin();
      const userBalance = await token.balanceOf(addr1.address);
      const currentContractBalance = await token.balanceOf(
        await dailyTrack.getAddress()
      );
      const userData = await dailyTrack.users(addr1.address);

      expect(userBalance).to.equal(dailyReward);
      expect(currentContractBalance).to.equal(contractBalance - dailyReward);
      expect(userData.streak).to.equal(1);
      expect(userData.lastLogin).to.be.gt(0);
    });

    it("should fail if user login twice in a single day", async function () {
      const { dailyTrack, addr1 } = await loadFixture(deployDailyTrack);
      await dailyTrack.connect(addr1).dailyLogin();
      await expect(dailyTrack.connect(addr1).dailyLogin()).to.be.revertedWith(
        "You can login only once per day"
      );
    });
  });
  describe("Streak check", async function () {
    it("Should increment streak for consecutive logins", async function () {
      const { dailyTrack, addr1, dailyReward, token, contractBalance } =
        await loadFixture(deployDailyTrack);

      // First login
      await dailyTrack.connect(addr1).dailyLogin();

      // Ensure initial state
      const initialUserData = await dailyTrack.users(addr1.address);
      expect(initialUserData.streak).to.equal(1);

      // Increase time by 1 day and mine a new block with updated time
      const newTimestamp = (await time.latest()) + 24 * 60 * 60;
      await hre.ethers.provider.send("evm_setNextBlockTimestamp", [
        newTimestamp,
      ]);
      await hre.ethers.provider.send("evm_mine");

      // Second login
      await dailyTrack.connect(addr1).dailyLogin();

      // Verify streak incremented
      const updatedUserData = await dailyTrack.users(addr1.address);
      expect(updatedUserData.streak).to.equal(2);

      // Ensure contract balance is updated
      const userBalance = await token.balanceOf(addr1.address);
      const currentContractBalance = await token.balanceOf(
        await dailyTrack.getAddress()
      );
      expect(userBalance).to.equal(dailyReward * BigInt(2)); // Two rewards given
      expect(currentContractBalance).to.equal(
        contractBalance - dailyReward * BigInt(2)
      );
    });

    it("Should reset streak if login is missed", async function () {
      const { dailyTrack, addr1, token, dailyReward, contractBalance } =
        await loadFixture(deployDailyTrack);

      await dailyTrack.connect(addr1).dailyLogin();
      const initialUserData = await dailyTrack.users(addr1.address);
      expect(initialUserData.streak).to.equal(1);

      const newTimestamp = (await time.latest()) + 49 * 60 * 60;
      await hre.ethers.provider.send("evm_setNextBlockTimestamp", [
        newTimestamp,
      ]);
      await hre.ethers.provider.send("evm_mine");

      await dailyTrack.connect(addr1).dailyLogin();

      const updatedUserData = await dailyTrack.users(addr1.address);
      expect(updatedUserData.streak).to.equal(1);
    });
  });

  describe("Admin changes", async function () {
    it("revert if anyone else change the daily reward", async function () {
      const { dailyTrack, addr1 } = await loadFixture(deployDailyTrack);
      await expect(
        dailyTrack.connect(addr1).setDailyReward(hre.ethers.parseEther("2"))
      ).to.be.revertedWith("Only the contract owner can perform this action");
    });

    it("should revert if someone else try to withdraw", async function () {
      const { dailyTrack, addr1 } = await loadFixture(deployDailyTrack);
      await expect(
        dailyTrack.connect(addr1).withdrawToken(hre.ethers.parseEther("1"))
      ).to.be.revertedWith("Only the contract owner can perform this action");
    });

    it("should change daily reward", async function () {
      const { dailyTrack, owner, dailyReward } = await loadFixture(
        deployDailyTrack
      );
      const newDailyReward = hre.ethers.parseEther("2");
      await dailyTrack.setDailyReward(newDailyReward);

      expect(await dailyTrack.dailyReward()).to.equal(newDailyReward);
    });

    it("Should withdraw token", async function () {
      const { token, dailyTrack, owner } = await loadFixture(deployDailyTrack);
      const ownerStartingBalance = await token.balanceOf(owner.address);
      await dailyTrack.withdrawToken(hre.ethers.parseEther("10"));
      const ownerBalance = await token.balanceOf(owner.address);

      expect(ownerBalance - ownerStartingBalance).to.equal(
        hre.ethers.parseEther("10")
      );
    });
  });

  describe("Deposit token", async function () {
    it("should revert with amount is zero", async function () {
      const { dailyTrack } = await loadFixture(deployDailyTrack);

      await expect(dailyTrack.depositTokens(0)).to.be.revertedWith(
        "Amount must be greater than zero"
      );
    });
    it("Should increase token of contract after recieveing token", async function () {
      const { dailyTrack, owner, token } = await loadFixture(deployDailyTrack);
      const startingBalance = await token.balanceOf(
        await dailyTrack.getAddress()
      );
      await token.approve(
        await dailyTrack.getAddress(),
        hre.ethers.parseEther("100")
      );
      await dailyTrack.depositTokens(hre.ethers.parseEther("100"));

      const endingBalance = await token.balanceOf(
        await dailyTrack.getAddress()
      );

      expect(endingBalance - startingBalance).to.equal(
        hre.ethers.parseEther("100")
      );
    });
  });
});

// test to check single user cannot withdraw twice
