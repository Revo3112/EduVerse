// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./CourseFactory.sol";
// Untuk mendapatkan harga real time antara ETH/USDT maka kita bisa menggunakan chainlink
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract CourseLicense is ERC1155, Ownable {
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
    mapping (address => mapping(uint256 => uint256)) public studentTokenIds; // studentId => courseId => tokenID

    // Mappings untuk setiap tokenId untuk setiap course
    mapping (uint256 => uint256) public courseTokenIds; // courseId => starting tokenId for that course

    // Using counter to create Counter Id
    using Counters for Counters.Counter;
    // Counter for generating unique token IDs
    Counters.Counter private _tokenIds;

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
    function mintLicense(uint256 courseId, uint256 durationMonths) external payable {
        // Pastikan bulan dia melakukan minth ada
        require(durationMonths > 0, "Duration must be Positive");

        // Pastikan untuk course yang di mint aktif
        CourseFactory.Course memory course = courseFactory.getCourse(courseId);
        require(course.isActive, "Course is not Active");

        // Pastikan saldo cukup dan mealakukan pembayaran
        uint256 totalPrice = course.pricePerMonth * durationMonths;
        require(msg.value >= totalPrice, "Insufficent Payment");

        // Dapetin tokennya untuk licensi tersebut
        uint256 tokenId;

        // Kita ngechek nih token user tuh ada apa enggak kalo misalnya ada kita coba chek apakah udah expiaret atau belom kalo gak ada kita buat id nya
        if (studentTokenIds[msg.sender][courseId] == 0){
            _tokenIds.increment();
            tokenId = _tokenIds.current();
            studentTokenIds[msg.sender][courseId] = tokenId;
        }else {
            tokenId = studentTokenIds[msg.sender][courseId];
            require(licenses[courseId][msg.sender].expiryTimestamp < block.timestamp, "Existing License Not Expired");
        }

        // Set expiry date
        uint256 expiryTimestamp = block.timestamp + (durationMonths * SECONDS_PER_MONTH);

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

        // calculate Fees and distributed payment
        uint256 creatorPayment = totalPrice;

        // Send Payment
        (bool creatorSuccess, ) = course.creator.call{value: creatorPayment}("");
        require(creatorSuccess, "Creator payment failed");

        // Tambahkan: kembalikan kelebihan ETH jika ada
        if (msg.value > totalPrice) {
            uint256 refundAmount = msg.value - totalPrice;
            (bool refundSuccess, ) = msg.sender.call{value: refundAmount}("");
            require(refundSuccess, "Refund failed");
        }

        // emit ke frontend untuk pembuatan minted
        emit LincenseMinted(courseId, msg.sender, tokenId, durationMonths, expiryTimestamp);
    }

    /**
    * @dev Renews an existing license
    * @param courseId ID of the course
    * @param durationMonths Additional duration in months
    */
    function renewLicense(uint256 courseId, uint256 durationMonths) external payable {
        //  pastikan duration month nya itu diatas 0
        require(durationMonths > 0, "Invalid Duration (Must be positive)");

        // Check apakah license nya itu ada
        uint256 tokenId = studentTokenIds[msg.sender][courseId];
        require(tokenId !=0, "License does not exist");

        // Get Course Details
        CourseFactory.Course memory course = courseFactory.getCourse(courseId);
        require(course.isActive, "License is Not Active");

        // Get total price
        uint256 totalPrice = course.pricePerMonth * durationMonths;
        require (msg.value >= totalPrice,"Insufficient payment");

        // Get Current license
        License storage license = licenses[courseId][msg.sender];

        // Update expiry date (extend from current expiry or from now if already expired)'

        uint256 newExpiryTimeStamp;
        if (license.expiryTimestamp > block.timestamp){

            newExpiryTimeStamp = license.expiryTimestamp + (durationMonths * SECONDS_PER_MONTH);

        } else{

            newExpiryTimeStamp = block.timestamp + (durationMonths * SECONDS_PER_MONTH);

        }

        license.expiryTimestamp = newExpiryTimeStamp;
        license.durationLicense += durationMonths;
        license.isActive = true;

        // calculate payment
        uint256 creatorPayment = totalPrice;

        // send payment
        (bool creatorSuccess, ) = course.creator.call{value : creatorPayment}("");
        require(creatorSuccess, "Creator Payment failed");

         // Tambahkan: kembalikan kelebihan ETH jika ada
        if (msg.value > totalPrice) {
            uint256 refundAmount = msg.value - totalPrice;
            (bool refundSuccess, ) = msg.sender.call{value: refundAmount}("");
            require(refundSuccess, "Refund failed");
        }

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

}
