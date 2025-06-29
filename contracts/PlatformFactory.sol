// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * NOTE: This contract is OPTIONAL and not required for deployment.
 * The deploy-manta-pacific.js script deploys contracts individually.
 * This file is kept for reference purposes only.
 */

import "@openzeppelin/contracts/access/Ownable.sol";
import "./CourseFactory.sol";
import "./CourseLicense.sol";
import "./ProgressTracker.sol";
import "./CertificateManager.sol";

/**
 * @title PlatformFactory
 * @dev Factory contract to deploy all platform components (OPTIONAL)
 */
contract PlatformFactory is Ownable {
    CourseFactory public courseFactory;
    CourseLicense public courseLicense;
    ProgressTracker public progressTracker;
    CertificateManager public certificateManager;

    event PlatformDeployed(
        address courseFactory,
        address courseLicense,
        address progressTracker,
        address certificateManager
    );

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Deploys all platform contracts
     * @param platformWallet Address to receive platform fees
     */
    function deployPlatform(address platformWallet) external onlyOwner {
        require(address(courseFactory) == address(0), "Platform already deployed");
        require(platformWallet != address(0), "Invalid platform wallet");

        // Deploy CourseFactory (no parameters needed)
        courseFactory = new CourseFactory();

        // Deploy CourseLicense (2 parameters only)
        courseLicense = new CourseLicense(address(courseFactory), platformWallet);

        // Deploy ProgressTracker
        progressTracker = new ProgressTracker(address(courseFactory), address(courseLicense));

        // Deploy CertificateManager
        certificateManager = new CertificateManager(
            address(courseFactory),
            address(progressTracker),
            platformWallet
        );

        // Transfer ownership of all contracts to the caller
        courseFactory.transferOwnership(msg.sender);
        courseLicense.transferOwnership(msg.sender);
        progressTracker.transferOwnership(msg.sender);
        certificateManager.transferOwnership(msg.sender);

        emit PlatformDeployed(
            address(courseFactory),
            address(courseLicense),
            address(progressTracker),
            address(certificateManager)
        );
    }
}