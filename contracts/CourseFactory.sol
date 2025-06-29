// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CourseFactory
 * @dev Updated for Manta Pacific Sepolia - Simplified price mechanism
 */
contract CourseFactory is Ownable, ReentrancyGuard {
    uint256 private _courseIds;

    struct Course {
        uint256 id;
        string title;
        string description;
        string thumbnailCID;
        address creator;
        uint256 pricePerMonth;
        bool isActive;
        uint256 createdAt;
    }

    struct CourseSection {
        uint256 id;
        uint256 courseId;
        string title;
        string contentCID;
        uint256 duration;
        uint256 orderId;
    }

    mapping(uint256 => Course) public courses;
    mapping(uint256 => CourseSection[]) public courseSections;
    mapping(address => uint256[]) public creatorsCourses;

    // Fixed max price in ETH (equivalent to ~$5 at current rates)
    uint256 public constant MAX_PRICE_ETH = 0.002 ether;
    
    // Platform fee percentage (in basis points: 200 = 2%)
    uint256 public platformFeePercentage = 200;

    event CourseCreated(uint256 indexed courseId, address indexed creator, string title);
    event CourseUpdated(uint256 indexed courseId, address indexed creator);
    event SectionAdded(uint256 indexed courseId, uint256 indexed sectionId, string title);
    event SectionUpdated(uint256 indexed courseId, uint256 indexed sectionId);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Creates a new course
     * @param title Course title
     * @param description Course description
     * @param thumbnailCID IPFS CID for thumbnail
     * @param pricePerMonth Price in ETH per month
     */
    function createCourse(
        string memory title, 
        string memory description, 
        string memory thumbnailCID,
        uint256 pricePerMonth
    ) external nonReentrant returns (uint256) {
        require(bytes(title).length > 0, "Title cannot be empty");
        require(bytes(title).length <= 200, "Title too long");
        require(bytes(description).length > 0, "Description cannot be empty");
        require(bytes(description).length <= 1000, "Description too long");
        require(bytes(thumbnailCID).length > 0, "Thumbnail CID cannot be empty");
        require(bytes(thumbnailCID).length <= 100, "Thumbnail CID too long");
        require(pricePerMonth <= MAX_PRICE_ETH, "Price exceeds maximum");
        require(pricePerMonth > 0, "Price must be positive");

        unchecked {
            _courseIds++;
        }
        uint256 newCourseId = _courseIds;

        courses[newCourseId] = Course({
            id: newCourseId,
            title: title,
            description: description,
            thumbnailCID: thumbnailCID,
            creator: msg.sender,
            pricePerMonth: pricePerMonth,
            isActive: true,
            createdAt: block.timestamp
        });

        creatorsCourses[msg.sender].push(newCourseId);
        emit CourseCreated(newCourseId, msg.sender, title);
        return newCourseId;
    }

    /**
     * @dev Updates an existing course
     */
    function updateCourse(
        uint256 courseId,
        string memory title,
        string memory description,
        string memory thumbnailCID,
        uint256 pricePerMonth,
        bool isActive
    ) external nonReentrant {
        require(courses[courseId].creator == msg.sender, "Not course creator");
        require(courseId <= _courseIds && courseId > 0, "Course doesn't exist");
        require(bytes(title).length > 0, "Title cannot be empty");
        require(bytes(title).length <= 200, "Title too long");
        require(bytes(description).length > 0, "Description cannot be empty");
        require(bytes(description).length <= 1000, "Description too long");
        require(bytes(thumbnailCID).length > 0, "Thumbnail CID cannot be empty");
        require(bytes(thumbnailCID).length <= 100, "Thumbnail CID too long");
        require(pricePerMonth <= MAX_PRICE_ETH, "Price exceeds maximum");
        require(pricePerMonth > 0, "Price must be positive");

        Course storage course = courses[courseId];
        course.title = title;
        course.description = description;
        course.thumbnailCID = thumbnailCID;
        course.pricePerMonth = pricePerMonth;
        course.isActive = isActive;

        emit CourseUpdated(courseId, msg.sender);
    }

    /**
     * @dev Adds a section to a course
     */
    function addCourseSection(
        uint256 courseId, 
        string memory title, 
        string memory contentCID,
        uint256 duration
    ) external nonReentrant returns (uint256) {
        require(courses[courseId].creator == msg.sender, "Not course creator");
        require(courseId <= _courseIds && courseId > 0, "Course doesn't exist");
        require(bytes(title).length > 0, "Section title cannot be empty");
        require(bytes(title).length <= 200, "Section title too long");
        require(bytes(contentCID).length > 0, "Content CID cannot be empty");
        require(bytes(contentCID).length <= 100, "Content CID too long");
        require(duration > 0, "Duration must be positive");
        require(duration <= 86400, "Duration too long (max 24 hours)");

        uint256 sectionId = courseSections[courseId].length;

        courseSections[courseId].push(CourseSection({
            id: sectionId,
            courseId: courseId,
            title: title,
            contentCID: contentCID,
            duration: duration,
            orderId: sectionId
        }));

        emit SectionAdded(courseId, sectionId, title);
        return sectionId;
    }

    /**
     * @dev Updates a course section
     */
    function updateCourseSection(
        uint256 courseId, 
        uint256 sectionId, 
        string memory title, 
        string memory contentCID,
        uint256 duration
    ) external nonReentrant {
        require(courses[courseId].creator == msg.sender, "Not course creator");
        require(sectionId < courseSections[courseId].length, "Section doesn't exist");
        require(bytes(title).length > 0, "Section title cannot be empty");
        require(bytes(title).length <= 200, "Section title too long");
        require(bytes(contentCID).length > 0, "Content CID cannot be empty");
        require(bytes(contentCID).length <= 100, "Content CID too long");
        require(duration > 0, "Duration must be positive");
        require(duration <= 86400, "Duration too long (max 24 hours)");

        CourseSection storage section = courseSections[courseId][sectionId];
        section.title = title;
        section.contentCID = contentCID;
        section.duration = duration;

        emit SectionUpdated(courseId, sectionId);
    }

    /**
     * @dev Gets a specific course section
     */
    function getCourseSection(uint256 courseId, uint256 orderIndex) 
        external 
        view 
        returns (
            uint256 id, 
            uint256 courseId_ret,
            string memory title, 
            string memory contentCID,
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
            section.contentCID,
            section.duration
        );
    }

    /**
     * @dev Gets course metadata
     */
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

    /**
     * @dev Gets all courses created by a specific creator
     */
    function getCreatorCourses(address creator) external view returns (uint256[] memory) {
        return creatorsCourses[creator];
    }

    /**
     * @dev Gets all sections of a course
     */
    function getCourseSections(uint256 courseId) external view returns (CourseSection[] memory) {
        return courseSections[courseId];
    }

    /**
     * @dev Gets a specific course
     */
    function getCourse(uint256 courseId) external view returns (Course memory) {
        require(courseId <= _courseIds && courseId > 0, "Course doesn't exist");
        return courses[courseId];
    }

    /**
     * @dev Gets total number of courses
     */
    function getTotalCourses() external view returns (uint256) {
        return _courseIds;
    }

    /**
     * @dev Gets all courses with pagination
     */
    function getAllCourses(uint256 offset, uint256 limit) 
        external 
        view 
        returns (Course[] memory) 
    {
        require(offset < _courseIds || _courseIds == 0, "Offset out of bounds");
        
        uint256 end = offset + limit;
        if (end > _courseIds) {
            end = _courseIds;
        }
        
        uint256 length = end > offset ? end - offset : 0;
        Course[] memory result = new Course[](length);
        
        for (uint256 i = 0; i < length; i++) {
            result[i] = courses[offset + i + 1];
        }
        
        return result;
    }

    /**
     * @dev Backward compatibility - gets all courses
     */
    function getAllCourses() external view returns (Course[] memory) {
        return this.getAllCourses(0, _courseIds);
    }

    /**
     * @dev Updates platform fee percentage (only owner)
     */
    function setPlatformFeePercentage(uint256 _feePercentage) external onlyOwner {
        require(_feePercentage <= 5000, "Fee too high"); // Max 50%
        platformFeePercentage = _feePercentage;
    }
}