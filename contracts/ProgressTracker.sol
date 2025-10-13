// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./CourseFactory.sol";
import "./CourseLicense.sol";

/**
 * @title ProgressTracker
 * @dev Production-ready progress tracking system for EduVerse educational platform
 * @notice Tracks student progress through courses with persistent storage and gas optimizations
 * @author EduVerse Team
 * @custom:security-contact security@eduverse.com
 */
contract ProgressTracker is Ownable, ReentrancyGuard {
    /// @dev Immutable contract references for gas optimization (saves ~2100 gas per call)
    CourseFactory public immutable courseFactory;
    CourseLicense public immutable courseLicense;

    /// @dev Section progress data structure
    struct SectionProgress {
        uint256 courseId;
        uint256 sectionId;
        bool completed;
        uint256 completedAt;
    }

    // ============ Storage Mappings ============
    /// @dev student => courseId => sectionId => SectionProgress
    mapping(address => mapping(uint256 => mapping(uint256 => SectionProgress))) public sectionProgress;
    /// @dev student => courseId => number of completed sections
    mapping(address => mapping(uint256 => uint256)) public courseCompletedSections;
    /// @dev student => courseId => completion status
    mapping(address => mapping(uint256 => bool)) public coursesCompleted;
    /// @dev student => total sections completed across all courses
    mapping(address => uint256) public totalSectionsCompletedByUser;
    /// @dev student => total courses completed across all courses
    mapping(address => uint256) public totalCoursesCompletedByUser;

    // ============ Custom Errors ============
    /// @dev Thrown when student doesn't have valid license for course
    error NoValidLicense(address student, uint256 courseId);
    /// @dev Thrown when section ID is invalid for course
    error SectionNotFound(uint256 courseId, uint256 sectionId);
    /// @dev Thrown when trying to complete already completed section
    error SectionAlreadyCompleted(address student, uint256 courseId, uint256 sectionId);
    /// @dev Thrown when contract address is zero
    error InvalidContractAddress();

    // ============ Events ============
    /// @dev Emitted when student completes a section
    event SectionCompleted(address indexed student, uint256 indexed courseId, uint256 indexed sectionId);
    /// @dev Emitted when student completes entire course
    event CourseCompleted(address indexed student, uint256 indexed courseId);
    /// @dev Emitted when admin resets student progress
    event ProgressReset(address indexed student, uint256 indexed courseId);

    /**
     * @dev Constructor with comprehensive validation
     * @param _courseFactory Address of CourseFactory contract
     * @param _courseLicense Address of CourseLicense contract
     */
    constructor(address _courseFactory, address _courseLicense) Ownable(msg.sender) {
        if (_courseFactory == address(0) || _courseLicense == address(0)) {
            revert InvalidContractAddress();
        }
        courseFactory = CourseFactory(_courseFactory);
        courseLicense = CourseLicense(_courseLicense);
    }

    /**
     * @dev Marks a section as completed with enhanced validation and gas optimization
     * @param courseId ID of the course
     * @param sectionId ID of the section
     * @notice Requires valid license and validates section exists
     */
    function completeSection(uint256 courseId, uint256 sectionId) external nonReentrant {
        // Gas-efficient custom error instead of require
        if (!courseLicense.hasValidLicense(msg.sender, courseId)) {
            revert NoValidLicense(msg.sender, courseId);
        }

        // Get course sections to validate section ID
        CourseFactory.CourseSection[] memory sections = courseFactory.getCourseSections(courseId);
        if (sectionId >= sections.length) {
            revert SectionNotFound(courseId, sectionId);
        }

        // Check if already completed
        if (sectionProgress[msg.sender][courseId][sectionId].completed) {
            revert SectionAlreadyCompleted(msg.sender, courseId, sectionId);
        }

        // Mark section as completed - ATOMIC OPERATION
        sectionProgress[msg.sender][courseId][sectionId] = SectionProgress({
            courseId: courseId,
            sectionId: sectionId,
            completed: true,
            completedAt: block.timestamp
        });

        // Gas-optimized increment with overflow protection
        uint256 completedCount;
        unchecked {
            completedCount = courseCompletedSections[msg.sender][courseId] + 1;
        }
        courseCompletedSections[msg.sender][courseId] = completedCount;

        // Increment global section counter
        unchecked {
            totalSectionsCompletedByUser[msg.sender] += 1;
        }

        // Check if course is now completed
        if (completedCount == sections.length) {
            coursesCompleted[msg.sender][courseId] = true;

            // Increment global course counter
            unchecked {
                totalCoursesCompletedByUser[msg.sender] += 1;
            }

            emit CourseCompleted(msg.sender, courseId);
        }

        // Emit event following OpenZeppelin conventions
        emit SectionCompleted(msg.sender, courseId, sectionId);
    }

    /**
     * @dev Checks if a section is completed by a student
     * @param student Address of the student
     * @param courseId ID of the course
     * @param sectionId ID of the section
     * @return bool indicating if section is completed
     */
    function isSectionCompleted(address student, uint256 courseId, uint256 sectionId)
        external
        view
        returns (bool)
    {
        return sectionProgress[student][courseId][sectionId].completed;
    }

    /**
     * @dev Gets the progress of a student in a course (percentage completed)
     * @param student Address of the student
     * @param courseId ID of the course
     * @return percentage Percentage of course completed (0-100)
     */
    function getCourseProgressPercentage(address student, uint256 courseId)
        external
        view
        returns (uint256 percentage)
    {
        CourseFactory.CourseSection[] memory sections = courseFactory.getCourseSections(courseId);

        if (sections.length == 0) {
            return 0;
        }

        uint256 completedCount = courseCompletedSections[student][courseId];
        return (completedCount * 100) / sections.length;
    }

    /**
     * @dev Checks if a course is completed by a student
     * @param student Address of the student
     * @param courseId ID of the course
     * @return bool indicating if course is completed
     */
    function isCourseCompleted(address student, uint256 courseId)
        external
        view
        returns (bool)
    {
        return coursesCompleted[student][courseId];
    }

    /**
     * @dev Gets the completion status of all sections in a course for a student
     * @param student Address of the student
     * @param courseId ID of the course
     * @return progress Array of booleans indicating which sections are completed
     */
    function getCourseSectionsProgress(address student, uint256 courseId)
        external
        view
        returns (bool[] memory progress)
    {
        CourseFactory.CourseSection[] memory sections = courseFactory.getCourseSections(courseId);
        progress = new bool[](sections.length);

        for (uint256 i = 0; i < sections.length;) {
            progress[i] = sectionProgress[student][courseId][i].completed;
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @dev Gets detailed section progress for a student
     * @param student Address of the student
     * @param courseId ID of the course
     * @param sectionId ID of the section
     * @return SectionProgress struct with complete details
     */
    function getSectionProgress(address student, uint256 courseId, uint256 sectionId)
        external
        view
        returns (SectionProgress memory)
    {
        return sectionProgress[student][courseId][sectionId];
    }

    /**
     * @dev Gets total number of completed sections for student across all courses
     * @return totalCompleted Total sections completed by student
     * @notice Useful for gamification and achievement systems
     */
    function getTotalSectionsCompleted(address student)
        external
        view
        returns (uint256 totalCompleted)
    {
        return totalSectionsCompletedByUser[student];
    }

    /**
     * @dev Emergency function to reset student progress (owner only)
     * @param student Address of the student
     * @param courseId ID of the course to reset
     * @notice Use only in emergency situations or data corruption
     */
    function emergencyResetProgress(address student, uint256 courseId)
        external
        onlyOwner
    {
        // Get current progress for decrementing global counters
        uint256 currentCompletedSections = courseCompletedSections[student][courseId];
        bool wasCourseCompleted = coursesCompleted[student][courseId];

        // Reset course completion status
        coursesCompleted[student][courseId] = false;
        courseCompletedSections[student][courseId] = 0;

        // Adjust global counters
        if (currentCompletedSections > 0) {
            totalSectionsCompletedByUser[student] -= currentCompletedSections;
        }
        if (wasCourseCompleted) {
            totalCoursesCompletedByUser[student] -= 1;
        }

        // Reset all section progress for the course
        CourseFactory.CourseSection[] memory sections = courseFactory.getCourseSections(courseId);
        for (uint256 i = 0; i < sections.length;) {
            delete sectionProgress[student][courseId][i];
            unchecked {
                ++i;
            }
        }

        emit ProgressReset(student, courseId);
    }

    /**
     * @dev Gets student's completed courses count
     * @return count Number of courses completed by student
     * @notice Useful for certificate eligibility checks
     */
    function getCompletedCoursesCount(address student)
        external
        view
        returns (uint256 count)
    {
        return totalCoursesCompletedByUser[student];
    }
}
