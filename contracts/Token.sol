// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
 
contract Token is ERC20, Ownable {
    constructor(string memory _name,string memory _symbol,uint256 initialSupply) ERC20(_name,_symbol) Ownable(msg.sender) {
        _mint(msg.sender, initialSupply * (10 ** decimals()));
    }

    // Function to mint new tokens (only owner can mint)
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
