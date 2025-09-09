const { ethers } = require("hardhat");
const fs = require("fs");

// Fungsi pembantu untuk menangani transaksi dengan logging yang lebih baik
async function sendTransaction(txPromise, description) {
  console.log(`-> Mengirim transaksi: ${description}...`);
  const tx = await txPromise;
  console.log(`---> Hash Transaksi: ${tx.hash}`);
  console.log(`-> Menunggu konfirmasi untuk: ${description}...`);
  const receipt = await tx.wait();
  console.log(
    `---> ✅ Transaksi berhasil dikonfirmasi. Gas yang digunakan: ${receipt.gasUsed.toString()}`
  );
  return receipt;
}

async function main() {
  try {
    console.log("🔬 Eduverse Platform - Comprehensive Testing Script");

    // Muat alamat kontrak yang sudah di-deploy
    const addresses = JSON.parse(
      fs.readFileSync("deployed-contracts.json", "utf8")
    );

    // Di testnet, kita akan menggunakan akun yang sama untuk semua peran
    const [deployer] = await ethers.getSigners();
    const creator = deployer;
    const student = deployer;

    console.log(
      "\n⚠️ Menjalankan di testnet - menggunakan akun deployer untuk semua peran"
    );
    console.log(`👤 Akun: ${deployer.address}`);

    // Terhubung ke kontrak
    console.log("\n📋 Menghubungkan ke kontrak yang sudah di-deploy...");

    const CourseFactory = await ethers.getContractFactory("CourseFactory");
    const courseFactory = CourseFactory.attach(addresses.courseFactory);

    const CourseLicense = await ethers.getContractFactory("CourseLicense");
    const courseLicense = CourseLicense.attach(addresses.courseLicense);

    const ProgressTracker = await ethers.getContractFactory("ProgressTracker");
    const progressTracker = ProgressTracker.attach(addresses.progressTracker);

    const CertificateManager = await ethers.getContractFactory(
      "CertificateManager"
    );
    const certificateManager = CertificateManager.attach(
      addresses.certificateManager
    );

    console.log("✅ Berhasil terhubung ke semua kontrak");

    // BAGIAN 1: MEMBUAT DUA KURSUS YANG BERBEDA
    console.log("\n\n🔷 BAGIAN 1: MEMBUAT BEBERAPA KURSUS");

    // Buat Kursus 1: Web3 Development
    const pricePerMonth1 = ethers.parseEther("0.0005"); // ~$1
    console.log("\n👨‍🏫 Membuat kursus Web3 Development...");

    await sendTransaction(
      courseFactory.connect(creator).createCourse(
        "Web3 Development 101", // title
        "Introduction to blockchain application development", // description
        "bafybeic3zml2dfde76qfakovud6wamewoa42z23tgliplke54nrwc5cj2y", // thumbnailCID
        pricePerMonth1 // pricePerMonth
      ),
      "Membuat Kursus 1"
    );

    // Dapatkan ID kursus pertama
    const courseId1 = await courseFactory.getTotalCourses();
    console.log(`✅ Kursus 1 dibuat dengan ID: ${courseId1}`);

    // Tambahkan bagian ke Kursus 1
    console.log("\n👨‍🏫 Menambahkan bagian ke kursus Web3 Development...");

    await sendTransaction(
      courseFactory.connect(creator).addCourseSection(
        courseId1,
        "Introduction to Blockchain", // title
        "bafybeicmoogk5nmg4uizxyn6i3gh24dc2c7rnpico7ziqoi4llvhqaicli", // contentCID
        3600 // 1 jam
      ),
      "Menambahkan Bagian 1.1"
    );

    await sendTransaction(
      courseFactory.connect(creator).addCourseSection(
        courseId1,
        "Smart Contracts with Solidity", // title
        "bafybeicmoogk5nmg4uizxyn6i3gh24dc2c7rnpico7ziqoi4llvhqaicli", // contentCID
        4800 // 1 jam 20 menit
      ),
      "Menambahkan Bagian 1.2"
    );

    // Buat Kursus 2: DeFi Fundamentals
    const pricePerMonth2 = ethers.parseEther("0.0003"); // kursus lebih murah
    console.log("\n👨‍🏫 Membuat kursus DeFi Fundamentals...");

    await sendTransaction(
      courseFactory.connect(creator).createCourse(
        "DeFi Fundamentals", // title
        "Learn about decentralized finance protocols and applications", // description
        "bafybeic3zml2dfde76qfakovud6wamewoa42z23tgliplke54nrwc5cj2y", // thumbnailCID
        pricePerMonth2 // pricePerMonth
      ),
      "Membuat Kursus 2"
    );

    // Dapatkan ID kursus kedua
    const courseId2 = await courseFactory.getTotalCourses();
    console.log(`✅ Kursus 2 dibuat dengan ID: ${courseId2}`);

    // Tambahkan bagian ke Kursus 2
    console.log("\n👨‍🏫 Menambahkan bagian ke kursus DeFi Fundamentals...");

    await sendTransaction(
      courseFactory.connect(creator).addCourseSection(
        courseId2,
        "Understanding DeFi Protocols", // title
        "bafybeicmoogk5nmg4uizxyn6i3gh24dc2c7rnpico7ziqoi4llvhqaicli", // contentCID
        2700 // 45 menit
      ),
      "Menambahkan Bagian 2.1"
    );

    await sendTransaction(
      courseFactory.connect(creator).addCourseSection(
        courseId2,
        "Yield Farming Strategies", // title
        "bafybeicmoogk5nmg4uizxyn6i3gh24dc2c7rnpico7ziqoi4llvhqaicli", // contentCID
        3300 // 55 menit
      ),
      "Menambahkan Bagian 2.2"
    );

    await sendTransaction(
      courseFactory.connect(creator).addCourseSection(
        courseId2,
        "DeFi Security Considerations", // title
        "bafybeicmoogk5nmg4uizxyn6i3gh24dc2c7rnpico7ziqoi4llvhqaicli", // contentCID
        3600 // 1 jam
      ),
      "Menambahkan Bagian 2.3"
    );

    console.log("✅ Berhasil membuat dua kursus dengan beberapa bagian");

    // BAGIAN 2: MENCARI DETAIL KURSUS BERDASARKAN ID
    console.log("\n\n🔷 BAGIAN 2: MENCARI DETAIL KURSUS");

    console.log("\n🔍 Mencari detail untuk Kursus ID 1...");
    const course1Details = await courseFactory.getCourse(courseId1);
    console.log("\nDetail Kursus 1:", course1Details);

    console.log("\n🔍 Mencari detail untuk Kursus ID 2...");
    const course2Details = await courseFactory.getCourse(courseId2);
    console.log("\nDetail Kursus 2:", course2Details);

    // BAGIAN 3: MEMBELI LISENSI UNTUK KEDUA KURSUS
    console.log("\n\n🔷 BAGIAN 3: MEMBELI LISENSI");

    await sendTransaction(
      courseLicense.connect(student).mintLicense(
        courseId1,
        1, // 1 bulan
        { value: pricePerMonth1 }
      ),
      "Membeli Lisensi Kursus 1"
    );

    await sendTransaction(
      courseLicense.connect(student).mintLicense(
        courseId2,
        2, // 2 bulan
        { value: pricePerMonth2 * BigInt(2) }
      ),
      "Membeli Lisensi Kursus 2"
    );

    console.log("\n📋 Memeriksa validitas lisensi...");
    const isLicense1Valid = await courseLicense.hasValidLicense(
      student.address,
      courseId1
    );
    console.log(`- Lisensi Kursus 1 valid: ${isLicense1Valid}`);

    // BAGIAN 4: PEMBARUAN LISENSI
    console.log("\n\n🔷 BAGIAN 4: PEMBARUAN LISENSI");

    await sendTransaction(
      courseLicense.connect(student).renewLicense(
        courseId1,
        2, // Perbarui selama 2 bulan
        { value: pricePerMonth1 * BigInt(2) }
      ),
      "Memperbarui Lisensi Kursus 1"
    );

    // BAGIAN 5: PENYELESAIAN KURSUS
    console.log("\n\n🔷 BAGIAN 5: PENYELESAIAN KURSUS");

    const sections1 = await courseFactory.getCourseSections(courseId1);
    for (let i = 0; i < sections1.length; i++) {
      await sendTransaction(
        progressTracker.connect(student).completeSection(courseId1, i),
        `Menyelesaikan Bagian 1.${i + 1}`
      );
    }

    const sections2 = await courseFactory.getCourseSections(courseId2);
    for (let i = 0; i < sections2.length; i++) {
      await sendTransaction(
        progressTracker.connect(student).completeSection(courseId2, i),
        `Menyelesaikan Bagian 2.${i + 1}`
      );
    }

    console.log(
      `✅ Progres Kursus 1: ${await progressTracker.getCourseProgressPercentage(
        student.address,
        courseId1
      )}%`
    );
    console.log(
      `✅ Progres Kursus 2: ${await progressTracker.getCourseProgressPercentage(
        student.address,
        courseId2
      )}%`
    );

    // BAGIAN 6: PENERBITAN SERTIFIKAT
    console.log("\n\n🔷 BAGIAN 6: PENERBITAN SERTIFIKAT");
    const certFee = await certificateManager.certificateFee();

    await sendTransaction(
      certificateManager
        .connect(student)
        .mintCertificate(courseId1, "John Doe", { value: certFee }),
      "Menerbitkan Sertifikat Kursus 1"
    );

    await sendTransaction(
      certificateManager
        .connect(student)
        .mintCertificate(courseId2, "John Doe", { value: certFee }),
      "Menerbitkan Sertifikat Kursus 2"
    );

    const certId1 = await certificateManager.getStudentCertificate(
      student.address,
      courseId1
    );
    console.log(
      `✅ Sertifikat diterbitkan untuk Kursus 1 dengan ID: ${certId1}`
    );

    const certId2 = await certificateManager.getStudentCertificate(
      student.address,
      courseId2
    );
    console.log(
      `✅ Sertifikat diterbitkan untuk Kursus 2 dengan ID: ${certId2}`
    );

    // BAGIAN 7: PENGUJIAN KEAMANAN
    console.log("\n\n🔷 BAGIAN 7: PENGUJIAN KEAMANAN");
    console.log(
      "\n🔒 Menguji penerbitan sertifikat duplikat (seharusnya gagal)..."
    );
    try {
      await certificateManager
        .connect(student)
        .issueCertificate(courseId1, "John Doe", { value: certFee });
      console.log("⚠️ Sertifikat duplikat seharusnya gagal tetapi tidak!");
    } catch (error) {
      console.log("✅ Penerbitan sertifikat duplikat berhasil diblokir");
    }

    console.log("\n🎉 Pengujian komprehensif berhasil diselesaikan!");
  } catch (error) {
    console.error("\n❌ Kesalahan selama eksekusi skrip:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
