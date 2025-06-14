// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./CourseFactory.sol";
import "./CourseLicense.sol";

contract ProgressTracker is Ownable {
    // Membuat object untuk course factory agar kita bisa mengambil fungsi fungsi dari CourseFactory
    CourseFactory public courseFactory;
    // Membuat object untuk Course License agar kita bisa mengambil fungsi fungsi dari CourseLicense
    CourseLicense public courseLicense;

    // Constructor untuk menyimpan da
    constructor (address _courseFactory, address _courseLicense) Ownable(msg.sender) {
        courseFactory = CourseFactory(_courseFactory);
        courseLicense = CourseLicense(_courseLicense);
    }

    struct SectionProgress {
        uint256 courseId;
        uint256 sectionId;
        bool completed;
        uint256 completedAt;
    }

    // Mappings
    // student => courseId => sectionId => SectionProgress
    mapping (address => mapping (uint256 => mapping(uint256 => SectionProgress))) public sectionProgress;
    // student => courseId => number of completed sections
    mapping (address => mapping(uint256 => uint256)) public courseCompletedSections;
    // student => courseId => completed status
    mapping(address => mapping(uint256 => bool)) public coursesCompleted;

    // Events
    event SectionCompleted(address indexed student, uint256 indexed courseId, uint256 indexed sectionId);
    event CourseCompleted(address indexed student, uint256 indexed courseId);

    /**
    * @dev Marks a section as completed
    * @param courseId ID of the course
    * @param sectionId ID of the section
    */
    function completeSection(uint256 courseId, uint256 sectionId) external {
        require(courseLicense.hasValidLicense(msg.sender, courseId), "No valid License");

        // Get course sections to validate section ID
        CourseFactory.CourseSection[] memory sections = courseFactory.getCourseSections(courseId);
        require(sectionId < sections.length, "Invalid section ID");

        // Check if Already Compeleted
        require(!sectionProgress[msg.sender][courseId][sectionId].completed, "Section already completed");

        // Mark section as completed
        sectionProgress[msg.sender][courseId][sectionId] = SectionProgress({
            courseId: courseId,
            sectionId: sectionId,
            completed: true,
            completedAt: block.timestamp
        });

        // Increment completed sections counter
        courseCompletedSections[msg.sender][courseId]++;

        // Check if course is now completed
        if (courseCompletedSections[msg.sender][courseId] == sections.length) {
            coursesCompleted[msg.sender][courseId] = true;
            emit CourseCompleted(msg.sender, courseId);
        }

        // Emit to the event
        emit SectionCompleted(msg.sender, courseId, sectionId);
    }

    /**
     * @dev Checks if a section is completed by a student
     * @param student Address of the student
     * @param courseId ID of the course
     * @param sectionId ID of the section
     * @return bool indicating if section is completed
     */
    function isSectionCompleted (address student, uint256 courseId, uint256 sectionId) external view returns (bool) {
        return sectionProgress[student][courseId][sectionId].completed;
    }

    /**
    * @dev Gets the progress of a student in a course (percentage completed)
    * @param student Address of the student
    * @param courseId ID of the course
    * @return percentage Percentage of course completed (0-100)
    */
    function getCourseProgressPercentage(address student, uint256 courseId) external view returns (uint256) {
       CourseFactory.CourseSection[] memory sections = courseFactory.getCourseSections(courseId);

       if (sections.length == 0){
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
    function isCourseCompleted(address student, uint256 courseId) external view returns (bool) {
        return coursesCompleted[student][courseId];
    }

    /**
    * @dev Gets the completion status of all sections in a course for a student
    * @param student Address of the student
    * @param courseId ID of the course
    * @return Array of booleans indicating which sections are completed
    */
    function getCourseSectionsProgress(address student, uint256 courseId) external view returns (bool[] memory) {
        CourseFactory.CourseSection[] memory sections = courseFactory.getCourseSections(courseId);
        bool[] memory progress = new bool[](sections.length);

        for (uint256 i = 0; i < sections.length; i++) {
            progress[i] = sectionProgress[student][courseId][i].completed;
        }

        return progress;
    }

}
