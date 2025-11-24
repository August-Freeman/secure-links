// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Secure Links with FHEVM user-private counter
/// @notice Stores URL hashes and tags on-chain and maintains:
///         - a public global count per URL (for trending)
///         - a per-user encrypted (FHE) link counter
contract SecureLinks is ZamaEthereumConfig {
    struct LinkMeta {
        uint64 timestamp;
        bytes32[] tagHashes;
    }

    // Per-user encrypted counter
    mapping(address => euint32) private _userCounts;

    // Per-user URL list and metadata
    mapping(address => bytes32[]) private _ownerToUrls;
    mapping(address => mapping(bytes32 => bool)) private _ownerHas;
    mapping(address => mapping(bytes32 => LinkMeta)) private _ownerUrlMeta;

    // Global URL registry and public trending counts
    bytes32[] private _allUrls;
    mapping(bytes32 => bool) private _urlRegistered;
    mapping(bytes32 => uint256) private _urlTotalCount; // number of distinct owners who added it

    event LinkAdded(address indexed owner, bytes32 indexed urlHash, uint64 timestamp);

    /// @notice Add a link for msg.sender, and increment sender's encrypted count by an encrypted 1
    /// @param urlHash keccak256 hash of the URL
    /// @param tagHashes array of keccak256(tag) for filtering
    /// @param oneEnc encrypted value '1' (external handle)
    /// @param inputProof FHE input proof
    function saveLink(
        bytes32 urlHash,
        bytes32[] calldata tagHashes,
        externalEuint32 oneEnc,
        bytes calldata inputProof
    ) external {
        require(urlHash != bytes32(0), "invalid urlHash");
        require(!_ownerHas[msg.sender][urlHash], "already added");

        // Register owner->url
        _ownerHas[msg.sender][urlHash] = true;
        _ownerToUrls[msg.sender].push(urlHash);
        _ownerUrlMeta[msg.sender][urlHash] = LinkMeta({
            timestamp: uint64(block.timestamp),
            tagHashes: tagHashes
        });

        // Register global URL and increment public global count
        if (!_urlRegistered[urlHash]) {
            _urlRegistered[urlHash] = true;
            _allUrls.push(urlHash);
        }
        _urlTotalCount[urlHash] += 1;

        // FHE: increment caller's private counter by encrypted 1
        euint32 one = FHE.fromExternal(oneEnc, inputProof);
        _userCounts[msg.sender] = FHE.add(_userCounts[msg.sender], one);

        // Allow decryption of this user's counter by the contract and the user
        FHE.allowThis(_userCounts[msg.sender]);
        FHE.allow(_userCounts[msg.sender], msg.sender);

        emit LinkAdded(msg.sender, urlHash, uint64(block.timestamp));
    }

    /// @notice Returns caller's encrypted link counter
    function getMyLinkCount() external view returns (euint32) {
        return _userCounts[msg.sender];
    }

    /// @notice Returns a user's encrypted link counter
    function getLinkCountOf(address owner) external view returns (euint32) {
        return _userCounts[owner];
    }

    /// @notice Returns URLs and timestamps for an owner
    function getOwnerLinks(address owner)
        external
        view
        returns (bytes32[] memory urls, uint64[] memory timestamps)
    {
        bytes32[] storage list = _ownerToUrls[owner];
        uint256 len = list.length;
        urls = new bytes32[](len);
        timestamps = new uint64[](len);
        for (uint256 i = 0; i < len; ++i) {
            bytes32 h = list[i];
            urls[i] = h;
            timestamps[i] = _ownerUrlMeta[owner][h].timestamp;
        }
    }

    /// @notice Returns tag hashes for a given owner's urlHash
    function getLinkTags(address owner, bytes32 urlHash)
        external
        view
        returns (bytes32[] memory)
    {
        return _ownerUrlMeta[owner][urlHash].tagHashes;
    }

    /// @notice Returns the global list of all distinct URL hashes ever added
    function getAllLinks() external view returns (bytes32[] memory) {
        return _allUrls;
    }

    /// @notice Returns the public total count (number of distinct owners) for a URL
    function getLinkCount(bytes32 urlHash) external view returns (uint256) {
        return _urlTotalCount[urlHash];
    }

    /// @notice Whether an owner has added a given URL
    function hasLink(address owner, bytes32 urlHash) external view returns (bool) {
        return _ownerHas[owner][urlHash];
    }
}


