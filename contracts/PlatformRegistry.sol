// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PlatformRegistry
 * @dev Menyimpan referensi alamat komponen platform
 */
contract PlatformRegistry is Ownable {
    address public courseFactory;
    address public courseLicense;
    address public progressTracker;
    address public certificateManager;

    event PlatformRegistered(
        address indexed courseFactory,
        address indexed courseLicense,
        address progressTracker,
        address certificateManager
    );

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Register semua komponen platform sekaligus
     */
    function registerPlatform(
        address _courseFactory,
        address _courseLicense,
        address _progressTracker,
        address _certificateManager
    ) external onlyOwner {
        require(_courseFactory != address(0), "Invalid CourseFactory");
        require(_courseLicense != address(0), "Invalid CourseLicense");
        require(_progressTracker != address(0), "Invalid ProgressTracker");
        require(_certificateManager != address(0), "Invalid CertificateManager");

        courseFactory = _courseFactory;
        courseLicense = _courseLicense;
        progressTracker = _progressTracker;
        certificateManager = _certificateManager;

        emit PlatformRegistered(
            _courseFactory,
            _courseLicense,
            _progressTracker,
            _certificateManager
        );
    }
}
