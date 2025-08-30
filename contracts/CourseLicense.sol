// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./CourseFactory.sol";

/**
 * @title CourseLicense         
 * @dev Course license NFT contract - Simplified for Manta Pacific
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

    // Mappings
    mapping(uint256 => mapping(address => License)) public licenses;
    mapping(address => mapping(uint256 => uint256)) public studentTokenIds;

    // Simple counter for generating unique token IDs
    uint256 private _tokenIds;

    // Platform fee percentage (in basis points: 200 = 2%)
    uint256 public platformFeePercentage = 200;

    event LicenseMinted(
        uint256 indexed courseId,
        address indexed student,
        uint256 tokenId,
        uint256 durationMonths,
        uint256 expiryTimestamp
    );

    event LicenseRenewed(
        uint256 indexed courseId,
        address indexed student,
        uint256 tokenId,
        uint256 durationMonths,
        uint256 expiryTimestamp
    );

    constructor(address _courseFactory, address _platformWallet)
        ERC1155("ipfs://")
        Ownable(msg.sender)
    {
        courseFactory = CourseFactory(_courseFactory);
        platformWallet = _platformWallet;
    }

    /**
     * @dev Mints a new license NFT for a course
     * @param courseId ID of the course
     * @param durationMonths Duration of the license in months
     */
    function mintLicense(uint256 courseId, uint256 durationMonths) external payable nonReentrant {
        require(durationMonths > 0, "Duration must be positive");
        require(durationMonths <= 12, "Maximum 12 months per transaction");

        CourseFactory.Course memory course = courseFactory.getCourse(courseId);
        require(course.isActive, "Course is not active");

        uint256 totalPrice;
        unchecked {
            totalPrice = course.pricePerMonth * durationMonths;
        }
        require(totalPrice >= course.pricePerMonth, "Price overflow");
        require(msg.value >= totalPrice, "Insufficient payment");

        uint256 tokenId;
        License storage existingLicense = licenses[courseId][msg.sender];

        if (studentTokenIds[msg.sender][courseId] == 0) {
            unchecked {
                _tokenIds++;
            }
            tokenId = _tokenIds;
            studentTokenIds[msg.sender][courseId] = tokenId;
        } else {
            tokenId = studentTokenIds[msg.sender][courseId];
            require(existingLicense.expiryTimestamp < block.timestamp, "Existing license not expired");
        }

        uint256 durationInSeconds;
        unchecked {
            durationInSeconds = durationMonths * SECONDS_PER_MONTH;
        }
        require(durationInSeconds >= durationMonths, "Duration overflow");

        uint256 expiryTimestamp;
        unchecked {
            expiryTimestamp = block.timestamp + durationInSeconds;
        }
        require(expiryTimestamp >= block.timestamp, "Expiry overflow");

        licenses[courseId][msg.sender] = License({
            courseId: courseId,
            student: msg.sender,
            expiryTimestamp: expiryTimestamp,
            durationLicense: durationMonths,
            isActive: true
        });

        _mint(msg.sender, tokenId, 1, "");

        _processPayment(course.creator, totalPrice);

        emit LicenseMinted(courseId, msg.sender, tokenId, durationMonths, expiryTimestamp);
    }

    /**
     * @dev Renews an existing license
     * @param courseId ID of the course
     * @param durationMonths Additional duration in months
     */
    function renewLicense(uint256 courseId, uint256 durationMonths) external payable nonReentrant {
        require(durationMonths > 0, "Invalid duration");
        require(durationMonths <= 12, "Maximum 12 months per transaction");

        uint256 tokenId = studentTokenIds[msg.sender][courseId];
        require(tokenId != 0, "License does not exist");

        CourseFactory.Course memory course = courseFactory.getCourse(courseId);
        require(course.isActive, "Course is not active");

        uint256 totalPrice;
        unchecked {
            totalPrice = course.pricePerMonth * durationMonths;
        }
        require(totalPrice >= course.pricePerMonth, "Price overflow");
        require(msg.value >= totalPrice, "Insufficient payment");

        License storage license = licenses[courseId][msg.sender];

        uint256 durationInSeconds;
        unchecked {
            durationInSeconds = durationMonths * SECONDS_PER_MONTH;
        }
        require(durationInSeconds >= durationMonths, "Duration overflow");

        uint256 newExpiryTimeStamp;
        if (license.expiryTimestamp > block.timestamp) {
            unchecked {
                newExpiryTimeStamp = license.expiryTimestamp + durationInSeconds;
            }
            require(newExpiryTimeStamp >= license.expiryTimestamp, "Expiry overflow");
        } else {
            unchecked {
                newExpiryTimeStamp = block.timestamp + durationInSeconds;
            }
            require(newExpiryTimeStamp >= block.timestamp, "Expiry overflow");
        }

        license.expiryTimestamp = newExpiryTimeStamp;
        unchecked {
            license.durationLicense += durationMonths;
        }
        license.isActive = true;

        _processPayment(course.creator, totalPrice);

        emit LicenseRenewed(courseId, msg.sender, tokenId, durationMonths, newExpiryTimeStamp);
    }

    /**
     * @dev Checks if a student has a valid license for a course
     */
    function hasValidLicense(address student, uint256 courseId) external view returns (bool) {
        License memory license = licenses[courseId][student];
        return license.isActive && license.expiryTimestamp > block.timestamp;
    }

    /**
     * @dev Gets license details for a student and course
     */
    function getLicense(address student, uint256 courseId) external view returns (License memory) {
        return licenses[courseId][student];
    }

    /**
     * @dev Gets all courses a student has purchased
     */
    function getStudentCourses(address student, uint256[] calldata courseIds) external view returns (bool[] memory) {
        bool[] memory results = new bool[](courseIds.length);

        for (uint256 i = 0; i < courseIds.length; i++) {
            uint256 courseId = courseIds[i];
            License memory license = licenses[courseId][student];
            results[i] = license.isActive;
        }

        return results;
    }

    /**
     * @dev Gets token URI for a given token ID
     */
    function uri(uint256 tokenId) public view override returns (string memory) {
        return string(abi.encodePacked(super.uri(tokenId), tokenId.toString(), ".json"));
    }

    /**
     * @dev Sets the base URI for all token metadata
     */
    function setURI(string memory newuri) external onlyOwner {
        _setURI(newuri);
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
        require(_platformWallet != address(0), "Invalid address");
        platformWallet = _platformWallet;
    }

    /**
     * @dev Internal function to handle payment processing
     */
    function _processPayment(address creator, uint256 totalPrice) internal {
        // Calculate platform fee
        uint256 platformFee;
        unchecked {
            platformFee = (totalPrice * platformFeePercentage) / 10000;
        }

        uint256 creatorPayment;
        unchecked {
            creatorPayment = totalPrice - platformFee;
        }

        // Send platform fee
        if (platformFee > 0 && platformWallet != address(0)) {
            (bool platformSuccess, ) = platformWallet.call{value: platformFee}("");
            require(platformSuccess, "Platform fee transfer failed");
        }

        // Send creator payment
        if (creatorPayment > 0) {
            (bool creatorSuccess, ) = creator.call{value: creatorPayment}("");
            require(creatorSuccess, "Creator payment failed");
        }

        // Refund excess payment if any
        if (msg.value > totalPrice) {
            uint256 refundAmount;
            unchecked {
                refundAmount = msg.value - totalPrice;
            }
            (bool refundSuccess, ) = msg.sender.call{value: refundAmount}("");
            require(refundSuccess, "Refund failed");
        }
    }
}
