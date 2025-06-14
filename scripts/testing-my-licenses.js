const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  try {
    console.log("🎓 Eduverse - Daftar Course yang Saya Miliki");

    // Load deployed contract addresses
    const addresses = JSON.parse(fs.readFileSync("deployed-contracts.json", "utf8"));
    const [student] = await ethers.getSigners();

    console.log(`\n👤 Terhubung sebagai: ${student.address}`);

    // Attach to contracts
    console.log("\n📋 Menghubungkan ke kontrak yang di-deploy...");
    const CourseFactory = await ethers.getContractFactory("CourseFactory");
    const courseFactory = CourseFactory.attach(addresses.courseFactory);

    const CourseLicense = await ethers.getContractFactory("CourseLicense");
    const courseLicense = CourseLicense.attach(addresses.courseLicense);

    const ProgressTracker = await ethers.getContractFactory("ProgressTracker");
    const progressTracker = ProgressTracker.attach(addresses.progressTracker);

    const CertificateManager = await ethers.getContractFactory("CertificateManager");
    const certificateManager = CertificateManager.attach(addresses.certificateManager);

    console.log("✅ Kontrak berhasil terhubung");

    // Get total number of courses
    const totalCourses = await courseFactory.getTotalCourses();
    console.log(`\n📚 Total course yang tersedia di platform: ${totalCourses}`);

    // Check which courses the student has licenses for
    console.log("\n🔍 Memeriksa lisensi course yang dimiliki...");

    const ownedCourses = [];
    let hasAnyCourse = false;

    // Course IDs in the smart contract start from 1
    for (let i = 1; i <= totalCourses; i++) {
      try {
        // Check if student has a valid license for this course
        const hasLicense = await courseLicense.hasValidLicense(student.address, i);

        if (hasLicense) {
          hasAnyCourse = true;

          // Get course details
          const course = await courseFactory.getCourse(i);
          const license = await courseLicense.getLicense(student.address, i);
          const progress = await progressTracker.getCourseProgressPercentage(student.address, i);
          const isCompleted = await progressTracker.isCourseCompleted(student.address, i);
          const sectionsProgress = await progressTracker.getCourseSectionsProgress(student.address, i);
          const certId = await certificateManager.getStudentCertificate(student.address, i);

          // Calculate remaining time
          const now = Math.floor(Date.now() / 1000); // Current time in seconds
          const remaining = Number(license.expiryTimestamp) - now;
          const remainingDays = Math.floor(remaining / (60 * 60 * 24));

          // Add to owned courses
          ownedCourses.push({
            id: i,
            title: course.title,
            description: course.description,
            creator: course.creator,
            price: ethers.formatEther(course.pricePerMonth),
            expiryDate: new Date(Number(license.expiryTimestamp) * 1000),
            remainingDays: remainingDays,
            progress: progress,
            isCompleted: isCompleted,
            sectionsCount: sectionsProgress.length,
            completedSections: sectionsProgress.filter(s => s).length,
            hasCertificate: certId > 0,
            certificateId: certId > 0 ? certId : null
          });
        }
      } catch (error) {
        console.log(`  Error saat memeriksa course #${i}: ${error.message}`);
      }
    }

    // Sort by expiry date (soonest first)
    ownedCourses.sort((a, b) => a.expiryDate - b.expiryDate);

    // Display results
    console.log("\n📚 COURSE YANG SAYA MILIKI LISENSINYA");

    if (!hasAnyCourse) {
      console.log("\n❌ Anda belum memiliki lisensi untuk course apapun.");
      console.log("💡 Tip: Gunakan script 'explore-courses' untuk melihat dan membeli lisensi course.");
      return;
    }

    // Display courses in categories
    console.log("\n🔷 COURSE YANG AKAN SEGERA KEDALUWARSA (< 7 hari):");
    const expiringCourses = ownedCourses.filter(c => c.remainingDays < 7);
    if (expiringCourses.length === 0) {
      console.log("  Tidak ada course yang akan kedaluwarsa dalam waktu dekat.");
    } else {
      expiringCourses.forEach(course => {
        console.log(`\n  📕 [ID: ${course.id}] ${course.title}`);
        console.log(`     Kedaluwarsa dalam: ${course.remainingDays} hari (${course.expiryDate.toLocaleString()})`);
        console.log(`     Progress: ${course.progress}% (${course.completedSections}/${course.sectionsCount} section)`);
      });
    }

    console.log("\n🔷 COURSE YANG SEDANG BERLANGSUNG:");
    const activeCourses = ownedCourses.filter(c => c.remainingDays >= 7 && !c.isCompleted);
    if (activeCourses.length === 0) {
      console.log("  Tidak ada course yang sedang berlangsung.");
    } else {
      activeCourses.forEach(course => {
        console.log(`\n  📗 [ID: ${course.id}] ${course.title}`);
        console.log(`     Kedaluwarsa: ${course.expiryDate.toLocaleString()} (${course.remainingDays} hari lagi)`);
        console.log(`     Progress: ${course.progress}% (${course.completedSections}/${course.sectionsCount} section)`);
      });
    }

    console.log("\n🔷 COURSE YANG SUDAH SELESAI:");
    const completedCourses = ownedCourses.filter(c => c.isCompleted);
    if (completedCourses.length === 0) {
      console.log("  Belum ada course yang selesai.");
    } else {
      completedCourses.forEach(course => {
        console.log(`\n  📘 [ID: ${course.id}] ${course.title}`);
        console.log(`     Kedaluwarsa: ${course.expiryDate.toLocaleString()} (${course.remainingDays} hari lagi)`);
        console.log(`     Status: ✓ 100% Selesai`);
        if (course.hasCertificate) {
          console.log(`     🏆 Sertifikat: Dimiliki (ID: ${course.certificateId})`);
        } else {
          console.log(`     🏆 Sertifikat: Belum dimiliki (Klik untuk mendapatkan sertifikat)`);
        }
      });
    }

    // Display a detailed view option
    console.log("\n💡 Tip: Untuk melihat detail lengkap sebuah course, gunakan script 'explore-courses'.");

  } catch (error) {
    console.error("\n❌ Error:", error);

    if (error.reason) {
      console.error("Alasan:", error.reason);
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
