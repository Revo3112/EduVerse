const { ethers } = require("hardhat");
const fs = require("fs");
const readline = require("readline");

// Setup readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  try {
    console.log("🎓 Eduverse Course Explorer - Interactive Mode");

    // Load deployed contract addresses
    const addresses = JSON.parse(fs.readFileSync("deployed-contracts.json", "utf8"));
    const [deployer] = await ethers.getSigners();

    console.log(`\n👤 Connected with: ${deployer.address}`);

    // Attach to contracts
    console.log("\n📋 Connecting to deployed contracts...");
    const CourseFactory = await ethers.getContractFactory("CourseFactory");
    const courseFactory = CourseFactory.attach(addresses.courseFactory);

    const CourseLicense = await ethers.getContractFactory("CourseLicense");
    const courseLicense = CourseLicense.attach(addresses.courseLicense);

    const ProgressTracker = await ethers.getContractFactory("ProgressTracker");
    const progressTracker = ProgressTracker.attach(addresses.progressTracker);

    const CertificateManager = await ethers.getContractFactory("CertificateManager");
    const certificateManager = CertificateManager.attach(addresses.certificateManager);

    console.log("✅ Contracts loaded successfully");

    // Get total number of courses
    const totalCourses = await courseFactory.getTotalCourses();
    console.log(`\n📚 Total courses available: ${totalCourses}`);

    // List all available courses
    console.log("\n📋 Available courses:");

    const availableCourses = [];

    // Course ID di smart contract dimulai dari 1, bukan 0
    for (let i = 1; i <= totalCourses; i++) {
      try {
        const course = await courseFactory.getCourse(i);

        // Format price untuk ditampilkan
        const priceFormatted = ethers.formatEther(course.pricePerMonth);

        // Tambahkan ke daftar course yang tersedia
        availableCourses.push({
          id: i,
          title: course.title,
          description: course.description.length > 40 ?
                    course.description.substring(0, 37) + "..." :
                    course.description,
          price: priceFormatted,
          creator: course.creator
        });

        // Tampilkan course dalam format yang mudah dibaca
        console.log(`  ${i}. ${course.title} - ${priceFormatted} ETH/bulan (${course.isActive ? "Aktif" : "Tidak aktif"})`);
      } catch (error) {
        console.log(`  ${i}. Error: Tidak dapat mengambil data course`);
      }
    }

    if (availableCourses.length === 0) {
      console.log("  Tidak ada course yang tersedia");
      process.exit(0);
    }

    // Interaktif - meminta user memilih course
    rl.question('\n🔍 Masukkan ID course yang ingin dilihat: ', async (courseIdInput) => {
      const courseId = parseInt(courseIdInput);

      // Validasi input
      if (isNaN(courseId) || courseId <= 0 || courseId > totalCourses) {
        console.log(`❌ ID course tidak valid. Harap pilih nomor antara 1 dan ${totalCourses}`);
        rl.close();
        return;
      }

      // Ambil dan tampilkan detail course
      console.log(`\n🔷 MELIHAT DETAIL COURSE #${courseId}`);
      const course = await courseFactory.getCourse(courseId);

      console.log("\n📝 Detail course:");
      console.log(`Judul: ${course.title}`);
      console.log(`Deskripsi: ${course.description}`);
      console.log(`Pembuat: ${course.creator}`);
      console.log(`Harga per bulan: ${ethers.formatEther(course.pricePerMonth)} ETH`);
      console.log(`Status: ${course.isActive ? 'Aktif' : 'Tidak Aktif'}`);
      console.log(`Thumbnail: ${course.thumbnailURI}`);
      console.log(`Dibuat pada: ${new Date(Number(course.createdAt) * 1000).toLocaleString()}`);

      // Ambil dan tampilkan section course
      const sections = await courseFactory.getCourseSections(courseId);

      console.log(`\n📚 Course memiliki ${sections.length} section:`);

      if (sections.length === 0) {
        console.log("  Belum ada section untuk course ini.");
      } else {
        for (let i = 0; i < sections.length; i++) {
          const section = sections[i];
          const durationMinutes = Math.floor(Number(section.duration) / 60);
          const durationSeconds = Number(section.duration) % 60;
          const formattedDuration = `${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`;

          console.log(`\n  Section ${i + 1}: ${section.title}`);
          console.log(`  Durasi: ${formattedDuration}`);
          console.log(`  Content URI: ${section.contentURI}`);
        }
      }

      // Periksa apakah user memiliki lisensi untuk course ini
      try {
        const hasLicense = await courseLicense.hasValidLicense(deployer.address, courseId);
        const license = await courseLicense.getLicense(deployer.address, courseId);

        console.log(`\n🔒 Status Lisensi: ${hasLicense ? "Aktif" : "Tidak Aktif"}`);
        if (Number(license.expiryTimestamp) > 0) {
          console.log(`   Kedaluwarsa: ${new Date(Number(license.expiryTimestamp) * 1000).toLocaleString()}`);
        }

        // Jika memiliki lisensi, tampilkan progress
        if (hasLicense) {
          const progress = await progressTracker.getCourseProgressPercentage(deployer.address, courseId);
          const isCompleted = await progressTracker.isCourseCompleted(deployer.address, courseId);

          console.log(`\n📊 Progress belajar: ${progress}%`);
          console.log(`   Status: ${isCompleted ? "Selesai" : "Belum Selesai"}`);

          // Tampilkan status tiap section
          const sectionsProgress = await progressTracker.getCourseSectionsProgress(deployer.address, courseId);
          console.log("\n   Progress per section:");
          for (let i = 0; i < sectionsProgress.length; i++) {
            console.log(`   - Section ${i+1}: ${sectionsProgress[i] ? "✓ Selesai" : "□ Belum"}`);
          }

          // Cek apakah memiliki sertifikat
          const certId = await certificateManager.getStudentCertificate(deployer.address, courseId);
          if (certId > 0) {
            console.log(`\n🏆 Sertifikat: Dimiliki (ID: ${certId})`);
            const cert = await certificateManager.getCertificate(certId);
            console.log(`   Nama: ${cert.studentName}`);
            console.log(`   Tanggal: ${new Date(Number(cert.issuedAt) * 1000).toLocaleString()}`);
          } else if (isCompleted) {
            console.log("\n🏆 Sertifikat: Belum dimiliki (Course sudah selesai, bisa mendapatkan sertifikat)");
          } else {
            console.log("\n🏆 Sertifikat: Belum tersedia (Selesaikan course terlebih dahulu)");
          }
        }
      } catch (error) {
        console.log("\n⚠️ Tidak dapat memeriksa status lisensi");
      }

      rl.close();
    });

  } catch (error) {
    console.error("\n❌ Error:", error);

    if (error.reason) {
      console.error("Reason:", error.reason);
    }

    rl.close();
    process.exit(1);
  }
}

// Ketika readline ditutup, exit process
rl.on('close', () => {
  process.exit(0);
});

main().catch((error) => {
  console.error(error);
  rl.close();
  process.exit(1);
});
