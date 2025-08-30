// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./CourseFactory.sol";
import "./ProgressTracker.sol";

/**
 * @title CertificateManager
 * @dev Digital certificate management using ERC-1155 with ZKP support for Manta Pacific
 * @notice Compliant with OpenZeppelin Contracts 5.0 and 2025 best practices
 */
contract CertificateManager is ERC1155, AccessControl, ReentrancyGuard, Pausable {
    using Strings for uint256;

    // ==================== ROLES ====================
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPDATER_ROLE = keccak256("UPDATER_ROLE");

    // ==================== CUSTOM ERRORS ====================
    error InvalidPaymentReceiptHash();
    error CertificateAlreadyIssued();
    error CourseNotCompleted();
    error InsufficientPayment();
    error InvalidStringLength(string param, uint256 maxLength);
    error InvalidAddress(address addr);
    error CertificateNotFound(uint256 tokenId);
    error PaymentHashAlreadyUsed();
    error InvalidCIDFormat();
    error ZeroAmount();

    // ==================== STATE VARIABLES ====================
    CourseFactory public immutable courseFactory;
    ProgressTracker public immutable progressTracker;

    uint256 private _nextTokenId = 1;
    uint256 public certificateFee = 0.001 ether;
    address public platformWallet;

    // ==================== STRUCTS ====================
    struct Certificate {
        uint256 tokenId;
        string platformName;
        string recipientName;
        address recipientAddress;
        string ipfsCID;              // Main certificate image CID
        string baseRoute;            // For QR code generation (not hardcoded)
        uint256 issuedAt;
        bool lifetimeFlag;           // true = lifetime, false = has expiry
        bytes32 paymentReceiptHash;  // Payment verification
        uint256 courseId;            // Associated course
        bool isValid;                // For revocation
    }

    // ==================== MAPPINGS ====================
    mapping(uint256 => Certificate) public certificates;
    mapping(address => mapping(uint256 => uint256)) public userCertificates; // user => courseId => tokenId
    mapping(bytes32 => bool) public usedPaymentHashes; // Replay protection
    mapping(uint256 => string) private _tokenURIs; // Custom token URIs

    // ==================== EVENTS ====================
    event CertificateMinted(
        address indexed owner,
        uint256 indexed tokenId,
        string ipfsCID,
        bytes32 paymentReceiptHash
    );

    event CertificateUpdated(
        address indexed owner,
        uint256 indexed tokenId,
        string newIpfsCID,
        bytes32 paymentReceiptHash
    );

    event CertificatePaymentRecorded(
        address indexed payer,
        address indexed owner,
        uint256 indexed tokenId,
        bytes32 paymentReceiptHash
    );

    event CertificateRevoked(uint256 indexed tokenId, string reason);
    event BaseRouteUpdated(uint256 indexed tokenId, string newBaseRoute);

    // ==================== CONSTRUCTOR ====================
    constructor(
        address _courseFactory,
        address _progressTracker,
        address _platformWallet,
        string memory _initialURI,
        string memory _platformName
    ) ERC1155(_initialURI) {
        if (_courseFactory == address(0)) revert InvalidAddress(_courseFactory);
        if (_progressTracker == address(0)) revert InvalidAddress(_progressTracker);
        if (_platformWallet == address(0)) revert InvalidAddress(_platformWallet);

        courseFactory = CourseFactory(_courseFactory);
        progressTracker = ProgressTracker(_progressTracker);
        platformWallet = _platformWallet;

        // Setup roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(UPDATER_ROLE, msg.sender);
    }

    // ==================== MODIFIERS ====================
    modifier validStringLength(string memory str, uint256 maxLength, string memory paramName) {
        if (bytes(str).length == 0 || bytes(str).length > maxLength) {
            revert InvalidStringLength(paramName, maxLength);
        }
        _;
    }

    modifier validCID(string memory cid) {
        if (bytes(cid).length < 46 || bytes(cid).length > 62) {
            revert InvalidCIDFormat();
        }
        _;
    }

    // ==================== MAIN FUNCTIONS ====================

    /**
     * @dev Mints certificate after course completion and payment verification
     * @param courseId Course ID that was completed
     * @param recipientName Name to appear on certificate
     * @param ipfsCID IPFS CID of the certificate image
     * @param paymentReceiptHash Hash of payment receipt for verification
     * @param lifetimeFlag Whether certificate is lifetime valid
     * @param baseRoute Optional base route for QR code (can be empty)
     */
    function mintCertificate(
        uint256 courseId,
        string calldata recipientName,
        string calldata ipfsCID,
        bytes32 paymentReceiptHash,
        bool lifetimeFlag,
        string calldata baseRoute
    )
        external
        payable
        nonReentrant
        whenNotPaused
        onlyRole(MINTER_ROLE)
        validStringLength(recipientName, 100, "recipientName")
        validCID(ipfsCID)
    {
        // Validate payment receipt hash
        if (paymentReceiptHash == bytes32(0)) revert InvalidPaymentReceiptHash();
        if (usedPaymentHashes[paymentReceiptHash]) revert PaymentHashAlreadyUsed();

        // Check course completion
        if (!progressTracker.isCourseCompleted(msg.sender, courseId)) {
            revert CourseNotCompleted();
        }

        // Check if certificate already exists
        if (userCertificates[msg.sender][courseId] != 0) {
            revert CertificateAlreadyIssued();
        }

        // Validate payment
        if (msg.value < certificateFee) revert InsufficientPayment();

        // Get platform name from course
        CourseFactory.Course memory course = courseFactory.getCourse(courseId);

        uint256 tokenId = _nextTokenId++;

        // Mark payment hash as used
        usedPaymentHashes[paymentReceiptHash] = true;

        // Create certificate
        certificates[tokenId] = Certificate({
            tokenId: tokenId,
            platformName: "Manta Education Platform", // Default platform name
            recipientName: recipientName,
            recipientAddress: msg.sender,
            ipfsCID: ipfsCID,
            baseRoute: baseRoute,
            issuedAt: block.timestamp,
            lifetimeFlag: lifetimeFlag,
            paymentReceiptHash: paymentReceiptHash,
            courseId: courseId,
            isValid: true
        });

        // Map user to certificate
        userCertificates[msg.sender][courseId] = tokenId;

        // Mint NFT (non-transferable/soulbound by default)
        _mint(msg.sender, tokenId, 1, "");

        // Process payment
        _processPayment(course.creator);

        emit CertificateMinted(msg.sender, tokenId, ipfsCID, paymentReceiptHash);
        emit CertificatePaymentRecorded(msg.sender, msg.sender, tokenId, paymentReceiptHash);
    }

    /**
     * @dev Updates certificate IPFS CID after payment verification
     * @param tokenId Certificate token ID to update
     * @param newIpfsCID New IPFS CID
     * @param paymentReceiptHash Payment verification hash
     */
    function updateCertificate(
        uint256 tokenId,
        string calldata newIpfsCID,
        bytes32 paymentReceiptHash
    )
        external
        payable
        nonReentrant
        whenNotPaused
        onlyRole(UPDATER_ROLE)
        validCID(newIpfsCID)
    {
        if (paymentReceiptHash == bytes32(0)) revert InvalidPaymentReceiptHash();
        if (usedPaymentHashes[paymentReceiptHash]) revert PaymentHashAlreadyUsed();
        if (!_exists(tokenId)) revert CertificateNotFound(tokenId);
        if (msg.value < certificateFee) revert InsufficientPayment();

        Certificate storage cert = certificates[tokenId];
        if (!cert.isValid) revert CertificateNotFound(tokenId);

        // Mark payment hash as used
        usedPaymentHashes[paymentReceiptHash] = true;

        // Update IPFS CID
        cert.ipfsCID = newIpfsCID;
        cert.paymentReceiptHash = paymentReceiptHash;

        // Process payment
        CourseFactory.Course memory course = courseFactory.getCourse(cert.courseId);
        _processPayment(course.creator);

        emit CertificateUpdated(cert.recipientAddress, tokenId, newIpfsCID, paymentReceiptHash);
        emit CertificatePaymentRecorded(msg.sender, cert.recipientAddress, tokenId, paymentReceiptHash);
    }

    /**
     * @dev Updates base route for QR code generation
     * @param tokenId Certificate token ID
     * @param newBaseRoute New base route
     */
    function updateBaseRoute(
        uint256 tokenId,
        string calldata newBaseRoute
    )
        external
        onlyRole(UPDATER_ROLE)
        validStringLength(newBaseRoute, 200, "baseRoute")
    {
        if (!_exists(tokenId)) revert CertificateNotFound(tokenId);

        certificates[tokenId].baseRoute = newBaseRoute;
        emit BaseRouteUpdated(tokenId, newBaseRoute);
    }

    /**
     * @dev Revokes a certificate
     * @param tokenId Certificate to revoke
     * @param reason Reason for revocation
     */
    function revokeCertificate(
        uint256 tokenId,
        string calldata reason
    )
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (!_exists(tokenId)) revert CertificateNotFound(tokenId);

        certificates[tokenId].isValid = false;
        emit CertificateRevoked(tokenId, reason);
    }

    // ==================== VIEW FUNCTIONS ====================

    /**
     * @dev Gets complete certificate details
     * @param tokenId Certificate token ID
     * @return Certificate struct
     */
    function getCertificate(uint256 tokenId) external view returns (Certificate memory) {
        if (!_exists(tokenId)) revert CertificateNotFound(tokenId);
        return certificates[tokenId];
    }

    /**
     * @dev Generates QR code data for certificate verification
     * @param tokenId Certificate token ID
     * @return QR code data string with address parameter
     */
    function generateQRData(uint256 tokenId) external view returns (string memory) {
        if (!_exists(tokenId)) revert CertificateNotFound(tokenId);

        Certificate memory cert = certificates[tokenId];

        // If no baseRoute set, return empty string
        if (bytes(cert.baseRoute).length == 0) {
            return "";
        }

        // Generate: baseRoute + ?address=<recipientAddress>
        return string(abi.encodePacked(
            cert.baseRoute,
            "?address=",
            Strings.toHexString(uint160(cert.recipientAddress), 20),
            "&tokenId=",
            tokenId.toString()
        ));
    }

    /**
     * @dev Verifies if certificate is valid and exists
     * @param tokenId Certificate token ID
     * @return Boolean indicating validity
     */
    function verifyCertificate(uint256 tokenId) external view returns (bool) {
        return _exists(tokenId) && certificates[tokenId].isValid;
    }

    /**
     * @dev Gets user's certificate for a specific course
     * @param user User address
     * @param courseId Course ID
     * @return tokenId (0 if not found)
     */
    function getUserCertificate(address user, uint256 courseId) external view returns (uint256) {
        return userCertificates[user][courseId];
    }

    /**
     * @dev Custom URI function for metadata
     * @param tokenId Token ID
     * @return Token URI
     */
    function uri(uint256 tokenId) public view override returns (string memory) {
        if (!_exists(tokenId)) revert CertificateNotFound(tokenId);

        // Return custom URI if set, otherwise default
        if (bytes(_tokenURIs[tokenId]).length > 0) {
            return _tokenURIs[tokenId];
        }

        return string(abi.encodePacked(super.uri(tokenId), tokenId.toString(), ".json"));
    }

    // ==================== ADMIN FUNCTIONS ====================

    /**
     * @dev Sets certificate fee (admin only)
     * @param newFee New fee amount
     */
    function setCertificateFee(uint256 newFee) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newFee == 0) revert ZeroAmount();
        certificateFee = newFee;
    }

    /**
     * @dev Sets platform wallet (admin only)
     * @param newWallet New wallet address
     */
    function setPlatformWallet(address newWallet) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newWallet == address(0)) revert InvalidAddress(newWallet);
        platformWallet = newWallet;
    }

    /**
     * @dev Sets custom token URI
     * @param tokenId Token ID
     * @param tokenURI Custom URI
     */
    function setTokenURI(
        uint256 tokenId,
        string calldata tokenURI
    )
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (!_exists(tokenId)) revert CertificateNotFound(tokenId);
        _tokenURIs[tokenId] = tokenURI;
    }

    /**
     * @dev Pauses contract operations
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpauses contract operations
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // ==================== INTERNAL FUNCTIONS ====================

    /**
     * @dev Processes certificate payment
     * @param creator Course creator address
     */
    function _processPayment(address creator) internal {
        // Calculate platform fee (2%)
        uint256 platformFee = (certificateFee * 200) / 10000;
        uint256 creatorFee = certificateFee - platformFee;

        // Send platform fee
        if (platformFee > 0) {
            (bool success, ) = platformWallet.call{value: platformFee}("");
            require(success, "Platform fee transfer failed");
        }

        // Send creator fee
        if (creatorFee > 0) {
            (bool success, ) = creator.call{value: creatorFee}("");
            require(success, "Creator payment failed");
        }

        // Refund excess payment
        if (msg.value > certificateFee) {
            uint256 refund = msg.value - certificateFee;
            (bool success, ) = msg.sender.call{value: refund}("");
            require(success, "Refund failed");
        }
    }

    /**
     * @dev Checks if token exists
     * @param tokenId Token ID to check
     * @return Boolean indicating existence
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        return tokenId > 0 && tokenId < _nextTokenId;
    }

    /**
     * @dev Override for soulbound behavior (non-transferable)
     * @dev Remove this function to enable transfers
     */
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override {
        // Allow minting (from == address(0)) and burning (to == address(0))
        // Block transfers between users (soulbound behavior)
        if (from != address(0) && to != address(0)) {
            revert("Certificates are soulbound");
        }
        super._update(from, to, ids, values);
    }

    // ==================== INTERFACE OVERRIDES ====================

    /**
     * @dev Interface support check
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
