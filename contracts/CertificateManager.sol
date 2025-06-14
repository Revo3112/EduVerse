// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./CourseFactory.sol";
import "./ProgressTracker.sol";

/**
 * @title CertificateManager
 * @dev Issues and manages course completion certificates as NFTs
 */
contract CertificateManager is ERC1155, Ownable {
    // Membuat agar kita bisa mengkonversi dari int ke string
    using Strings for uint256;

    constructor(address _courseFactory, address _progressTracker, address _platformWallet)
        ERC1155("ipfs://")
        Ownable(msg.sender)
    {
        courseFactory = CourseFactory(_courseFactory);
        progressTracker = ProgressTracker(_progressTracker);
        platformWallet = _platformWallet;
    }

    // Deklarasi courseFactory dari file solidity Course Factory
    CourseFactory public courseFactory;

    // Deklarasi ProgressTacker
    ProgressTracker public progressTracker;

    // Certificate metadata
    struct Certificate {
        uint256 courseId;
        address student;
        string studentName;
        uint256 issuedAt;
        uint256 certificateId;
        bool isValid;
    }

    uint256 public _nextCertificateId = 1;

    // Certificate pricing
    uint256 public certificateFee = 0.001 ether; // Fee to mint a certificate

    // Platform fee percentage (in basis points: 200 = 2%)
    uint256 public platformFeePercentage = 200; // 2%
    address public platformWallet;

    // Mappings
    mapping(uint256 => Certificate) public certificates; // certificateId => Certificate
    mapping(address => mapping(uint256 => uint256)) public studentCertificates; // student => courseId => certificateId

    // Events
    event CertificateIssued(
        uint256 indexed certificateId,
        uint256 indexed courseId,
        address indexed student,
        uint256 issuedAt
    );

    event CertificateRevoked(uint256 indexed certificateId);

    /**
     * @dev Issues a certificate for completing a course
     * @param courseId ID of the completed course
     * @param studentName Name of the student to appear on certificate
     */
    function issueCertificate(uint256 courseId, string memory studentName) external payable {
        // Check if course is completed
        require(progressTracker.isCourseCompleted(msg.sender, courseId), "Course not completed");

        // Check if certificate already exists
        require(studentCertificates[msg.sender][courseId] == 0, "Certificate already issued");

        // Check payment
        require(msg.value >= certificateFee, "Insufficient fee");

        // Create new certificate
        uint256 certificateId = _nextCertificateId++;

        certificates[certificateId] = Certificate({
            courseId: courseId,
            student: msg.sender,
            studentName: studentName,
            issuedAt: block.timestamp,
            certificateId: certificateId,
            isValid: true
        });

        // Associate certificate with student
        studentCertificates[msg.sender][courseId] = certificateId;

        // Mint certificate NFT
        _mint(msg.sender, certificateId, 1, "");

        // Process payment
        CourseFactory.Course memory course = courseFactory.getCourse(courseId);

        // Calculate fees
        uint256 platformFee = (certificateFee * platformFeePercentage) / 10000;
        uint256 creatorFee = certificateFee - platformFee;

        // Distribute payments
        (bool platformSuccess, ) = platformWallet.call{value: platformFee}("");
        require(platformSuccess, "Platform fee transfer failed");

        (bool creatorSuccess, ) = course.creator.call{value: creatorFee}("");
        require(creatorSuccess, "Creator payment failed");

        emit CertificateIssued(certificateId, courseId, msg.sender, block.timestamp);
    }

    /**
     * @dev Admin function to revoke a certificate (e.g., in case of fraud)
     * @param certificateId ID of the certificate to revoke
     */
    function revokeCertificate(uint256 certificateId) external onlyOwner {
        require(certificates[certificateId].isValid, "Certificate not valid or doesn't exist");

        certificates[certificateId].isValid = false;

        emit CertificateRevoked(certificateId);
    }

    /**
     * @dev Verifies if a certificate is valid
     * @param certificateId ID of the certificate to verify
     * @return bool indicating if certificate is valid
     */
    function verifyCertificate(uint256 certificateId) external view returns (bool) {
        return certificates[certificateId].isValid;
    }

    /**
     * @dev Gets certificate details
     * @param certificateId ID of the certificate
     * @return Certificate details
     */
    function getCertificate(uint256 certificateId) external view returns (Certificate memory) {
        return certificates[certificateId];
    }

    /**
     * @dev Gets a student's certificate for a course
     * @param student Address of the student
     * @param courseId ID of the course
     * @return certificateId ID of the certificate (0 if none)
     */
    function getStudentCertificate(address student, uint256 courseId) external view returns (uint256) {
        return studentCertificates[student][courseId];
    }

    /**
     * @dev Sets the certificate fee
     * @param newFee New certificate fee
     */
    function setCertificateFee(uint256 newFee) external onlyOwner {
        certificateFee = newFee;
    }

    /**
     * @dev Sets the platform fee percentage
     * @param newFeePercentage New fee percentage in basis points
     */
    function setPlatformFee(uint256 newFeePercentage) external onlyOwner {
        require(newFeePercentage <= 5000, "Fee too high"); // Max 50%
        platformFeePercentage = newFeePercentage;
    }

    /**
     * @dev Sets the platform wallet address
     * @param newWallet New platform wallet address
     */
    function setPlatformWallet(address newWallet) external onlyOwner {
        require(newWallet != address(0), "Invalid address");
        platformWallet = newWallet;
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
     * @dev Generates certificate metadata for use in frontend display
     * @param certificateId ID of the certificate
     * @return JSON metadata for the certificate
     */
    function getCertificateMetadata(uint256 certificateId) external view returns (string memory) {
        Certificate memory cert = certificates[certificateId];
        require(cert.isValid, "Certificate not valid");

        CourseFactory.Course memory course = courseFactory.getCourse(cert.courseId);

        // Return a formatted metadata structure that can be used by frontends
        return string(
            abi.encodePacked(
                '{"certificateId":"', certificateId.toString(),
                '","courseId":"', cert.courseId.toString(),
                '","courseName":"', course.title,
                '","studentName":"', cert.studentName,
                '","studentAddress":"', Strings.toHexString(uint160(cert.student), 20),
                '","issueDate":"', cert.issuedAt.toString(),
                '","issuer":"Manta Network Education Platform",',
                '"valid":', cert.isValid ? "true" : "false",
                '}'
            )
        );
    }

    /**
     * @dev Generates a verification URL or QR code data for the certificate
     * @param certificateId ID of the certificate
     * @return Verification data string that can be used in QR codes
     */
    function getVerificationData(uint256 certificateId) external pure returns (string memory) {
        // This would typically be a URL to your verification page with the certificate ID
        return string(
            abi.encodePacked(
                "https://your-platform-domain.com/verify/",
                certificateId.toString()
            )
        );
    }

}
