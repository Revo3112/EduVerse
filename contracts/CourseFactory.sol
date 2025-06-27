// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract CourseFactory is Ownable, ReentrancyGuard {
    uint256 private _courseIds;

    struct Course {
        uint256 id;
        string title;
        string description;
        string thumbnailCID; // ✅ PERBAIKAN: Hanya simpan CID, bukan full URI
        address creator;
        uint256 pricePerMonth;
        bool isActive;
        uint256 createdAt;
    }

    struct CourseSection {
        uint256 id;
        uint256 courseId; // ✅ PERBAIKAN: Konsisten dengan camelCase
        string title;
        string contentCID; // ✅ PERBAIKAN: Simpan CID saja
        uint256 duration;
        uint256 orderId;
    }

    mapping(uint256 => Course) public courses;
    mapping(uint256 => CourseSection[]) public courseSections;
    mapping(address => uint256[]) public creatorsCourses;

    AggregatorV3Interface internal priceFeed;
    uint256 public constant MAX_PRICE_USD = 2 * 10**8; // $2 USD dengan 8 decimals

    event CourseCreated(uint256 indexed courseId, address indexed creator, string title);
    event CourseUpdated(uint256 indexed courseId, address indexed creator);
    event SectionAdded(uint256 indexed courseId, uint256 indexed sectionId, string title);
    event SectionUpdated(uint256 indexed courseId, uint256 indexed sectionId);

    constructor(address _priceFeed) Ownable(msg.sender) {
        priceFeed = AggregatorV3Interface(_priceFeed);
    }

    function getETHPrice() public view returns (uint256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price feed");
        return uint256(price);
    }

    function getMaxPriceInETH() public view returns (uint256) {
        uint256 ethPrice = getETHPrice();
        return (MAX_PRICE_USD * 1 ether) / ethPrice;
    }

    // ✅ PERBAIKAN: Optimized createCourse function
    function createCourse(
        string memory title, 
        string memory description, 
        string memory thumbnailCID, // ✅ Parameter berubah dari thumbnailURI ke thumbnailCID
        uint256 pricePerMonth
    ) external nonReentrant returns (uint256) {
        require(bytes(title).length > 0, "Title cannot be empty");
        require(bytes(title).length <= 200, "Title too long");
        require(bytes(description).length > 0, "Description cannot be empty");
        require(bytes(description).length <= 1000, "Description too long");
        require(bytes(thumbnailCID).length > 0, "Thumbnail CID cannot be empty");
        require(bytes(thumbnailCID).length <= 100, "Thumbnail CID too long");
        require(pricePerMonth <= getMaxPriceInETH(), "Price exceeds $2 limit");

        // Increment course ID atomically
        unchecked {
            _courseIds++;
        }
        uint256 newCourseId = _courseIds;

        courses[newCourseId] = Course({
            id: newCourseId,
            title: title,
            description: description,
            thumbnailCID: thumbnailCID, // ✅ Simpan CID saja
            creator: msg.sender,
            pricePerMonth: pricePerMonth,
            isActive: true,
            createdAt: block.timestamp
        });

        creatorsCourses[msg.sender].push(newCourseId);
        emit CourseCreated(newCourseId, msg.sender, title);
        return newCourseId;
    }

    // ✅ PERBAIKAN: Updated updateCourse function
    function updateCourse(
        uint256 courseId,
        string memory title,
        string memory description,
        string memory thumbnailCID, // ✅ Parameter berubah
        uint256 pricePerMonth,
        bool isActive
    ) external nonReentrant {
        require(courses[courseId].creator == msg.sender, "Not course creator");
        require(pricePerMonth <= getMaxPriceInETH(), "Price exceeds $2 limit");
        require(courseId <= _courseIds && courseId > 0, "Course doesn't exist");
        require(bytes(title).length > 0, "Title cannot be empty");
        require(bytes(title).length <= 200, "Title too long");
        require(bytes(description).length > 0, "Description cannot be empty");
        require(bytes(description).length <= 1000, "Description too long");
        require(bytes(thumbnailCID).length > 0, "Thumbnail CID cannot be empty");
        require(bytes(thumbnailCID).length <= 100, "Thumbnail CID too long");

        Course storage course = courses[courseId];
        course.title = title;
        course.description = description;
        course.thumbnailCID = thumbnailCID; // ✅ Update CID
        course.pricePerMonth = pricePerMonth;
        course.isActive = isActive;

        emit CourseUpdated(courseId, msg.sender);
    }

    // ✅ PERBAIKAN: Optimized addCourseSection
    function addCourseSection(
        uint256 courseId, 
        string memory title, 
        string memory contentCID, // ✅ Parameter berubah dari contentURI ke contentCID
        uint256 duration
    ) external nonReentrant returns (uint256) {
        require(courses[courseId].creator == msg.sender, "Not course creator");
        require(courseId <= _courseIds && courseId > 0, "Course doesn't exist");
        require(bytes(title).length > 0, "Section title cannot be empty");
        require(bytes(title).length <= 200, "Section title too long");
        require(bytes(contentCID).length > 0, "Content CID cannot be empty");
        require(bytes(contentCID).length <= 100, "Content CID too long");
        require(duration > 0, "Duration must be positive");
        require(duration <= 86400, "Duration too long (max 24 hours)"); // Max 24 hours per section

        uint256 sectionId = courseSections[courseId].length;

        courseSections[courseId].push(CourseSection({
            id: sectionId,
            courseId: courseId, // ✅ Konsisten camelCase
            title: title,
            contentCID: contentCID, // ✅ Simpan CID saja
            duration: duration,
            orderId: sectionId
        }));

        emit SectionAdded(courseId, sectionId, title);
        return sectionId;
    }

    // ✅ PERBAIKAN: Updated updateCourseSection
    function updateCourseSection(
        uint256 courseId, 
        uint256 sectionId, 
        string memory title, 
        string memory contentCID, // ✅ Parameter berubah
        uint256 duration
    ) external nonReentrant {
        require(courses[courseId].creator == msg.sender, "Not course creator");
        require(sectionId < courseSections[courseId].length, "Section doesn't exist");
        require(bytes(title).length > 0, "Section title cannot be empty");
        require(bytes(title).length <= 200, "Section title too long");
        require(bytes(contentCID).length > 0, "Content CID cannot be empty");
        require(bytes(contentCID).length <= 100, "Content CID too long");
        require(duration > 0, "Duration must be positive");
        require(duration <= 86400, "Duration too long (max 24 hours)"); // Max 24 hours per section

        CourseSection storage section = courseSections[courseId][sectionId];
        section.title = title;
        section.contentCID = contentCID; // ✅ Update CID
        section.duration = duration;

        emit SectionUpdated(courseId, sectionId);
    }

    // ✅ PERBAIKAN: Updated return structure
    function getCourseSection(uint256 courseId, uint256 orderIndex) 
        external 
        view 
        returns (
            uint256 id, 
            uint256 courseId_ret, // Renamed to avoid shadowing
            string memory title, 
            string memory contentCID, // ✅ Return CID
            uint256 duration
        ) 
    {
        require(courseId <= _courseIds && courseId > 0, "Course doesn't exist");
        require(orderIndex < courseSections[courseId].length, "Section doesn't exist");

        CourseSection storage section = courseSections[courseId][orderIndex];
        return (
            section.id,
            section.courseId,
            section.title,
            section.contentCID, // ✅ Return CID
            section.duration
        );
    }

    // ✅ Tambahan: Helper function untuk get course metadata
    function getCourseMetadata(uint256 courseId) 
        external 
        view 
        returns (
            string memory title,
            string memory description,
            string memory thumbnailCID,
            uint256 sectionsCount
        ) 
    {
        require(courseId <= _courseIds && courseId > 0, "Course doesn't exist");
        Course storage course = courses[courseId];
        return (
            course.title,
            course.description,
            course.thumbnailCID,
            courseSections[courseId].length
        );
    }

    function getCreatorCourses(address creator) external view returns (uint256[] memory) {
        return creatorsCourses[creator];
    }

    function getCourseSections(uint256 courseId) external view returns (CourseSection[] memory) {
        return courseSections[courseId];
    }

    function getCourse(uint256 courseId) external view returns (Course memory) {
        require(courseId <= _courseIds && courseId > 0, "Course doesn't exist");
        return courses[courseId];
    }

    function getTotalCourses() external view returns (uint256) {
        return _courseIds;
    }

    // ✅ PERBAIKAN: Optimized getAllCourses dengan pagination
    function getAllCourses(uint256 offset, uint256 limit) 
        external 
        view 
        returns (Course[] memory) 
    {
        require(offset < _courseIds, "Offset out of bounds");
        
        uint256 end = offset + limit;
        if (end > _courseIds) {
            end = _courseIds;
        }
        
        uint256 length = end - offset;
        Course[] memory result = new Course[](length);
        
        for (uint256 i = 0; i < length; i++) {
            result[i] = courses[offset + i + 1]; // courseId starts from 1
        }
        
        return result;
    }

    // ✅ Backward compatibility
    function getAllCourses() external view returns (Course[] memory) {
        return this.getAllCourses(0, _courseIds);
    }
}