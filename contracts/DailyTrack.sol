// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DailyTrack {
    IERC20 public rewardToken;
    struct User {
        uint256 lastLogin;
        uint256 streak;
    }
    mapping(address => User) public users;
    uint256 public dailyReward;

    address public owner;

    event Login(address indexed user, uint256 streak, uint256 reward);
    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "Only the contract owner can perform this action"
        );
        _;
    }

    constructor(address _rewardToken, uint256 _dailyReward) {
        owner = msg.sender;
        rewardToken = IERC20(_rewardToken);
        dailyReward = _dailyReward;
    }
    function dailyLogin() public {
        User storage user = users[msg.sender];
        uint256 currentTime = block.timestamp;
        if (user.lastLogin > 0 && (currentTime - user.lastLogin) < 1 days) {
            revert("You can login only once per day");
        }

        if (
            user.lastLogin > 0 &&
            (currentTime - user.lastLogin) >= 1 days &&
            (currentTime - user.lastLogin) < 2 days
        ) {
            user.streak += 1;
        } else if (
            user.lastLogin > 0 && (currentTime - user.lastLogin) > 2 days
        ) {
            user.streak = 1;
        } else {
            user.streak = 1;
        }
        user.lastLogin = currentTime;
        require(
            rewardToken.balanceOf(address(this)) >= dailyReward,
            "Not enough tokens in Contract"
        );
        rewardToken.transfer(msg.sender, dailyReward);
        emit Login(msg.sender, user.streak, dailyReward);
    }

    function setDailyReward(uint256 _dailyReward) public onlyOwner {
        dailyReward = _dailyReward;
    }

    function withdrawToken(uint256 amount) public onlyOwner {
        rewardToken.transfer(owner, amount);
    }
    function depositTokens(uint256 amount) public {
        require(amount > 0, "Amount must be greater than zero");
        rewardToken.transferFrom(msg.sender, address(this), amount);
    }
}
