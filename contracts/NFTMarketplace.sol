// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract NFTMarketplace is Ownable, ReentrancyGuard {
    struct Listing {
        address nftContract;
        uint256 tokenId;
        address seller;
        uint256 price;
        bool isActive;
    }

    IERC20 public paymentToken;

    mapping(uint256 => Listing) public listings;
    uint256 public listingCounter;

    uint256 public platformFeePercent = 500;

    event NFTListed(
        uint indexed listingId,
        address indexed nftContract,
        uint indexed tokenId,
        address seller,
        uint price
    );

    event NFTPurchased(
        uint indexed listingId,
        address indexed buyer,
        uint price
    );

    event ListingCancelled(uint indexed listingId);

    event PlatformFeeUpdated(uint indexed platformfee);

    event FeeWithdrawn(uint indexed balance);

    constructor(address _paymentTokenAddress) Ownable(msg.sender) {
        paymentToken = IERC20(_paymentTokenAddress);
    }

    function listNFT(
        address _nftContract,
        uint256 _tokenId,
        uint256 _price
    ) external nonReentrant {
        require(_price > 0, "Price must be greater than 0");
        IERC721 nftContract = IERC721(_nftContract);
        require(
            nftContract.ownerOf(_tokenId) == msg.sender,
            "Must own the NFT"
        );
        require(
            nftContract.getApproved(_tokenId) == address(this) ||
                nftContract.isApprovedForAll(msg.sender, address(this)),
            "Marketplace not approved"
        );

        nftContract.transferFrom(msg.sender, address(this), _tokenId);
        uint256 listingId = listingCounter++;
        listings[listingId] = Listing({
            nftContract: _nftContract,
            tokenId: _tokenId,
            seller: msg.sender,
            price: _price,
            isActive: true
        });

        emit NFTListed(listingId, _nftContract, _tokenId, msg.sender, _price);
    }

    function purchaseNFT(uint256 _listingId) external nonReentrant {
        Listing storage listing = listings[_listingId];

        require(listing.isActive, "Listing is not active");
        require(listing.seller != msg.sender, "Cannot buy your own NFT");

        uint256 platformFee = (listing.price * platformFeePercent) / 10000;
        uint256 sellerproceeds = listing.price - platformFee;

        require(
            paymentToken.transferFrom(msg.sender, address(this), platformFee),
            "Platform fee transfer failed"
        );
        require(
            paymentToken.transferFrom(
                msg.sender,
                listing.seller,
                sellerproceeds
            ),
            "Seller payment transfer failed"
        );

        IERC721(listing.nftContract).transferFrom(
            address(this),
            msg.sender,
            listing.tokenId
        );

        listing.isActive = false;

        emit NFTPurchased(_listingId, msg.sender, listing.price);
    }

    function cancelListing(uint256 _listingId) external nonReentrant {
        Listing storage listing = listings[_listingId];

        require(listing.seller == msg.sender, "Only seller can cancel listing");
        require(listing.isActive, "Listing already inactive");

        IERC721(listing.nftContract).transferFrom(
            address(this),
            msg.sender,
            listing.tokenId
        );
        listing.isActive = false;
        emit ListingCancelled(_listingId);
    }

    function updatePlatformFee(uint256 _newFeePercent) external onlyOwner {
        require(_newFeePercent <= 1000, "Fee cannot exceed 10%");
        platformFeePercent = _newFeePercent;
        emit PlatformFeeUpdated(_newFeePercent);
    }

    function withdrawToken() external onlyOwner {
        uint256 balance = paymentToken.balanceOf(address(this));
        require(balance > 0, "No fees to Withdraw");

        require(
            paymentToken.transfer(owner(), balance),
            "Fee Withrawal failed"
        );

        emit FeeWithdrawn(balance);
    }

    // function getTokenURI(
    //     uint256 _listingId
    // ) external view returns (string memory) {
    //     Listing storage listing = listings[_listingId];
    //     require(listing.isActive, "Listing is not active");

    //     IERC721 nftContract = IERC721(listing.nftContract);
    //     string memory tokenURI = nftContract.tokenURI(listing.tokenId);

    //     return tokenURI;
    // }
}
