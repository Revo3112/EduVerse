// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./CourseFactory.sol";

/**
 * @title CourseLicense
 * @dev Production-ready course license NFT contract for Manta Pacific
 */
contract CourseLicense is ERC1155, Ownable, ReentrancyGuard {
    using Strings for uint256;

    CourseFactory public courseFactory;
    address public platformWallet;

    struct License {
        uint256 courseId;
        address student;
        uint256 durationLicense;
        uint256 expiryTimestamp;
        bool isActive;
    }

    uint256 public constant SECONDS_PER_MONTH = 30 days;
    uint256 public constant MAX_DURATION_MONTHS = 12;

    // Mappings
    mapping(uint256 => mapping(address => License)) public licenses;
    mapping(address => mapping(uint256 => uint256)) public studentTokenIds;
    mapping(uint256 => string) public courseMetadataURI; // New: Course-specific metadata URIs

    // Track relationships between tokens and courses
    mapping(uint256 => uint256) public tokenIdToCourseId;    // tokenId => courseId
    mapping(uint256 => address) public tokenIdToStudent;     // tokenId => student address
    uint256 public nextTokenId = 1;

    uint256 private _tokenIds;
    uint256 public platformFeePercentage = 200; // 2%

    string private _baseURI; // Base URI for metadata

    // Custom errors
    error InvalidDuration(uint256 duration, uint256 maxDuration);
    error CourseNotActive(uint256 courseId);
    error InsufficientPayment(uint256 sent, uint256 required);
    error LicenseNotFound(uint256 courseId, address student);
    error ActiveLicenseExists(uint256 courseId, address student);
    error ArithmeticOverflow();
    error PaymentFailed(string recipient);
    error InvalidAddress(address addr);

    // Events
    event LicenseMinted(
        uint256 indexed courseId,
        address indexed student,
        uint256 tokenId,
        uint256 durationMonths,
        uint256 expiryTimestamp,
        uint256 pricePaid  // ✅ GOLDSKY: Added for revenue analytics
    );

    event LicenseRenewed(
        uint256 indexed courseId,
        address indexed student,
        uint256 tokenId,
        uint256 durationMonths,
        uint256 expiryTimestamp,
        uint256 pricePaid  // ✅ GOLDSKY: Added for revenue analytics
    );

    // ✅ GOLDSKY: New event for analytics - track license expiry
    event LicenseExpired(
        uint256 indexed courseId,
        address indexed student,
        uint256 tokenId,
        uint256 expiredAt
    );

    // ✅ GOLDSKY: New event for revenue analytics
    event RevenueRecorded(
        uint256 indexed courseId,
        address indexed creator,
        uint256 amount,
        uint256 timestamp,
        string revenueType  // "LICENSE_MINT" or "LICENSE_RENEWAL"
    );

    constructor(address _courseFactory, address _platformWallet)
        ERC1155("")
        Ownable(msg.sender)
    {
        if (_courseFactory == address(0)) revert InvalidAddress(_courseFactory);
        if (_platformWallet == address(0)) revert InvalidAddress(_platformWallet);

        courseFactory = CourseFactory(_courseFactory);
        platformWallet = _platformWallet;
    }

    /**
     * @dev Mints a new license NFT for a course with overflow protection
     * @param courseId ID of the course
     * @param durationMonths Duration of the license in months
     */
    function mintLicense(uint256 courseId, uint256 durationMonths) external payable nonReentrant {
        if (durationMonths == 0 || durationMonths > MAX_DURATION_MONTHS) {
            revert InvalidDuration(durationMonths, MAX_DURATION_MONTHS);
        }

        CourseFactory.Course memory course = courseFactory.getCourse(courseId);
        if (!course.isActive) revert CourseNotActive(courseId);

        // Safe multiplication check
        uint256 totalPrice;
        if (durationMonths > 0 && course.pricePerMonth > type(uint256).max / durationMonths) {
            revert ArithmeticOverflow();
        }
        totalPrice = course.pricePerMonth * durationMonths;

        if (msg.value < totalPrice) {
            revert InsufficientPayment(msg.value, totalPrice);
        }

        uint256 tokenId;
        License storage existingLicense = licenses[courseId][msg.sender];

        if (studentTokenIds[msg.sender][courseId] == 0) {
            // New license - assign new tokenId
            tokenId = nextTokenId;
            unchecked {
                nextTokenId++;
            }
            studentTokenIds[msg.sender][courseId] = tokenId;

            // Track tokenId relationships
            tokenIdToCourseId[tokenId] = courseId;
            tokenIdToStudent[tokenId] = msg.sender;
        } else {
            // Existing license - check if expired (preserve current business logic)
            tokenId = studentTokenIds[msg.sender][courseId];
            if (existingLicense.expiryTimestamp >= block.timestamp) {
                revert ActiveLicenseExists(courseId, msg.sender);
            }

            // FIX: Burn expired token before minting replacement to prevent balance accumulation
            if (balanceOf(msg.sender, tokenId) > 0) {
                _burn(msg.sender, tokenId, balanceOf(msg.sender, tokenId));
            }
        }

        // Safe duration calculation
        uint256 durationInSeconds;
        if (durationMonths > type(uint256).max / SECONDS_PER_MONTH) {
            revert ArithmeticOverflow();
        }
        durationInSeconds = durationMonths * SECONDS_PER_MONTH;

        // Safe expiry calculation
        uint256 expiryTimestamp;
        if (block.timestamp > type(uint256).max - durationInSeconds) {
            revert ArithmeticOverflow();
        }
        expiryTimestamp = block.timestamp + durationInSeconds;

        licenses[courseId][msg.sender] = License({
            courseId: courseId,
            student: msg.sender,
            expiryTimestamp: expiryTimestamp,
            durationLicense: durationMonths,
            isActive: true
        });

        _mint(msg.sender, tokenId, 1, "");
        _processPayment(course.creator, totalPrice);

        // ✅ NEW: Record purchase for student history tracking
        courseFactory.recordCoursePurchase(msg.sender, courseId);

        emit LicenseMinted(courseId, msg.sender, tokenId, durationMonths, expiryTimestamp, totalPrice);  // ✅ Added totalPrice
        emit RevenueRecorded(courseId, course.creator, totalPrice, block.timestamp, "LICENSE_MINT");  // ✅ GOLDSKY Analytics
    }

    /**
     * @dev Renews an existing license with enhanced validation
     * @param courseId ID of the course
     * @param durationMonths Additional duration in months
     */
    function renewLicense(uint256 courseId, uint256 durationMonths) external payable nonReentrant {
        if (durationMonths == 0 || durationMonths > MAX_DURATION_MONTHS) {
            revert InvalidDuration(durationMonths, MAX_DURATION_MONTHS);
        }

        uint256 tokenId = studentTokenIds[msg.sender][courseId];
        if (tokenId == 0) revert LicenseNotFound(courseId, msg.sender);

        CourseFactory.Course memory course = courseFactory.getCourse(courseId);
        if (!course.isActive) revert CourseNotActive(courseId);

        // Safe price calculation
        uint256 totalPrice;
        if (durationMonths > 0 && course.pricePerMonth > type(uint256).max / durationMonths) {
            revert ArithmeticOverflow();
        }
        totalPrice = course.pricePerMonth * durationMonths;

        if (msg.value < totalPrice) {
            revert InsufficientPayment(msg.value, totalPrice);
        }

        License storage license = licenses[courseId][msg.sender];

        // Safe duration calculation
        uint256 durationInSeconds;
        if (durationMonths > type(uint256).max / SECONDS_PER_MONTH) {
            revert ArithmeticOverflow();
        }
        durationInSeconds = durationMonths * SECONDS_PER_MONTH;

        uint256 newExpiryTimeStamp;
        if (license.expiryTimestamp > block.timestamp) {
            // License still active - extend from current expiry
            if (license.expiryTimestamp > type(uint256).max - durationInSeconds) {
                revert ArithmeticOverflow();
            }
            newExpiryTimeStamp = license.expiryTimestamp + durationInSeconds;
        } else {
            // License expired - extend from now
            if (block.timestamp > type(uint256).max - durationInSeconds) {
                revert ArithmeticOverflow();
            }
            newExpiryTimeStamp = block.timestamp + durationInSeconds;
        }

        // Safe addition for duration tracking
        if (license.durationLicense > type(uint256).max - durationMonths) {
            revert ArithmeticOverflow();
        }

        // ✅ BUSINESS LOGIC: "Renewal identical to purchase"
        // - Per-transaction limit: Each renewal max 12 months ✅
        // - NO cumulative cap: Users can renew indefinitely ✅
        // - This allows long-term students to maintain access without artificial limits

        license.expiryTimestamp = newExpiryTimeStamp;
        license.durationLicense += durationMonths;  // Track total for analytics only
        license.isActive = true;

        _processPayment(course.creator, totalPrice);

        emit LicenseRenewed(courseId, msg.sender, tokenId, durationMonths, newExpiryTimeStamp, totalPrice);  // ✅ Added totalPrice
        emit RevenueRecorded(courseId, course.creator, totalPrice, block.timestamp, "LICENSE_RENEWAL");  // ✅ GOLDSKY Analytics
    }

    /**
     * @dev Checks if a student has a valid license for a course
     */
    function hasValidLicense(address student, uint256 courseId) external view returns (bool) {
        License memory license = licenses[courseId][student];
        return license.isActive && license.expiryTimestamp > block.timestamp;
    }

    /**
     * @dev Checks and marks license as expired if needed (for analytics)
     * @param student Address of the student
     * @param courseId ID of the course
     * @custom:goldsky Emits LicenseExpired event for analytics tracking
     */
    function checkAndMarkExpired(address student, uint256 courseId) external {
        License storage license = licenses[courseId][student];

        // Only process if license exists, is active, and has expired
        if (license.courseId != 0 && license.isActive && license.expiryTimestamp <= block.timestamp) {
            license.isActive = false;
            uint256 tokenId = studentTokenIds[student][courseId];
            emit LicenseExpired(courseId, student, tokenId, license.expiryTimestamp);
        }
    }

    /**
     * @dev Gets license details for a student and course
     */
    function getLicense(address student, uint256 courseId) external view returns (License memory) {
        return licenses[courseId][student];
    }

    /**
     * @dev Gets all courses a student has purchased (batch operation)
     */
    function getStudentCourses(address student, uint256[] calldata courseIds)
        external
        view
        returns (bool[] memory)
    {
        bool[] memory results = new bool[](courseIds.length);

        for (uint256 i = 0; i < courseIds.length;) {
            uint256 courseId = courseIds[i];
            License memory license = licenses[courseId][student];
            results[i] = license.isActive && license.expiryTimestamp > block.timestamp;

            unchecked {
                ++i;
            }
        }

        return results;
    }

    /**
     * @dev Gets token URI for a given token ID with proper IPFS handling
     */
    function uri(uint256 tokenId) public view override returns (string memory) {
        // First check if there's a specific metadata URI for this course
        License memory license = licenses[_getCourseIdFromTokenId(tokenId)][_getStudentFromTokenId(tokenId)];
        if (license.courseId != 0 && bytes(courseMetadataURI[license.courseId]).length > 0) {
            return courseMetadataURI[license.courseId];
        }

        // Fallback to base URI + tokenId pattern
        if (bytes(_baseURI).length > 0) {
            return string(abi.encodePacked(_baseURI, tokenId.toString(), ".json"));
        }

        // Final fallback - empty string (indicates no metadata set)
        return "";
    }

    /**
     * @dev Sets the base URI for all token metadata (owner only)
     * @param newBaseURI New base URI (should be complete IPFS path like "ipfs://QmHash/")
     */
    function setURI(string memory newBaseURI) external onlyOwner {
        _baseURI = newBaseURI;
        _setURI(newBaseURI);
    }

    /**
     * @dev Sets metadata URI for a specific course (owner only)
     * @param courseId The course ID
     * @param metadataURI Complete IPFS URI for this course's metadata
     */
    function setCourseMetadataURI(uint256 courseId, string memory metadataURI) external onlyOwner {
        courseMetadataURI[courseId] = metadataURI;
    }

    /**
     * @dev Internal function to extract courseId from tokenId
     */
    function _getCourseIdFromTokenId(uint256 tokenId) internal view returns (uint256) {
        return tokenIdToCourseId[tokenId];
    }

    /**
     * @dev Internal function to extract student address from tokenId
     */
    function _getStudentFromTokenId(uint256 tokenId) internal view returns (address) {
        return tokenIdToStudent[tokenId];
    }

    /**
     * @dev Gets the token ID for a student's license to a course
     */
    function getTokenId(address student, uint256 courseId) external view returns (uint256) {
        return studentTokenIds[student][courseId];
    }

    /**
     * @dev Updates platform fee percentage (only owner)
     */
    function setPlatformFeePercentage(uint256 _feePercentage) external onlyOwner {
        require(_feePercentage <= 5000, "Fee too high"); // Max 50%
        platformFeePercentage = _feePercentage;
    }

    /**
     * @dev Updates platform wallet address (only owner)
     */
    function setPlatformWallet(address _platformWallet) external onlyOwner {
        if (_platformWallet == address(0)) revert InvalidAddress(_platformWallet);
        platformWallet = _platformWallet;
    }

    /**
     * @dev Internal function to handle payment processing with enhanced error handling
     */
    function _processPayment(address creator, uint256 totalPrice) internal {
        // Calculate platform fee with overflow protection
        uint256 platformFee;
        if (totalPrice > 0 && platformFeePercentage > 0) {
            if (totalPrice > type(uint256).max / platformFeePercentage) {
                revert ArithmeticOverflow();
            }
            platformFee = (totalPrice * platformFeePercentage) / 10000;
        }

        uint256 creatorPayment;
        if (totalPrice >= platformFee) {
            creatorPayment = totalPrice - platformFee;
        } else {
            revert ArithmeticOverflow();
        }

        // Send platform fee
        if (platformFee > 0 && platformWallet != address(0)) {
            (bool platformSuccess, ) = platformWallet.call{value: platformFee}("");
            if (!platformSuccess) revert PaymentFailed("platform");
        }

        // Send creator payment
        if (creatorPayment > 0) {
            (bool creatorSuccess, ) = creator.call{value: creatorPayment}("");
            if (!creatorSuccess) revert PaymentFailed("creator");
        }

        // Refund excess payment if any
        if (msg.value > totalPrice) {
            uint256 refundAmount = msg.value - totalPrice;
            (bool refundSuccess, ) = msg.sender.call{value: refundAmount}("");
            if (!refundSuccess) revert PaymentFailed("refund");
        }
    }

    /**
     * @dev Emergency function to deactivate license (owner only)
     */
    function emergencyDeactivateLicense(address student, uint256 courseId)
        external
        onlyOwner
    {
        License storage license = licenses[courseId][student];
        if (!license.isActive) revert LicenseNotFound(courseId, student);

        license.isActive = false;
    }

    /**
     * @dev Override _update to prevent license transfers (soulbound behavior)
     * @dev Course licenses should be personal and non-transferable for business logic compliance
     */
    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        override
    {
        // Allow minting (from = address(0)) and burning (to = address(0))
        // Prevent all other transfers to maintain license integrity
        require(from == address(0) || to == address(0), "License transfers not allowed");
        super._update(from, to, ids, values);
    }
}
