// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract EduContract is ERC1155, Ownable {
    using Strings for uint256;

    uint256 public constant MONTH = 30 days;
    uint256 public courseCounter;

    struct Course {
        address creator;
        string name;
        string image;
        string contentLink;
        uint256 pricePerMonthInUSD;
        uint256 createdAt;
    }

    struct License {
        uint256 expirationDate;
        string uniqueCode;
        string emailHash;
    }

    struct Certificate {
        uint256 issuedAt;
        string certificateHash;
    }

    mapping(uint256 => Course) public courses;
    mapping(address => mapping(uint256 => License)) private _licenses;
    mapping(address => mapping(uint256 => Certificate)) private _certificates;
    mapping(uint256 => uint256) public courseRevenue;

    event CourseCreated(uint256 courseId, address creator);
    event LicenseMinted(address student, uint256 courseId, uint256 expirationDate, string uniqueCode);
    event CertificateIssued(address student, uint256 courseId, string certificateHash);

    constructor(address initialOwner)
        ERC1155("https://api.EduContract.com/metadata/{id}.json")
        Ownable()
    {
        _transferOwnership(initialOwner);
    }

    function createCourse(
        string memory _name,
        string memory _image,
        string memory _contentLink,
        uint256 _pricePerMonthInUSD
    ) external onlyOwner {
        courseCounter++;
        courses[courseCounter] = Course({
            creator: msg.sender,
            name: _name,
            image: _image,
            contentLink: _contentLink,
            pricePerMonthInUSD: _pricePerMonthInUSD,
            createdAt: block.timestamp
        });
        emit CourseCreated(courseCounter, msg.sender);
    }

    function mintLicense(
        uint256 _courseId,
        uint256 _durationMonths,
        string memory _emailHash
    ) external payable {
        Course memory course = courses[_courseId];
        require(course.creator != address(0), "Course not exist");
        require(_durationMonths > 0, "Invalid duration");

        uint256 totalCost = _calculateGasFee(_durationMonths);
        require(msg.value >= totalCost, "Insufficient payment");

        string memory uniqueCode = _generateUniqueCode(_emailHash, _courseId);

        _licenses[msg.sender][_courseId] = License({
            expirationDate: block.timestamp + (_durationMonths * MONTH),
            uniqueCode: uniqueCode,
            emailHash: _emailHash
        });

        _mint(msg.sender, _courseId, 1, "");
        courseRevenue[_courseId] += msg.value;

        emit LicenseMinted(msg.sender, _courseId, block.timestamp + (_durationMonths * MONTH), uniqueCode);
    }

    function mintCertificate(
        uint256 _courseId,
        string memory _uniqueCode
    ) external payable {
        License memory license = _licenses[msg.sender][_courseId];
        require(license.expirationDate > block.timestamp, "License expired");
        require(keccak256(bytes(license.uniqueCode)) == keccak256(bytes(_uniqueCode)), "Invalid code");
        require(msg.value >= 0.01 ether, "Insufficient fee");

        string memory certHash = _generateCertificateHash(msg.sender, _courseId);

        _certificates[msg.sender][_courseId] = Certificate({
            issuedAt: block.timestamp,
            certificateHash: certHash
        });

        emit CertificateIssued(msg.sender, _courseId, certHash);
    }

    function _calculateGasFee(uint256 _months) private pure returns (uint256) {
        return 0.001 ether * _months; // Contoh: 0.001 ETH per bulan
    }

    function _generateUniqueCode(string memory _emailHash, uint256 _courseId) private view returns (string memory) {
        return string(
            abi.encodePacked(
                _emailHash,
                block.timestamp.toString(),
                _courseId.toString(),
                Strings.toHexString(uint160(msg.sender), 20)
            )
        );
    }

    function _generateCertificateHash(address _student, uint256 _courseId) private view returns (string memory) {
        return string(
            abi.encodePacked(
                "CERT-",
                Strings.toHexString(uint160(_student), 20),
                "-",
                _courseId.toString(),
                "-",
                block.timestamp.toString()
            )
        );
    }

    function withdrawRevenue(uint256 _courseId) external {
        require(msg.sender == courses[_courseId].creator, "Not creator");
        uint256 amount = courseRevenue[_courseId];
        require(amount > 0, "No revenue");
        courseRevenue[_courseId] = 0;
        payable(msg.sender).transfer(amount);
    }
}
