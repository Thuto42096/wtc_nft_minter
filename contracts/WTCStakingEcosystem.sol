// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract WTC_NFT is ERC721, Ownable {
    uint256 public constant MAX_SUPPLY = 10_000;

    uint256 public mintPrice;
    uint256 private _nextTokenId = 1;

    event MintPriceUpdated(uint256 newMintPrice);

    constructor(uint256 initialMintPrice)
        ERC721("WTC NFT", "WTCNFT")
        Ownable(msg.sender)
    {
        mintPrice = initialMintPrice;
    }

    function setMintPrice(uint256 newMintPrice) external onlyOwner {
        mintPrice = newMintPrice;
        emit MintPriceUpdated(newMintPrice);
    }

    function mint(uint256 quantity) external payable {
        require(quantity > 0, "Quantity must be > 0");
        require(_nextTokenId + quantity - 1 <= MAX_SUPPLY, "Max supply reached");
        require(msg.value == mintPrice * quantity, "Incorrect ETH value sent");

        for (uint256 i = 0; i < quantity; i++) {
            _safeMint(msg.sender, _nextTokenId);
            _nextTokenId++;
        }
    }

    function totalSupply() external view returns (uint256) {
        return _nextTokenId - 1;
    }
}

contract WTC_Coin is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor() ERC20("WTC Coin", "WTCC") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
}

contract StakingVault is IERC721Receiver, ReentrancyGuard {
    IERC721 public immutable stakingNft;
    WTC_Coin public immutable rewardToken;

    // 1 full WTC_Coin token per day, paid in ERC20 smallest units.
    uint256 public constant DAILY_REWARD = 1 ether;

    mapping(uint256 tokenId => address staker) public ownerOfToken;
    mapping(uint256 tokenId => uint256 startedAt) public timestampStarted;

    event Staked(address indexed user, uint256 indexed tokenId, uint256 startedAt);
    event RewardsClaimed(address indexed user, uint256 indexed tokenId, uint256 reward);
    event Unstaked(address indexed user, uint256 indexed tokenId, uint256 reward);

    constructor(address nftAddress, address coinAddress) {
        require(nftAddress != address(0), "NFT address is zero");
        require(coinAddress != address(0), "Coin address is zero");

        stakingNft = IERC721(nftAddress);
        rewardToken = WTC_Coin(coinAddress);
    }

    function stake(uint256 tokenId) external {
        require(ownerOfToken[tokenId] == address(0), "Token already staked");

        ownerOfToken[tokenId] = msg.sender;
        timestampStarted[tokenId] = block.timestamp;

        // User must first approve this vault for the tokenId.
        stakingNft.safeTransferFrom(msg.sender, address(this), tokenId);

        emit Staked(msg.sender, tokenId, block.timestamp);
    }

    function calculateRewards(address user, uint256 tokenId) public view returns (uint256) {
        if (ownerOfToken[tokenId] != user) {
            return 0;
        }

        uint256 startedAt = timestampStarted[tokenId];
        if (startedAt == 0) {
            return 0;
        }

        return ((block.timestamp - startedAt) * DAILY_REWARD) / 1 days;
    }

    function claimRewards(uint256 tokenId) public nonReentrant {
        require(ownerOfToken[tokenId] == msg.sender, "Not token staker");

        uint256 reward = calculateRewards(msg.sender, tokenId);
        require(reward > 0, "No rewards available");

        timestampStarted[tokenId] = block.timestamp;

        // This works only after WTC_Coin admin grants MINTER_ROLE to the vault.
        rewardToken.mint(msg.sender, reward);

        emit RewardsClaimed(msg.sender, tokenId, reward);
    }

    function unstake(uint256 tokenId) external nonReentrant {
        require(ownerOfToken[tokenId] == msg.sender, "Not token staker");

        uint256 reward = calculateRewards(msg.sender, tokenId);

        delete ownerOfToken[tokenId];
        delete timestampStarted[tokenId];

        if (reward > 0) {
            // The vault calls WTC_Coin.mint(...) as an authorized minter.
            rewardToken.mint(msg.sender, reward);
            emit RewardsClaimed(msg.sender, tokenId, reward);
        }

        stakingNft.safeTransferFrom(address(this), msg.sender, tokenId);

        emit Unstaked(msg.sender, tokenId, reward);
    }

    function onERC721Received(
        address operator,
        address,
        uint256,
        bytes calldata
    ) external view override returns (bytes4) {
        require(msg.sender == address(stakingNft), "Unsupported NFT contract");
        require(operator == address(this), "Use stake() to deposit NFTs");
        return IERC721Receiver.onERC721Received.selector;
    }
}