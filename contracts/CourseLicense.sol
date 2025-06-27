// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./CourseFactory.sol";
// Untuk mendapatkan harga real time antara ETH/USDT maka kita bisa menggunakan chainlink
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract CourseLicense is ERC1155, Ownable, ReentrancyGuard {
    // Menggunakan library Strings dimasukkan uint
    using Strings for uint256;
    // Memasukkan library course factory
    CourseFactory public courseFactory;

    // Menambahkan variabel priceFeed dan platformWallet
    address public platformWallet;
    AggregatorV3Interface internal priceFeed;

    // Membuat struct untuk licensi coure nya
    struct License {
        uint256 courseId;
        address student;
        uint256 durationLicense;
        uint256 expiryTimestamp;
        bool isActive;
    }

    // Untuk membantu menghitung expire date
    uint256 public constant SECONDS_PER_MONTH = 30 days;

    // Mappings
    // Mappings untuk membuat sebuah license jadi setiap course id memiliki student id nya masing masing dan memiliki license masing masing
    mapping (uint256 => mapping(address => License)) public licenses; // courseId => studentId => License

    // Mappings untuk setiap address untuk course id dan masing masing token id nya
    // studentTokenIds[0xABC][1] = 1001;
    mapping (address => mapping(uint256 => uint256)) public studentTokenIds; // studentId => courseId => tokenID    // Mappings untuk setiap tokenId untuk setiap course
    mapping (uint256 => uint256) public courseTokenIds; // courseId => starting tokenId for that course

    // Simple counter for generating unique token IDs
    uint256 private _tokenIds;

    // Event untuk lincesesMinted
    event LincenseMinted (
        uint256 indexed courseId,
        address indexed student,
        uint256 tokenId,
        uint256 durationMonths,
        uint256 expiryTimestamp
    );

    // Event untuk memperbarui licensed
    event LicenseRenewed(
        uint256 indexed courseId,
        address indexed student,
        uint256 tokenId,
        uint256 durationMonths,
        uint256 expiryTimestamp
    );

    constructor(address _courseFactory, address _platformWallet, address _pricefeed)
    ERC1155("ipfs://")
    Ownable(msg.sender)
    {
        courseFactory = CourseFactory(_courseFactory);
        platformWallet = _platformWallet;
        priceFeed = AggregatorV3Interface(_pricefeed);
    }

    // Fungsi untuk mendapatkan harga ETH/USDT dari chainlink
    function getETHPrice() public view returns (uint256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price feed");
        return uint256(price); // Returns price with 8 decimals
    }

    /**
    * @dev Mints a new license NFT for a course
    * @param courseId ID of the course
    * @param durationMonths Duration of the license in months
    */
    function mintLicense(uint256 courseId, uint256 durationMonths) external payable nonReentrant {
        // Pastikan bulan dia melakukan minth ada
        require(durationMonths > 0, "Duration must be Positive");
        require(durationMonths <= 12, "Maximum 12 months per transaction"); // Prevent overflow

        // Pastikan untuk course yang di mint aktif
        CourseFactory.Course memory course = courseFactory.getCourse(courseId);
        require(course.isActive, "Course is not Active");

        // Pastikan saldo cukup dan mealukan pembayaran
        uint256 totalPrice;
        unchecked {
            totalPrice = course.pricePerMonth * durationMonths;
        }
        require(totalPrice >= course.pricePerMonth, "Price overflow"); // Overflow check
        require(msg.value >= totalPrice, "Insufficent Payment");

        // Dapetin tokennya untuk licensi tersebut - ATOMIC OPERATION
        uint256 tokenId;
        License storage existingLicense = licenses[courseId][msg.sender];
        
        // Check if user already has a token for this course
        if (studentTokenIds[msg.sender][courseId] == 0){
            // Increment token counter atomically
            unchecked {
                _tokenIds++;
            }
            tokenId = _tokenIds;
            studentTokenIds[msg.sender][courseId] = tokenId;
        } else {
            tokenId = studentTokenIds[msg.sender][courseId];
            require(existingLicense.expiryTimestamp < block.timestamp, "Existing License Not Expired");
        }

        // Set expiry date with overflow protection
        uint256 durationInSeconds;
        unchecked {
            durationInSeconds = durationMonths * SECONDS_PER_MONTH;
        }
        require(durationInSeconds >= durationMonths, "Duration overflow"); // Overflow check
        
        uint256 expiryTimestamp;
        unchecked {
            expiryTimestamp = block.timestamp + durationInSeconds;
        }
        require(expiryTimestamp >= block.timestamp, "Expiry overflow"); // Overflow check

        // Store License details
        licenses[courseId][msg.sender] = License({
            courseId : courseId,
            student : msg.sender,
            expiryTimestamp : expiryTimestamp,
            durationLicense : durationMonths,
            isActive : true
        });

        // Melakukan minting
        _mint(msg.sender, tokenId, 1, "");

        // Process payments with checks-effects-interactions pattern
        _processPayment(course.creator, totalPrice);

        // emit ke frontend untuk pembuatan minted
        emit LincenseMinted(courseId, msg.sender, tokenId, durationMonths, expiryTimestamp);
    }

    /**
    * @dev Renews an existing license
    * @param courseId ID of the course
    * @param durationMonths Additional duration in months
    */
    function renewLicense(uint256 courseId, uint256 durationMonths) external payable nonReentrant {
        //  pastikan duration month nya itu diatas 0
        require(durationMonths > 0, "Invalid Duration (Must be positive)");
        require(durationMonths <= 12, "Maximum 12 months per transaction"); // Prevent overflow

        // Check apakah license nya itu ada
        uint256 tokenId = studentTokenIds[msg.sender][courseId];
        require(tokenId !=0, "License does not exist");

        // Get Course Details
        CourseFactory.Course memory course = courseFactory.getCourse(courseId);
        require(course.isActive, "Course is Not Active");

        // Get total price with overflow protection
        uint256 totalPrice;
        unchecked {
            totalPrice = course.pricePerMonth * durationMonths;
        }
        require(totalPrice >= course.pricePerMonth, "Price overflow"); // Overflow check
        require (msg.value >= totalPrice,"Insufficient payment");

        // Get Current license
        License storage license = licenses[courseId][msg.sender];

        // Update expiry date (extend from current expiry or from now if already expired)
        uint256 durationInSeconds;
        unchecked {
            durationInSeconds = durationMonths * SECONDS_PER_MONTH;
        }
        require(durationInSeconds >= durationMonths, "Duration overflow"); // Overflow check

        uint256 newExpiryTimeStamp;
        if (license.expiryTimestamp > block.timestamp){
            unchecked {
                newExpiryTimeStamp = license.expiryTimestamp + durationInSeconds;
            }
            require(newExpiryTimeStamp >= license.expiryTimestamp, "Expiry overflow"); // Overflow check
        } else{
            unchecked {
                newExpiryTimeStamp = block.timestamp + durationInSeconds;
            }
            require(newExpiryTimeStamp >= block.timestamp, "Expiry overflow"); // Overflow check
        }

        // Update license details
        license.expiryTimestamp = newExpiryTimeStamp;
        unchecked {
            license.durationLicense += durationMonths;
        }
        license.isActive = true;

        // Process payments with checks-effects-interactions pattern
        _processPayment(course.creator, totalPrice);

        // Emit ke event frontend
        emit LicenseRenewed(courseId, msg.sender, tokenId, durationMonths, newExpiryTimeStamp);
    }

    /**
    * @dev Checks if a student has a valid license for a course
    * @param student Address of the student
    * @param courseId ID of the course
    * @return bool indicating if license is valid and not expired
    */
    function hasValidLicense(address student, uint256 courseId) external view returns (bool) {
        License memory license = licenses[courseId][student];
        return license.isActive && license.expiryTimestamp > block.timestamp;
    }

    /**
    * @dev Gets license details for a student and course
    * @param student Address of the student
    * @param courseId ID of the course
    * @return License details
    */
    function getLicense(address student, uint256 courseId) external view returns (License memory){
        return licenses[courseId][student];
    }

    /**
    * @dev Gets all courses a student has purchased
    * @param student Address of the student
    * @param courseIds Array of course IDs to check
    * @return Array of booleans indicating which courses the student has licenses for
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
     * @param tokenId ID of the token
     * @return URI for the token metadata
     */
    function uri(uint256 tokenId) public view override returns (string memory) {
        return string(abi.encodePacked(super.uri(tokenId), tokenId.toString(), ".json"));
    }

    /**
     * @dev Sets the base URI for all token metadata
     * @param newuri New base URI
     */
    function setURI(string memory newuri) external onlyOwner {
        _setURI(newuri);
    }


    /**
     * @dev Gets the token ID for a student's license to a course
     * @param student Address of the student
     * @param courseId ID of the course
     * @return tokenId Token ID for the license
     */
    function getTokenId(address student, uint256 courseId) external view returns (uint256) {
        return studentTokenIds[student][courseId];
    }

    /**
     * @dev Internal function to handle payment processing safely
     * @param creator Address of the course creator
     * @param totalPrice Total payment amount
     */
    function _processPayment(address creator, uint256 totalPrice) internal {
        // Send payment to creator
        (bool creatorSuccess, ) = creator.call{value: totalPrice}("");
        require(creatorSuccess, "Creator payment failed");

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
