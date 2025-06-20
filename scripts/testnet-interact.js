const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  try {
    console.log("🔬 Eduverse Platform - Comprehensive Testing Script");

    // Load deployed contract addresses
    const addresses = JSON.parse(fs.readFileSync("deployed-contracts.json", "utf8"));

    // On testnet, we'll use the same account for all roles
    const [deployer] = await ethers.getSigners();
    const creator = deployer;
    const student = deployer;

    console.log("\n⚠️ Running on testnet - using deployer account for all roles");
    console.log(`👤 Account: ${deployer.address}`);

    // Attach to contracts
    console.log("\n📋 Connecting to deployed contracts...");
    const MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
    const mockPriceFeed = MockV3Aggregator.attach(addresses.mockPriceFeed);

    const CourseFactory = await ethers.getContractFactory("CourseFactory");
    const courseFactory = CourseFactory.attach(addresses.courseFactory);

    const CourseLicense = await ethers.getContractFactory("CourseLicense");
    const courseLicense = CourseLicense.attach(addresses.courseLicense);

    const ProgressTracker = await ethers.getContractFactory("ProgressTracker");
    const progressTracker = ProgressTracker.attach(addresses.progressTracker);

    const CertificateManager = await ethers.getContractFactory("CertificateManager");
    const certificateManager = CertificateManager.attach(addresses.certificateManager);

    console.log("✅ Connected to all contracts");

    // PART 1: CREATE TWO DIFFERENT COURSES
    console.log("\n\n🔷 PART 1: CREATING MULTIPLE COURSES");

    // Create Course 1: Web3 Development
    const pricePerMonth1 = ethers.parseEther("0.0005"); // ~$1
    console.log("\n👨‍🏫 Creating Web3 Development course...");

    const createCourseTx1 = await courseFactory.connect(creator).createCourse(
      "Web3 Development 101",
      "Introduction to blockchain application development",
      "ipfs://QmWebDevThumbnail",
      pricePerMonth1
    );
    await createCourseTx1.wait();

    // Get first course ID
    const courseId1 = await courseFactory.getTotalCourses();
    console.log(`✅ Course 1 created with ID: ${courseId1}`);

    // Add sections to Course 1
    console.log("\n👨‍🏫 Adding sections to Web3 Development course...");

    await (await courseFactory.connect(creator).addCourseSection(
      courseId1,
      "Introduction to Blockchain",
      "ipfs://QmWebDev1",
      3600 // 1 hour
    )).wait();

    await (await courseFactory.connect(creator).addCourseSection(
      courseId1,
      "Smart Contracts with Solidity",
      "ipfs://QmWebDev2",
      4800 // 1 hour 20 minutes
    )).wait();

    // Create Course 2: DeFi Fundamentals
    const pricePerMonth2 = ethers.parseEther("0.0003"); // cheaper course
    console.log("\n👨‍🏫 Creating DeFi Fundamentals course...");

    const createCourseTx2 = await courseFactory.connect(creator).createCourse(
      "DeFi Fundamentals",
      "Learn about decentralized finance protocols and applications",
      "ipfs://QmDeFiThumbnail",
      pricePerMonth2
    );
    await createCourseTx2.wait();

    // Get second course ID
    const courseId2 = await courseFactory.getTotalCourses();
    console.log(`✅ Course 2 created with ID: ${courseId2}`);

    // Add sections to Course 2
    console.log("\n👨‍🏫 Adding sections to DeFi Fundamentals course...");

    await (await courseFactory.connect(creator).addCourseSection(
      courseId2,
      "Understanding DeFi Protocols",
      "ipfs://QmDeFi1",
      2700 // 45 minutes
    )).wait();

    await (await courseFactory.connect(creator).addCourseSection(
      courseId2,
      "Yield Farming Strategies",
      "ipfs://QmDeFi2",
      3300 // 55 minutes
    )).wait();

    await (await courseFactory.connect(creator).addCourseSection(
      courseId2,
      "DeFi Security Considerations",
      "ipfs://QmDeFi3",
      3600 // 1 hour
    )).wait();

    console.log("✅ Successfully created two courses with multiple sections");

    // PART 2: LOOKUP COURSE DETAILS BY ID
    console.log("\n\n🔷 PART 2: LOOKING UP COURSE DETAILS");

    console.log("\n🔍 Looking up details for Course ID 1...");
    const course1Details = await courseFactory.getCourse(courseId1);
    console.log("\nCourse 1 Details:");
    console.log(`- Title: ${course1Details.title}`);
    console.log(`- Description: ${course1Details.description}`);
    console.log(`- Creator: ${course1Details.creator}`);
    console.log(`- Price Per Month: ${ethers.formatEther(course1Details.pricePerMonth)} ETH`);
    console.log(`- Is Active: ${course1Details.isActive}`);

    console.log("\n🔍 Looking up details for Course ID 2...");
    const course2Details = await courseFactory.getCourse(courseId2);
    console.log("\nCourse 2 Details:");
    console.log(`- Title: ${course2Details.title}`);
    console.log(`- Description: ${course2Details.description}`);
    console.log(`- Creator: ${course2Details.creator}`);
    console.log(`- Price Per Month: ${ethers.formatEther(course2Details.pricePerMonth)} ETH`);
    console.log(`- Is Active: ${course2Details.isActive}`);

    // Looking up sections for both courses
    console.log("\n🔍 Looking up sections for Course ID 1...");
    const sections1 = await courseFactory.getCourseSections(courseId1);
    console.log(`Course 1 has ${sections1.length} sections:`);
    for (let i = 0; i < sections1.length; i++) {
      console.log(`- Section ${i+1}: ${sections1[i].title} (${sections1[i].duration} seconds)`);
    }

    console.log("\n🔍 Looking up sections for Course ID 2...");
    const sections2 = await courseFactory.getCourseSections(courseId2);
    console.log(`Course 2 has ${sections2.length} sections:`);
    for (let i = 0; i < sections2.length; i++) {
      console.log(`- Section ${i+1}: ${sections2[i].title} (${sections2[i].duration} seconds)`);
    }

    // PART 3: PURCHASE LICENSES FOR BOTH COURSES
    console.log("\n\n🔷 PART 3: PURCHASING LICENSES");

    // Purchase license for first course (very short duration for testing expiry)
    console.log("\n🧑‍🎓 Buying a license for Course 1 with 1 month duration...");
    const mintTx1 = await courseLicense.connect(student).mintLicense(
      courseId1,
      1, // 1 month
      { value: pricePerMonth1 }
    );
    await mintTx1.wait();

    const license1 = await courseLicense.getLicense(student.address, courseId1);
    console.log(`✅ License for Course 1 purchased, expires: ${new Date(Number(license1.expiryTimestamp) * 1000).toLocaleString()}`);

    // Purchase license for second course
    console.log("\n🧑‍🎓 Buying a license for Course 2 with 2 month duration...");
    const mintTx2 = await courseLicense.connect(student).mintLicense(
      courseId2,
      2, // 2 months
      { value: pricePerMonth2 * BigInt(2) }
    );
    await mintTx2.wait();

    const license2 = await courseLicense.getLicense(student.address, courseId2);
    console.log(`✅ License for Course 2 purchased, expires: ${new Date(Number(license2.expiryTimestamp) * 1000).toLocaleString()}`);

    // Check license validity
    console.log("\n📋 Checking license validity...");
    const isLicense1Valid = await courseLicense.hasValidLicense(student.address, courseId1);
    console.log(`- Course 1 license valid: ${isLicense1Valid}`);

    const isLicense2Valid = await courseLicense.hasValidLicense(student.address, courseId2);
    console.log(`- Course 2 license valid: ${isLicense2Valid}`);

    // PART 4: SIMULATE LICENSE EXPIRATION (In a real scenario, we'd need to wait)
    console.log("\n\n🔷 PART 4: LICENSE EXPIRATION & RENEWAL");
    console.log("\n⚠️ In a real scenario, we would need to wait for license expiration.");
    console.log("⚠️ For this test, we'll check license status and then renew regardless.");

    // Renew the first license
    console.log("\n🔄 Renewing license for Course 1...");
    const renewTx = await courseLicense.connect(student).renewLicense(
      courseId1,
      2, // Renew for 2 months
      { value: pricePerMonth1 * BigInt(2) }
    );
    await renewTx.wait();

    // Check renewed license
    const renewedLicense = await courseLicense.getLicense(student.address, courseId1);
    console.log(`✅ License renewed, new expiry: ${new Date(Number(renewedLicense.expiryTimestamp) * 1000).toLocaleString()}`);

    // Verify license is now valid
    const isRenewedLicenseValid = await courseLicense.hasValidLicense(student.address, courseId1);
    console.log(`- Course 1 renewed license valid: ${isRenewedLicenseValid}`);

    // PART 5: COURSE COMPLETION AND TRACKING
    console.log("\n\n🔷 PART 5: COURSE COMPLETION AND PROGRESS TRACKING");

    // Complete Course 1 sections
    console.log("\n📚 Completing sections for Course 1...");
    for (let i = 0; i < sections1.length; i++) {
      console.log(`- Completing section ${i}...`);
      await (await progressTracker.connect(student).completeSection(courseId1, i)).wait();
    }

    // Check progress for Course 1
    const progress1 = await progressTracker.getCourseProgressPercentage(student.address, courseId1);
    console.log(`✅ Course 1 progress: ${progress1}%`);

    // Complete only 2 sections of Course 2 (partial completion)
    console.log("\n📚 Partially completing Course 2 (2 out of 3 sections)...");
    for (let i = 0; i < 2; i++) {
      console.log(`- Completing section ${i}...`);
      await (await progressTracker.connect(student).completeSection(courseId2, i)).wait();
    }

    // Check progress for Course 2
    const progress2 = await progressTracker.getCourseProgressPercentage(student.address, courseId2);
    console.log(`✅ Course 2 progress: ${progress2}%`);

    // Check course completion status
    const isCompleted1 = await progressTracker.isCourseCompleted(student.address, courseId1);
    console.log(`- Course 1 completed: ${isCompleted1}`);

    const isCompleted2 = await progressTracker.isCourseCompleted(student.address, courseId2);
    console.log(`- Course 2 completed: ${isCompleted2}`);

    // Get section-by-section progress
    console.log("\n📋 Detailed section progress for Course 2:");
    const sectionProgress = await progressTracker.getCourseSectionsProgress(student.address, courseId2);
    for (let i = 0; i < sectionProgress.length; i++) {
      console.log(`- Section ${i}: ${sectionProgress[i] ? "Completed" : "Not Completed"}`);
    }

    // PART 6: CERTIFICATE ISSUANCE
    console.log("\n\n🔷 PART 6: CERTIFICATE ISSUANCE");

    // Try to issue certificate for Course 2 (should fail because it's not complete)
    console.log("\n❌ Attempting to issue certificate for incomplete Course 2 (should fail)...");
    try {
      const certFee = await certificateManager.certificateFee();
      await certificateManager.connect(student).issueCertificate(
        courseId2,
        "John Doe",
        { value: certFee }
      );
      console.log("⚠️ This should have failed but didn't!");
    } catch (error) {
      console.log("✅ Certificate issuance correctly failed for incomplete course");
    }

    // Complete the final section of Course 2
    console.log("\n📚 Completing final section of Course 2...");
    await (await progressTracker.connect(student).completeSection(courseId2, 2)).wait();

    // Verify both courses are now completed
    const isNowCompleted2 = await progressTracker.isCourseCompleted(student.address, courseId2);
    console.log(`- Course 2 now completed: ${isNowCompleted2}`);

    // Issue certificates for both completed courses
    console.log("\n🏆 Issuing certificate for Course 1...");
    const certFee = await certificateManager.certificateFee();
    const certTx1 = await certificateManager.connect(student).issueCertificate(
      courseId1,
      "John Doe",
      { value: certFee }
    );
    await certTx1.wait();

    const certId1 = await certificateManager.getStudentCertificate(student.address, courseId1);
    console.log(`✅ Certificate issued for Course 1 with ID: ${certId1}`);

    console.log("\n🏆 Issuing certificate for Course 2...");
    const certTx2 = await certificateManager.connect(student).issueCertificate(
      courseId2,
      "John Doe",
      { value: certFee }
    );
    await certTx2.wait();

    const certId2 = await certificateManager.getStudentCertificate(student.address, courseId2);
    console.log(`✅ Certificate issued for Course 2 with ID: ${certId2}`);

    // Get certificate details and verification
    console.log("\n🔍 Getting certificate details...");
    const cert1 = await certificateManager.getCertificate(certId1);
    const cert2 = await certificateManager.getCertificate(certId2);

    console.log("\nCertificate 1 Details:");
    console.log(`- Course ID: ${cert1.courseId}`);
    console.log(`- Student Name: ${cert1.studentName}`);
    console.log(`- Issued At: ${new Date(Number(cert1.issuedAt) * 1000).toLocaleString()}`);
    console.log(`- Valid: ${cert1.isValid}`);

    console.log("\nCertificate 2 Details:");
    console.log(`- Course ID: ${cert2.courseId}`);
    console.log(`- Student Name: ${cert2.studentName}`);
    console.log(`- Issued At: ${new Date(Number(cert2.issuedAt) * 1000).toLocaleString()}`);
    console.log(`- Valid: ${cert2.isValid}`);

    console.log("\n🔍 Certificate verification URLs:");
    const verificationData1 = await certificateManager.getVerificationData(certId1);
    const verificationData2 = await certificateManager.getVerificationData(certId2);
    console.log(`- Certificate 1: ${verificationData1}`);
    console.log(`- Certificate 2: ${verificationData2}`);

    console.log("\n\n🎉 Comprehensive testing completed successfully!");

  } catch (error) {
    console.error("\n❌ Error:", error);

    // More detailed error information
    if (error.reason) {
      console.error("Reason:", error.reason);
    }

    if (error.code) {
      console.error("Code:", error.code);
    }

    if (error.transaction) {
      console.error("Failed transaction:", error.transaction);
    }

    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
