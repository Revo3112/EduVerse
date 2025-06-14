// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./CourseFactory.sol";
import "./CourseLicense.sol";
import "./ProgressTracker.sol";
import "./CertificateManager.sol";

/**
 * @title PlatformFactory
 * @dev Factory contract to deploy and connect all platform components
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
    * @param priceFeed Address of the price feed
    */
    function deployPlatform(address platformWallet, address priceFeed) external onlyOwner {
        require(address(courseFactory) == address(0), "Platform already deployed");
        require(platformWallet != address(0), "Invalid platform wallet");
        require(priceFeed != address(0), "Invalid price feed");

        // Deploy CourseFactory
        courseFactory = new CourseFactory(priceFeed);

        // Deploy CourseLicense
        courseLicense = new CourseLicense(address(courseFactory), platformWallet, priceFeed);

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
