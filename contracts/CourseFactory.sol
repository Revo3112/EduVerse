// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract CourseFactory is Ownable {
    // Menggunakan library Counters untuk mengamankan pembuatan ID;
    using Counters for Counters.Counter;
    Counters.Counter private _courseIds;

    //  Memmbangun Struct untuk pembuatan course
    struct Course {
        uint256 id;
        string title;
        string description;
        string thumbnailURI;
        address creator;
        uint256 pricePerMonth; // In smallest unit of native token (e.g. wei)
        bool isActive;
        uint256 createdAt;
    }

    struct CourseSection {
        uint256 id;
        uint256 CourseId;
        string title;
        string contentURI; // IPFS/Livepeer URI for video conten
        uint256 duration; // dalam detik
        uint256 orderId; // Maintain Section Order
    }

    // Melakukan mapping untuk course dengan id nya
    // Key (courseId)	Value (Course)
    //      1	        {id: 1, title: "Solidity Basics", creator: 0xABC, pricePerMonth: 100 wei, isActive: true}
    //      2	        {id: 2, title: "DeFi Mastery", creator: 0xDEF, pricePerMonth: 200 wei, isActive: true}
    mapping (uint256 => Course) public courses;

    // Melakukan mappings untuk Course Section dengan id nya
    // Key (courseId)	Value (CourseSection[])
    // 1	[ {id: 101, courseId: 1, title: "Intro", contentURI: "ipfs://abc", duration: 300, orderIndex: 1}, {id: 102, courseId: 1, title: "Smart Contracts", contentURI: "ipfs://def", duration: 600, orderIndex: 2} ]
    // 2	[ {id: 201, courseId: 2, title: "DeFi Basics", contentURI: "ipfs://xyz", duration: 450, orderIndex: 1} ]
    mapping (uint256 => CourseSection[]) public courseSections;

    // Key (creator address)	Value (uint256[] - daftar courseId)
    //      0xABC	            [1, 3] (Kursus yang dibuat: Solidity Basics & Ethereum DApps)
    //      0xDEF	            [2] (Kursus yang dibuat: DeFi Mastery)
    mapping (address => uint256[]) public creatorsCourses;

    // Chainlink Price Feed untuk mendapatkan harga ETH/USD
    AggregatorV3Interface internal priceFeed;
    uint256 public constant MAX_PRICE_USD = 2 * 10**8 ; // 2 USD

    //  Membuat sinyal trigger ke frontend berdasarkan event yang terjadi
    event CourseCreated(uint256 indexed CourseId, address indexed creator, string title);
    event CourseUpdated(uint256 indexed CourseId, address indexed  creator);
    event SectionAdded(uint256 indexed CourseId, uint256 indexed sectionId, string title);
    event SectionUpdated(uint256 indexed CourseId, uint256 indexed sectionId);

    constructor(address _priceFeed) Ownable(msg.sender) {
        priceFeed = AggregatorV3Interface(_priceFeed);
    }

    /**
    * @dev Gets the latest ETH/USD price from Chainlink oracle
    * @return Price of ETH in USD with 8 decimals
    */
    function getETHPrice() public view returns (uint256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price feed");
        return uint256(price); // Returns ETH price with 8 decimals
    }

    /**
    * @dev Calculates maximum price in ETH based on $2 limit
    * @return Maximum price in wei
    */
    function getMaxPriceInETH() public view returns (uint256) {
        uint256 ethPrice = getETHPrice(); // Price of 1 ETH in USD (with 8 decimals)
        // $2 in wei = (2 * 10^8 * 10^18) / ethPrice
        // This converts $2 to the equivalent amount in ETH (wei)
        return (MAX_PRICE_USD * 1 ether) / ethPrice;
    }

    // Function untuk membuat Course untuk setiap course maker

    /**
     * @dev Creates a new course
     * @param title Course title
     * @param description Course description
     * @param thumbnailURI IPFS URI for course thumbnail
     * @param pricePerMonth Price per month in smallest unit of native token
     * @return courseId The ID of the newly created course
     */
    function createCourse(string memory title, string memory description, string memory thumbnailURI, uint256 pricePerMonth) external returns (uint256)  {
        // Validasi harga per bulan
        require(pricePerMonth <= getMaxPriceInETH(), "Price exceeds $2 limit");
        // Melakukan increment untuk user
        _courseIds.increment();
        // Menggunakan new course ids
        uint256 newCourseId = _courseIds.current();

        // Membuat course baru dengan memanfaatkan struct yang ada
        Course memory newCourse = Course({
            id : newCourseId,
            title : title,
            description: description,
            thumbnailURI: thumbnailURI,
            creator: msg.sender,
            pricePerMonth: pricePerMonth,
            isActive: true, // Membuat course ini default active
            createdAt : block.timestamp
        });

        // Membuat courses baru berdasarkan new id
        courses[newCourseId] = newCourse;
        creatorsCourses[msg.sender].push(newCourseId);

        // Emit ini digunakan untuk mentrigger event
        emit CourseCreated(newCourseId, msg.sender, title);
        return newCourseId;
    }

    /**
     * @dev Updates an existing course
     * @param courseId ID of the course to update
     * @param title Updated course title
     * @param description Updated course description
     * @param thumbnailURI Updated IPFS URI for course thumbnail
     * @param pricePerMonth Updated price per month
     * @param isActive Course active status
     */
    function updateCourse(
        uint256 courseId,
        string memory title,
        string memory description,
        string memory thumbnailURI,
        uint256 pricePerMonth,
        bool isActive
    ) external {
        require(courses[courseId].creator == msg.sender, "Not Course Creator");
        // Validasi harga per bulan
        require(pricePerMonth <= getMaxPriceInETH(), "Price exceeds $2 limit");
        // Validasi course id
        require(courseId <= _courseIds.current(), "Course doesn't exist");

        Course storage course = courses[courseId];
        course.title = title;
        course.description = description;
        course.thumbnailURI = thumbnailURI;
        course.pricePerMonth = pricePerMonth;
        course.isActive = isActive;

        emit CourseUpdated(courseId, msg.sender);
    }

    function getDataCourse(uint256  courseId) external view returns (uint256 id, string memory title, string memory description, uint256 pricePerMonth, bool isActive) {
        Course storage course = courses[courseId];

        return (
            id = course.id,
            title = course.title,
            description = course.description,
            pricePerMonth = course.pricePerMonth,
            isActive=course.isActive
        );
    }

    /**
     * @dev Adds a new section to a course
     * @param courseId ID of the course
     * @param title Section title
     * @param contentURI IPFS/Livepeer URI for section content
     * @param duration Duration of the content in seconds
     * @return sectionId The index of the newly added section
     */
    function addCourseSection(uint256 courseId, string memory title, string memory contentURI, uint256 duration) external returns (uint256) {
        require(courses[courseId].creator == msg.sender, "Not course creator");

        uint256 orderIndex = courseSections[courseId].length;

        CourseSection memory newSection =  CourseSection({
            id : orderIndex,
            CourseId : courseId,
            title : title,
            contentURI : contentURI,
            duration : duration,
            orderId : orderIndex
        });

        courseSections[courseId].push(newSection);

        emit SectionAdded(courseId, orderIndex, title);
        return orderIndex;
    }

    /**
     * @dev Updates an existing course section
     * @param courseId ID of the course
     * @param sectionId ID of the section
     * @param title Updated section title
     * @param contentURI Updated IPFS/Livepeer URI for section content
     * @param duration Updated duration in seconds
     */
    function updateCourseSection(uint256 courseId, uint256 sectionId, string memory title, string memory contentURI, uint256 duration) external {
        require(courses[courseId].creator == msg.sender, "Not course creator");
        require(sectionId < courseSections[courseId].length, "Section doesn't exit");

        CourseSection storage section = courseSections[courseId][sectionId];
        section.title = title;
        section.contentURI = contentURI;
        section.duration = duration;

        emit SectionUpdated(courseId, sectionId);
    }

    // Mengembalikan course section yang dari course tertentu dan section tertentu
    function getCourseSection(uint256 courseId, uint256 orderIndex) external view returns (uint256 id, uint256 CourseId,string memory title, string memory contentURI , uint256 duration){
        for(uint256 i=0; i<courseSections[courseId].length;i++) {
            if ( courseSections[courseId][i].orderId == orderIndex ){
                CourseSection storage section = courseSections[courseId][i];

                return (
                    section.id,
                    section.CourseId,
                    section.title,
                    section.contentURI,
                    section.duration
                );
            }
        }
    }

     /**
     * @dev Get all courses created by a specific creator
     * @param creator Address of the creator
     * @return Array of course IDs created by the creator
     */
    function getCreatorCourses(address creator) external view returns (uint256[] memory) {
        return creatorsCourses[creator];
    }

     /**
     * @dev Get all sections for a specific course
     * @param courseId ID of the course
     * @return Array of course sections
     */
    function getCourseSections(uint256 courseId) external view returns (CourseSection[] memory) {
        return courseSections[courseId];
    }

    /**
     * @dev Get course details
     * @param courseId ID of the course
     * @return Course details
     */
    function getCourse(uint256 courseId) external view returns (Course memory) {
        return courses[courseId];
    }

    /**
     * @dev Get total number of courses
     * @return Total number of courses
     */
    function getTotalCourses() external view returns (uint256) {
        return _courseIds.current();
    }
}
