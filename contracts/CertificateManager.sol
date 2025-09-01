// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./CourseFactory.sol";
import "./ProgressTracker.sol";
import "./CourseLicense.sol";

/**
 * @title CertificateManager
 * @dev Digital certificate management using ERC-1155 with revolutionary "One Certificate Per User" model
 * @notice NEW BUSINESS LOGIC: Each user gets exactly ONE lifetime certificate that grows with their learning journey
 * @notice Compliant with OpenZeppelin Contracts 5.0 and 2025 best practices
 * @custom:security-contact security@eduverse.com
 */
contract CertificateManager is ERC1155, AccessControl, ReentrancyGuard, Pausable {
    using Strings for uint256;

    // ==================== ROLES ====================
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPDATER_ROLE = keccak256("UPDATER_ROLE");

    // ==================== CUSTOM ERRORS ====================
    error InvalidPaymentReceiptHash();
    error CertificateAlreadyExists();
    error NoCertificateExists();
    error CourseNotCompleted();
    error CourseAlreadyInCertificate();
    error InsufficientPayment();
    error InvalidStringLength(string param, uint256 maxLength);
    error InvalidAddress(address addr);
    error CertificateNotFound(uint256 tokenId);
    error PaymentHashAlreadyUsed();
    error InvalidCIDFormat();
    error ZeroAmount();
    error EmptyCoursesArray();
    error NoLicenseOwnership();
    error ExceedsMaxPrice();
    error CreatorPriceNotSet();

    // ==================== STATE VARIABLES ====================
    CourseFactory public immutable courseFactory;
    ProgressTracker public immutable progressTracker;
    CourseLicense public immutable courseLicense;

    uint256 private _nextTokenId = 1;
    uint256 public constant MAX_CERTIFICATE_PRICE = 0.002 ether; // Maximum 100k IDR equivalent
    uint256 public defaultCertificateFee = 0.001 ether;      // Default fee for minting first certificate
    uint256 public defaultCourseAdditionFee = 0.0001 ether; // Default fee for adding courses to existing certificate
    address public platformWallet;
    string public defaultPlatformName;                // Configurable platform name

    // ==================== STRUCTS ====================
    /**
     * @dev Revolutionary Certificate Structure - One Per User, Grows Over Time
     * @notice Optimized for gas efficiency with struct packing
     */
    struct Certificate {
        uint256 tokenId;                    // Unique certificate ID
        string platformName;               // Platform name (e.g., "EduVerse Academy")
        string recipientName;              // User's display name
        address recipientAddress;          // User's wallet address (20 bytes)
        bool lifetimeFlag;                 // Always true for lifetime validity (1 byte)
        bool isValid;                      // For revocation capability (1 byte)
        string ipfsCID;                    // Main certificate image CID (updated as courses are added)
        string baseRoute;                  // QR code base URL for learning history website
        uint256 issuedAt;                  // Timestamp of first certificate mint
        uint256 lastUpdated;               // Timestamp of last course addition
        uint256 totalCoursesCompleted;     // Counter for completed courses
        bytes32 paymentReceiptHash;        // Payment verification for last action
        uint256[] completedCourses;        // Array of all completed course IDs
    }

    // ==================== MAPPINGS ====================
    mapping(uint256 => Certificate) public certificates;
    mapping(address => uint256) public userCertificates;          // user => single certificate tokenId
    mapping(bytes32 => bool) public usedPaymentHashes;           // Replay protection
    mapping(uint256 => string) private _tokenURIs;               // Custom token URIs
    mapping(uint256 => mapping(uint256 => bool)) public certificateCourseExists; // tokenId => courseId => exists
    mapping(uint256 => uint256) public courseCertificatePrices;  // courseId => certificate price set by creator

    // ==================== EVENTS ====================
    event CertificateMinted(
        address indexed owner,
        uint256 indexed tokenId,
        string recipientName,
        string ipfsCID,
        bytes32 paymentReceiptHash
    );

    event CourseAddedToCertificate(
        address indexed owner,
        uint256 indexed tokenId,
        uint256 indexed courseId,
        string newIpfsCID,
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
    event PlatformNameUpdated(string newPlatformName);
    event CourseAdditionFeeUpdated(uint256 newFee);
    event CourseCertificatePriceSet(uint256 indexed courseId, uint256 price, address indexed creator);

    // ==================== CONSTRUCTOR ====================
    constructor(
        address _courseFactory,
        address _progressTracker,
        address _courseLicense,
        address _platformWallet,
        string memory _initialURI,
        string memory _platformName
    ) ERC1155(_initialURI) {
        if (_courseFactory == address(0)) revert InvalidAddress(_courseFactory);
        if (_progressTracker == address(0)) revert InvalidAddress(_progressTracker);
        if (_courseLicense == address(0)) revert InvalidAddress(_courseLicense);
        if (_platformWallet == address(0)) revert InvalidAddress(_platformWallet);

        courseFactory = CourseFactory(_courseFactory);
        progressTracker = ProgressTracker(_progressTracker);
        courseLicense = CourseLicense(_courseLicense);
        platformWallet = _platformWallet;
        defaultPlatformName = _platformName;    // ✅ FIXED: Now using the constructor parameter

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
     * @dev Mints or updates certificate based on user's certificate status
     * @notice REVOLUTIONARY LOGIC: First course completion = MINT, subsequent = UPDATE
     * @param courseId Course ID that was completed
     * @param recipientName Name to appear on certificate (only used for new certificates)
     * @param ipfsCID IPFS CID of the certificate image
     * @param paymentReceiptHash Hash of payment receipt for verification
     * @param baseRoute Base route for QR code (can be empty)
     */
    function mintOrUpdateCertificate(
        uint256 courseId,
        string calldata recipientName,
        string calldata ipfsCID,
        bytes32 paymentReceiptHash,
        /* bool lifetimeFlag, */
        string calldata baseRoute
    )
        external
        payable
        nonReentrant
        whenNotPaused
        validStringLength(ipfsCID, 62, "ipfsCID")
    {
        // Validate payment receipt hash
        if (paymentReceiptHash == bytes32(0)) revert InvalidPaymentReceiptHash();
        if (usedPaymentHashes[paymentReceiptHash]) revert PaymentHashAlreadyUsed();

        // Check course completion AND license ownership
        if (!progressTracker.isCourseCompleted(msg.sender, courseId)) {
            revert CourseNotCompleted();
        }

        // ✅ NEW: Validate user actually owned a license for this course
        CourseLicense.License memory userLicense = courseLicense.getLicense(msg.sender, courseId);
        if (userLicense.courseId == 0) {
            revert NoLicenseOwnership();
        }
        // Allow expired licenses - user can get certificate if course was completed during license period

        // Get user's existing certificate
        uint256 existingTokenId = userCertificates[msg.sender];

        if (existingTokenId == 0) {
            // User has no certificate - MINT new one (FIRST COURSE)
            _mintFirstCertificate(courseId, recipientName, ipfsCID, paymentReceiptHash, baseRoute);
        } else {
            // User has certificate - ADD course to existing one (SUBSEQUENT COURSES)
            _addCourseToExistingCertificate(existingTokenId, courseId, ipfsCID, paymentReceiptHash);
        }
    }

    /**
     * @dev Internal function to mint first certificate for user
     * @param courseId First completed course ID
     * @param recipientName User's display name
     * @param ipfsCID IPFS CID of certificate image
     * @param paymentReceiptHash Payment verification hash
     * @param baseRoute QR code base route
     */
    function _mintFirstCertificate(
        uint256 courseId,
        string calldata recipientName,
        string calldata ipfsCID,
        bytes32 paymentReceiptHash,
        /* bool lifetimeFlag, */
        string calldata baseRoute
    )
        internal
        validStringLength(recipientName, 100, "recipientName")
    {
        // Get certificate price (creator-set or default)
        uint256 certificatePrice = _getCertificatePrice(courseId);

        // Validate payment for minting
        if (msg.value < certificatePrice) revert InsufficientPayment();

        uint256 tokenId = _nextTokenId++;

        // Mark payment hash as used
        usedPaymentHashes[paymentReceiptHash] = true;

        // Create first course array
        uint256[] memory initialCourses = new uint256[](1);
        initialCourses[0] = courseId;

        // Create certificate with revolutionary design
        certificates[tokenId] = Certificate({
            tokenId: tokenId,
            platformName: defaultPlatformName,
            recipientName: recipientName,
            recipientAddress: msg.sender,
            lifetimeFlag: true,  // Always lifetime validity
            isValid: true,
            ipfsCID: ipfsCID,
            baseRoute: baseRoute,
            issuedAt: block.timestamp,
            lastUpdated: block.timestamp,
            totalCoursesCompleted: 1,
            paymentReceiptHash: paymentReceiptHash,
            completedCourses: initialCourses
        });

        // Map user to their single certificate
        userCertificates[msg.sender] = tokenId;

        // Track course existence for gas-efficient lookups
        certificateCourseExists[tokenId][courseId] = true;

        // Mint the NFT (soulbound)
        _mint(msg.sender, tokenId, 1, "");

        // Process payment with correct distribution (90% creator + 10% platform)
        CourseFactory.Course memory course = courseFactory.getCourse(courseId);
        _processCertificatePayment(course.creator, certificatePrice);

        emit CertificateMinted(msg.sender, tokenId, recipientName, ipfsCID, paymentReceiptHash);
        emit CertificatePaymentRecorded(msg.sender, msg.sender, tokenId, paymentReceiptHash);
    }

    /**
     * @dev Internal function to add course to existing certificate
     * @param tokenId Existing certificate token ID
     * @param courseId New completed course ID
     * @param ipfsCID Updated certificate image CID
     * @param paymentReceiptHash Payment verification hash
     */
    function _addCourseToExistingCertificate(
        uint256 tokenId,
        uint256 courseId,
        string calldata ipfsCID,
        bytes32 paymentReceiptHash
    ) internal {
        // Get certificate price for adding course to existing certificate
        uint256 additionPrice = _getCertificatePrice(courseId);

        // Validate payment for course addition
        if (msg.value < additionPrice) revert InsufficientPayment();

        Certificate storage cert = certificates[tokenId];

        // Verify certificate ownership
        if (cert.recipientAddress != msg.sender) revert CertificateNotFound(tokenId);
        if (!cert.isValid) revert CertificateNotFound(tokenId);

        // Check if course already in certificate
        if (certificateCourseExists[tokenId][courseId]) {
            revert CourseAlreadyInCertificate();
        }

        // Mark payment hash as used
        usedPaymentHashes[paymentReceiptHash] = true;

        // Add course to certificate
        cert.completedCourses.push(courseId);
        unchecked {
            cert.totalCoursesCompleted++; // Safe: we're only adding courses
        }
        cert.lastUpdated = block.timestamp;
        cert.ipfsCID = ipfsCID; // Update certificate image with new course
        cert.paymentReceiptHash = paymentReceiptHash;

        // Track course existence
        certificateCourseExists[tokenId][courseId] = true;

        // Process payment with correct distribution (90% creator + 10% platform)
        CourseFactory.Course memory course = courseFactory.getCourse(courseId);
        _processCertificatePayment(course.creator, additionPrice);

        emit CourseAddedToCertificate(msg.sender, tokenId, courseId, ipfsCID, paymentReceiptHash);
        emit CertificatePaymentRecorded(msg.sender, msg.sender, tokenId, paymentReceiptHash);
    }

    /**
     * @dev Updates certificate IPFS CID after payment verification
     * @notice This is for updating the certificate image only, not adding courses
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
        validStringLength(newIpfsCID, 62, "newIpfsCID")
    {
        if (paymentReceiptHash == bytes32(0)) revert InvalidPaymentReceiptHash();
        if (usedPaymentHashes[paymentReceiptHash]) revert PaymentHashAlreadyUsed();
        if (!_exists(tokenId)) revert CertificateNotFound(tokenId);
        if (msg.value < defaultCourseAdditionFee) revert InsufficientPayment(); // Use smaller fee for updates

        Certificate storage cert = certificates[tokenId];
        if (!cert.isValid) revert CertificateNotFound(tokenId);

        // ✅ NEW: Only certificate owner can update their certificate
        if (cert.recipientAddress != msg.sender) {
            revert("Only certificate owner can update");
        }

        // Mark payment hash as used
        usedPaymentHashes[paymentReceiptHash] = true;

        // Update IPFS CID only
        cert.ipfsCID = newIpfsCID;
        cert.paymentReceiptHash = paymentReceiptHash;
        cert.lastUpdated = block.timestamp;

        // Process payment (use course addition fee for simple updates)
        _processCertificatePayment(platformWallet, defaultCourseAdditionFee);

        emit CertificateUpdated(cert.recipientAddress, tokenId, newIpfsCID, paymentReceiptHash);
        emit CertificatePaymentRecorded(msg.sender, cert.recipientAddress, tokenId, paymentReceiptHash);
    }

    /**
     * @dev Adds multiple courses to existing certificate in batch
     * @notice Gas-efficient batch operation for multiple course completions
     * @param courseIds Array of completed course IDs
     * @param ipfsCID Updated certificate image CID
     * @param paymentReceiptHash Payment verification hash
     */
    function addMultipleCoursesToCertificate(
        uint256[] calldata courseIds,
        string calldata ipfsCID,
        bytes32 paymentReceiptHash
    )
        external
        payable
        nonReentrant
        whenNotPaused
        validStringLength(ipfsCID, 62, "ipfsCID")
    {
        if (courseIds.length == 0) revert EmptyCoursesArray();
        if (paymentReceiptHash == bytes32(0)) revert InvalidPaymentReceiptHash();
        if (usedPaymentHashes[paymentReceiptHash]) revert PaymentHashAlreadyUsed();

        uint256 tokenId = userCertificates[msg.sender];
        if (tokenId == 0) revert NoCertificateExists();

        Certificate storage cert = certificates[tokenId];
        if (!cert.isValid) revert CertificateNotFound(tokenId);

        // Validate payment for batch operation
        uint256 totalFee = defaultCourseAdditionFee * courseIds.length;
        if (msg.value < totalFee) revert InsufficientPayment();

        // Validate all courses are completed and not already in certificate
        for (uint256 i = 0; i < courseIds.length; ) {
            uint256 courseId = courseIds[i];

            if (!progressTracker.isCourseCompleted(msg.sender, courseId)) {
                revert CourseNotCompleted();
            }

            if (certificateCourseExists[tokenId][courseId]) {
                revert CourseAlreadyInCertificate();
            }

            unchecked { ++i; } // Safe: controlled loop
        }

        // Mark payment hash as used
        usedPaymentHashes[paymentReceiptHash] = true;

        // Add all courses
        for (uint256 i = 0; i < courseIds.length; ) {
            uint256 courseId = courseIds[i];
            cert.completedCourses.push(courseId);
            certificateCourseExists[tokenId][courseId] = true;

            emit CourseAddedToCertificate(msg.sender, tokenId, courseId, ipfsCID, paymentReceiptHash);

            unchecked { ++i; } // Safe: controlled loop
        }

        // Update certificate metadata
        unchecked {
            cert.totalCoursesCompleted += courseIds.length; // Safe: we're only adding courses
        }
        cert.lastUpdated = block.timestamp;
        cert.ipfsCID = ipfsCID;
        cert.paymentReceiptHash = paymentReceiptHash;

        // Process payment to platform (batch fee)
        _processCertificatePayment(platformWallet, totalFee);

        emit CertificatePaymentRecorded(msg.sender, msg.sender, tokenId, paymentReceiptHash);
    }

    // ==================== VIEW FUNCTIONS ====================

    /**
     * @dev Gets complete certificate details with all completed courses
     * @param tokenId Certificate token ID
     * @return Certificate struct with full learning journey
     */
    function getCertificate(uint256 tokenId) external view returns (Certificate memory) {
        if (!_exists(tokenId)) revert CertificateNotFound(tokenId);
        return certificates[tokenId];
    }

    /**
     * @dev Gets user's single certificate ID (new logic: one certificate per user)
     * @param user User address
     * @return tokenId (0 if user has no certificate yet)
     */
    function getUserCertificate(address user) external view returns (uint256) {
        return userCertificates[user];
    }

    /**
     * @dev Gets all completed courses for a certificate
     * @param tokenId Certificate token ID
     * @return Array of completed course IDs
     */
    function getCertificateCompletedCourses(uint256 tokenId) external view returns (uint256[] memory) {
        if (!_exists(tokenId)) revert CertificateNotFound(tokenId);
        return certificates[tokenId].completedCourses;
    }

    /**
     * @dev Checks if a specific course is included in a certificate
     * @param tokenId Certificate token ID
     * @param courseId Course ID to check
     * @return Boolean indicating if course is in certificate
     */
    function isCourseInCertificate(uint256 tokenId, uint256 courseId) external view returns (bool) {
        if (!_exists(tokenId)) return false;
        return certificateCourseExists[tokenId][courseId];
    }

    /**
     * @dev Gets certificate statistics for a user
     * @param user User address
     * @return tokenId User's certificate ID (0 if none)
     * @return totalCourses Number of completed courses
     * @return issuedAt Timestamp of first certificate
     * @return lastUpdated Timestamp of last course addition
     */
    function getUserCertificateStats(address user) external view returns (
        uint256 tokenId,
        uint256 totalCourses,
        uint256 issuedAt,
        uint256 lastUpdated
    ) {
        tokenId = userCertificates[user];
        if (tokenId == 0) {
            return (0, 0, 0, 0);
        }

        Certificate memory cert = certificates[tokenId];
        return (tokenId, cert.totalCoursesCompleted, cert.issuedAt, cert.lastUpdated);
    }

    /**
     * @dev Generates QR code data for certificate verification
     * @notice Perfect for new logic - shows complete learning history
     * @param tokenId Certificate token ID
     * @return QR code data string linking to learning history website
     */
    function generateQRData(uint256 tokenId) external view returns (string memory) {
        if (!_exists(tokenId)) revert CertificateNotFound(tokenId);

        Certificate memory cert = certificates[tokenId];

        // If no baseRoute set, return empty string
        if (bytes(cert.baseRoute).length == 0) {
            return "";
        }

        // Generate: baseRoute + ?address=<recipientAddress>&tokenId=<tokenId>
        // Website can then query all completed courses and show full learning journey
        return string(abi.encodePacked(
            cert.baseRoute,
            "?address=",
            Strings.toHexString(uint160(cert.recipientAddress), 20),
            "&tokenId=",
            tokenId.toString(),
            "&courses=",
            cert.totalCoursesCompleted.toString()
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
     * @dev Gets learning journey summary for public verification
     * @param tokenId Certificate token ID
     * @return recipientName User's display name
     * @return platformName Platform name
     * @return totalCourses Number of completed courses
     * @return issuedAt Certificate issue timestamp
     * @return lastUpdated Last update timestamp
     * @return isValid Certificate validity status
     */
    function getLearningJourneySummary(uint256 tokenId) external view returns (
        string memory recipientName,
        string memory platformName,
        uint256 totalCourses,
        uint256 issuedAt,
        uint256 lastUpdated,
        bool isValid
    ) {
        if (!_exists(tokenId)) revert CertificateNotFound(tokenId);

        Certificate memory cert = certificates[tokenId];
        return (
            cert.recipientName,
            cert.platformName,
            cert.totalCoursesCompleted,
            cert.issuedAt,
            cert.lastUpdated,
            cert.isValid
        );
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
     * @dev Sets default certificate fee for new certificate minting (admin only)
     * @param newFee New fee amount
     */
    function setDefaultCertificateFee(uint256 newFee) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newFee == 0) revert ZeroAmount();
        if (newFee > MAX_CERTIFICATE_PRICE) revert ExceedsMaxPrice();
        defaultCertificateFee = newFee;
    }

    /**
     * @dev Sets default course addition fee for adding courses to existing certificates (admin only)
     * @param newFee New fee amount (should be lower than certificate fee)
     */
    function setDefaultCourseAdditionFee(uint256 newFee) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newFee == 0) revert ZeroAmount();
        if (newFee > MAX_CERTIFICATE_PRICE) revert ExceedsMaxPrice();
        defaultCourseAdditionFee = newFee;
        emit CourseAdditionFeeUpdated(newFee);
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
     * @dev Sets default platform name (admin only)
     * @param newPlatformName New platform name
     */
    function setDefaultPlatformName(string calldata newPlatformName) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (bytes(newPlatformName).length == 0 || bytes(newPlatformName).length > 100) {
            revert InvalidStringLength("platformName", 100);
        }
        defaultPlatformName = newPlatformName;
        emit PlatformNameUpdated(newPlatformName);
    }

    /**
     * @dev Sets course certificate price (course creator only)
     * @param courseId Course ID
     * @param price Certificate price (maximum 0.002 ETH)
     */
    function setCourseCertificatePrice(uint256 courseId, uint256 price) external {
        if (price == 0) revert ZeroAmount();
        if (price > MAX_CERTIFICATE_PRICE) revert ExceedsMaxPrice();

        // Verify caller is the course creator
        CourseFactory.Course memory course = courseFactory.getCourse(courseId);
        require(course.creator == msg.sender, "Only course creator can set price");

        courseCertificatePrices[courseId] = price;
        emit CourseCertificatePriceSet(courseId, price, msg.sender);
    }

    /**
     * @dev Gets certificate price for a course
     * @param courseId Course ID
     * @return Certificate price in wei
     */
    function getCourseCertificatePrice(uint256 courseId) external view returns (uint256) {
        uint256 creatorPrice = courseCertificatePrices[courseId];
        if (creatorPrice > 0) {
            return creatorPrice;
        }
        return defaultCertificateFee;
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
        certificates[tokenId].lastUpdated = block.timestamp;
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
     * @dev Gets certificate price for a course (creator-set or default)
     * @param courseId Course ID
     * @return Certificate price in wei
     */
    function _getCertificatePrice(uint256 courseId) internal view returns (uint256) {
        uint256 creatorPrice = courseCertificatePrices[courseId];
        if (creatorPrice > 0) {
            return creatorPrice;
        }
        return defaultCertificateFee;
    }

    /**
     * @dev Processes certificate payment with correct business logic (90% creator + 10% platform)
     * @param recipient Payment recipient (course creator)
     * @param totalAmount Total amount being processed
     */
    function _processCertificatePayment(address recipient, uint256 totalAmount) internal {
        // Calculate fees: 10% platform, 90% creator
        uint256 platformFee = (totalAmount * 1000) / 10000; // 10%
        uint256 creatorFee = totalAmount - platformFee;     // 90%

        // Send platform fee (10%)
        if (platformFee > 0) {
            (bool success, ) = platformWallet.call{value: platformFee}("");
            require(success, "Platform fee transfer failed");
        }

        // Send creator fee (90%)
        if (creatorFee > 0) {
            (bool success, ) = recipient.call{value: creatorFee}("");
            require(success, "Creator payment failed");
        }

        // Refund excess payment
        if (msg.value > totalAmount) {
            uint256 refund = msg.value - totalAmount;
            (bool success, ) = msg.sender.call{value: refund}("");
            require(success, "Refund failed");
        }
    }

    /**
     * @dev Processes certificate payment with improved fee structure
     * @param recipient Payment recipient (creator or platform)
     * @param totalAmount Total amount being processed
     */
    function _processPayment(address recipient, uint256 totalAmount) internal {
        // Calculate platform fee (2%)
        uint256 platformFee = (totalAmount * 200) / 10000;
        uint256 recipientFee = totalAmount - platformFee;

        // Send platform fee
        if (platformFee > 0) {
            (bool success, ) = platformWallet.call{value: platformFee}("");
            require(success, "Platform fee transfer failed");
        }

        // Send recipient fee
        if (recipientFee > 0) {
            (bool success, ) = recipient.call{value: recipientFee}("");
            require(success, "Recipient payment failed");
        }

        // Refund excess payment
        if (msg.value > totalAmount) {
            uint256 refund = msg.value - totalAmount;
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
     * @notice Remove this function to enable transfers
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
