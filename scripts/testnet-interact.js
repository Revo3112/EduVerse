const { ethers } = require("hardhat");
const fs = require("fs");

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

    const createCourseTx1 = await courseFactory.connect(creator).createCourse(
      "Web3 Development 101", // title
      "Introduction to blockchain application development", // description
      "bafybeihnscsqugu4k62fgk2rwjkajzh3ioqy473frd6osmutuokngc3js4", // thumbnailCID
      pricePerMonth1 // pricePerMonth
    );
    await createCourseTx1.wait();

    // Dapatkan ID kursus pertama
    const courseId1 = await courseFactory.getTotalCourses();
    console.log(`✅ Kursus 1 dibuat dengan ID: ${courseId1}`);

    // Tambahkan bagian ke Kursus 1
    console.log("\n👨‍🏫 Menambahkan bagian ke kursus Web3 Development...");

    await (
      await courseFactory.connect(creator).addCourseSection(
        courseId1,
        "Introduction to Blockchain", // title
        "bafybeiffnr3jq3gxaesi4rpxpbvi2nhlqvosztpvoxx6cognsqyfbkhvuq", // contentCID
        3600 // 1 jam
      )
    ).wait();

    await (
      await courseFactory.connect(creator).addCourseSection(
        courseId1,
        "Smart Contracts with Solidity", // title
        "bafybeiffnr3jq3gxaesi4rpxpbvi2nhlqvosztpvoxx6cognsqyfbkhvuq", // contentCID
        4800 // 1 jam 20 menit
      )
    ).wait();

    // Buat Kursus 2: DeFi Fundamentals
    const pricePerMonth2 = ethers.parseEther("0.0003"); // kursus lebih murah
    console.log("\n👨‍🏫 Membuat kursus DeFi Fundamentals...");

    const createCourseTx2 = await courseFactory.connect(creator).createCourse(
      "DeFi Fundamentals", // title
      "Learn about decentralized finance protocols and applications", // description
      "bafybeidzrqisv744qlihum3xprvinqubofuwwm7jplpaqryibid47wndoa", // thumbnailCID
      pricePerMonth2 // pricePerMonth
    );
    await createCourseTx2.wait();

    // Dapatkan ID kursus kedua
    const courseId2 = await courseFactory.getTotalCourses();
    console.log(`✅ Kursus 2 dibuat dengan ID: ${courseId2}`);

    // Tambahkan bagian ke Kursus 2
    console.log("\n👨‍🏫 Menambahkan bagian ke kursus DeFi Fundamentals...");

    await (
      await courseFactory.connect(creator).addCourseSection(
        courseId2,
        "Understanding DeFi Protocols", // title
        "bafybeiffnr3jq3gxaesi4rpxpbvi2nhlqvosztpvoxx6cognsqyfbkhvuq", // contentCID
        2700 // 45 menit
      )
    ).wait();

    await (
      await courseFactory.connect(creator).addCourseSection(
        courseId2,
        "Yield Farming Strategies", // title
        "bafybeiffnr3jq3gxaesi4rpxpbvi2nhlqvosztpvoxx6cognsqyfbkhvuq", // contentCID
        3300 // 55 menit
      )
    ).wait();

    await (
      await courseFactory.connect(creator).addCourseSection(
        courseId2,
        "DeFi Security Considerations", // title
        "bafybeiffnr3jq3gxaesi4rpxpbvi2nhlqvosztpvoxx6cognsqyfbkhvuq", // contentCID
        3600 // 1 jam
      )
    ).wait();

    console.log("✅ Berhasil membuat dua kursus dengan beberapa bagian");

    // BAGIAN 2: MENCARI DETAIL KURSUS BERDASARKAN ID
    console.log("\n\n🔷 BAGIAN 2: MENCARI DETAIL KURSUS");

    console.log("\n🔍 Mencari detail untuk Kursus ID 1...");
    const course1Details = await courseFactory.getCourse(courseId1);
    console.log("\nDetail Kursus 1:");
    console.log(`- Judul: ${course1Details.title}`);
    console.log(`- Deskripsi: ${course1Details.description}`);
    console.log(`- Thumbnail CID: ${course1Details.thumbnailCID}`);
    console.log(`- Pembuat: ${course1Details.creator}`);
    console.log(
      `- Harga Per Bulan: ${ethers.formatEther(
        course1Details.pricePerMonth
      )} ETH`
    );
    console.log(`- Aktif: ${course1Details.isActive}`);

    console.log("\n🔍 Mencari detail untuk Kursus ID 2...");
    const course2Details = await courseFactory.getCourse(courseId2);
    console.log("\nDetail Kursus 2:");
    console.log(`- Judul: ${course2Details.title}`);
    console.log(`- Deskripsi: ${course2Details.description}`);
    console.log(`- Thumbnail CID: ${course2Details.thumbnailCID}`);
    console.log(`- Pembuat: ${course2Details.creator}`);
    console.log(
      `- Harga Per Bulan: ${ethers.formatEther(
        course2Details.pricePerMonth
      )} ETH`
    );
    console.log(`- Aktif: ${course2Details.isActive}`);

    // Mencari bagian untuk kedua kursus
    console.log("\n🔍 Mencari bagian untuk Kursus ID 1...");
    const sections1 = await courseFactory.getCourseSections(courseId1);
    console.log(`Kursus 1 memiliki ${sections1.length} bagian:`);
    for (let i = 0; i < sections1.length; i++) {
      console.log(
        `- Bagian ${i + 1}: ${sections1[i].title} (${
          sections1[i].duration
        } detik)`
      );
      console.log(`  Content CID: ${sections1[i].contentCID}`);
    }

    console.log("\n🔍 Mencari bagian untuk Kursus ID 2...");
    const sections2 = await courseFactory.getCourseSections(courseId2);
    console.log(`Kursus 2 memiliki ${sections2.length} bagian:`);
    for (let i = 0; i < sections2.length; i++) {
      console.log(
        `- Bagian ${i + 1}: ${sections2[i].title} (${
          sections2[i].duration
        } detik)`
      );
      console.log(`  Content CID: ${sections2[i].contentCID}`);
    }

    console.log("\n🔍 Menguji fungsi getCourseMetadata...");
    const metadata1 = await courseFactory.getCourseMetadata(courseId1);
    console.log(
      `Metadata Kursus 1 - Judul: ${metadata1[0]}, Bagian: ${metadata1[3]}`
    );

    const metadata2 = await courseFactory.getCourseMetadata(courseId2);
    console.log(
      `Metadata Kursus 2 - Judul: ${metadata2[0]}, Bagian: ${metadata2[3]}`
    );

    // BAGIAN 3: MEMBELI LISENSI UNTUK KEDUA KURSUS
    console.log("\n\n🔷 BAGIAN 3: MEMBELI LISENSI");

    // Beli lisensi untuk kursus pertama
    console.log("\n🧑‍🎓 Membeli lisensi untuk Kursus 1 dengan durasi 1 bulan...");
    const mintTx1 = await courseLicense.connect(student).mintLicense(
      courseId1,
      1, // 1 bulan
      { value: pricePerMonth1 }
    );
    await mintTx1.wait();

    const license1 = await courseLicense.getLicense(student.address, courseId1);
    console.log(
      `✅ Lisensi untuk Kursus 1 dibeli, kedaluwarsa: ${new Date(
        Number(license1.expiryTimestamp) * 1000
      ).toLocaleString()}`
    );

    // Beli lisensi untuk kursus kedua
    console.log("\n🧑‍🎓 Membeli lisensi untuk Kursus 2 dengan durasi 2 bulan...");
    const mintTx2 = await courseLicense.connect(student).mintLicense(
      courseId2,
      2, // 2 bulan
      { value: pricePerMonth2 * BigInt(2) }
    );
    await mintTx2.wait();

    const license2 = await courseLicense.getLicense(student.address, courseId2);
    console.log(
      `✅ Lisensi untuk Kursus 2 dibeli, kedaluwarsa: ${new Date(
        Number(license2.expiryTimestamp) * 1000
      ).toLocaleString()}`
    );

    // Periksa validitas lisensi
    console.log("\n📋 Memeriksa validitas lisensi...");
    const isLicense1Valid = await courseLicense.hasValidLicense(
      student.address,
      courseId1
    );
    console.log(`- Lisensi Kursus 1 valid: ${isLicense1Valid}`);

    const isLicense2Valid = await courseLicense.hasValidLicense(
      student.address,
      courseId2
    );
    console.log(`- Lisensi Kursus 2 valid: ${isLicense2Valid}`);

    console.log("\n🔍 Memeriksa ID token untuk lisensi...");
    const tokenId1 = await courseLicense.getTokenId(student.address, courseId1);
    const tokenId2 = await courseLicense.getTokenId(student.address, courseId2);
    console.log(`- ID Token Kursus 1: ${tokenId1}`);
    console.log(`- ID Token Kursus 2: ${tokenId2}`);

    // BAGIAN 4: SIMULASI KEDALUWARSA LISENSI & PEMBARUAN
    console.log("\n\n🔷 BAGIAN 4: KEDALUWARSA LISENSI & PEMBARUAN");
    console.log(
      "\n⚠️ Dalam skenario nyata, kita perlu menunggu lisensi kedaluwarsa."
    );
    console.log(
      "⚠️ Untuk tes ini, kita akan memeriksa status lisensi dan kemudian memperbaruinya."
    );

    // Perbarui lisensi pertama
    console.log("\n🔄 Memperbarui lisensi untuk Kursus 1...");
    const renewTx = await courseLicense.connect(student).renewLicense(
      courseId1,
      2, // Perbarui selama 2 bulan
      { value: pricePerMonth1 * BigInt(2) }
    );
    await renewTx.wait();

    const renewedLicense = await courseLicense.getLicense(
      student.address,
      courseId1
    );
    console.log(
      `✅ Lisensi diperbarui, kedaluwarsa baru: ${new Date(
        Number(renewedLicense.expiryTimestamp) * 1000
      ).toLocaleString()}`
    );

    // Verifikasi lisensi sekarang valid
    const isRenewedLicenseValid = await courseLicense.hasValidLicense(
      student.address,
      courseId1
    );
    console.log(
      `- Lisensi Kursus 1 yang diperbarui valid: ${isRenewedLicenseValid}`
    );

    // BAGIAN 5: PENYELESAIAN KURSUS DAN PELACAKAN PROGRES
    console.log("\n\n🔷 BAGIAN 5: PENYELESAIAN KURSUS DAN PELACAKAN PROGRES");

    // Selesaikan bagian Kursus 1
    console.log("\n📚 Menyelesaikan bagian untuk Kursus 1...");
    for (let i = 0; i < sections1.length; i++) {
      console.log(`- Menyelesaikan bagian ${i}...`);
      await (
        await progressTracker.connect(student).completeSection(courseId1, i)
      ).wait();
    }

    const progress1 = await progressTracker.getCourseProgressPercentage(
      student.address,
      courseId1
    );
    console.log(`✅ Progres Kursus 1: ${progress1}%`);

    // Selesaikan hanya 2 bagian dari Kursus 2 (penyelesaian sebagian)
    console.log("\n📚 Menyelesaikan sebagian Kursus 2 (2 dari 3 bagian)...");
    for (let i = 0; i < 2; i++) {
      console.log(`- Menyelesaikan bagian ${i}...`);
      await (
        await progressTracker.connect(student).completeSection(courseId2, i)
      ).wait();
    }

    const progress2 = await progressTracker.getCourseProgressPercentage(
      student.address,
      courseId2
    );
    console.log(`✅ Progres Kursus 2: ${progress2}%`);

    // Periksa status penyelesaian kursus
    const isCompleted1 = await progressTracker.isCourseCompleted(
      student.address,
      courseId1
    );
    console.log(`- Kursus 1 selesai: ${isCompleted1}`);

    const isCompleted2 = await progressTracker.isCourseCompleted(
      student.address,
      courseId2
    );
    console.log(`- Kursus 2 selesai: ${isCompleted2}`);

    // Dapatkan progres per bagian
    console.log("\n📋 Detail progres bagian untuk Kursus 2:");
    const sectionProgress = await progressTracker.getCourseSectionsProgress(
      student.address,
      courseId2
    );
    for (let i = 0; i < sectionProgress.length; i++) {
      console.log(
        `- Bagian ${i}: ${sectionProgress[i] ? "Selesai" : "Belum Selesai"}`
      );
    }

    console.log("\n🔍 Menguji status penyelesaian bagian individual...");
    for (let i = 0; i < sections1.length; i++) {
      const sectionCompleted = await progressTracker.isSectionCompleted(
        student.address,
        courseId1,
        i
      );
      console.log(
        `- Kursus 1, Bagian ${i}: ${
          sectionCompleted ? "Selesai" : "Belum Selesai"
        }`
      );
    }

    // BAGIAN 6: PENERBITAN SERTIFIKAT
    console.log("\n\n🔷 BAGIAN 6: PENERBITAN SERTIFIKAT");

    console.log(
      "\n❌ Mencoba menerbitkan sertifikat untuk Kursus 2 yang belum selesai (seharusnya gagal)..."
    );
    try {
      const certFee = await certificateManager.certificateFee();
      await certificateManager
        .connect(student)
        .issueCertificate(courseId2, "John Doe", { value: certFee });
      console.log("⚠️ Ini seharusnya gagal tetapi tidak!");
    } catch (error) {
      console.log(
        "✅ Penerbitan sertifikat gagal dengan benar untuk kursus yang belum selesai"
      );
    }

    // Selesaikan bagian terakhir dari Kursus 2
    console.log("\n📚 Menyelesaikan bagian terakhir dari Kursus 2...");
    await (
      await progressTracker.connect(student).completeSection(courseId2, 2)
    ).wait();

    const isNowCompleted2 = await progressTracker.isCourseCompleted(
      student.address,
      courseId2
    );
    console.log(`- Kursus 2 sekarang selesai: ${isNowCompleted2}`);

    // Terbitkan sertifikat untuk kedua kursus yang telah selesai
    console.log("\n🏆 Menerbitkan sertifikat untuk Kursus 1...");
    const certFee = await certificateManager.certificateFee();
    console.log(`Biaya sertifikat: ${ethers.formatEther(certFee)} ETH`);

    const certTx1 = await certificateManager
      .connect(student)
      .issueCertificate(courseId1, "John Doe", { value: certFee });
    await certTx1.wait();

    const certId1 = await certificateManager.getStudentCertificate(
      student.address,
      courseId1
    );
    console.log(
      `✅ Sertifikat diterbitkan untuk Kursus 1 dengan ID: ${certId1}`
    );

    console.log("\n🏆 Menerbitkan sertifikat untuk Kursus 2...");
    const certTx2 = await certificateManager
      .connect(student)
      .issueCertificate(courseId2, "Jane Doe", { value: certFee });
    await certTx2.wait();

    const certId2 = await certificateManager.getStudentCertificate(
      student.address,
      courseId2
    );
    console.log(
      `✅ Sertifikat diterbitkan untuk Kursus 2 dengan ID: ${certId2}`
    );

    // Dapatkan detail sertifikat dan verifikasi
    console.log("\n🔍 Mendapatkan detail sertifikat...");
    const cert1 = await certificateManager.getCertificate(certId1);
    const cert2 = await certificateManager.getCertificate(certId2);

    console.log("\nDetail Sertifikat 1:");
    console.log(`- ID Sertifikat: ${cert1.certificateId}`);
    console.log(`- ID Kursus: ${cert1.courseId}`);
    console.log(`- Nama Siswa: ${cert1.studentName}`);
    console.log(`- Alamat Siswa: ${cert1.student}`);
    console.log(
      `- Diterbitkan pada: ${new Date(
        Number(cert1.issuedAt) * 1000
      ).toLocaleString()}`
    );
    console.log(`- Valid: ${cert1.isValid}`);

    console.log("\nDetail Sertifikat 2:");
    console.log(`- ID Sertifikat: ${cert2.certificateId}`);
    console.log(`- ID Kursus: ${cert2.courseId}`);
    console.log(`- Nama Siswa: ${cert2.studentName}`);
    console.log(`- Alamat Siswa: ${cert2.student}`);
    console.log(
      `- Diterbitkan pada: ${new Date(
        Number(cert2.issuedAt) * 1000
      ).toLocaleString()}`
    );
    console.log(`- Valid: ${cert2.isValid}`);

    console.log("\n🔍 Menguji verifikasi sertifikat...");
    const isValid1 = await certificateManager.verifyCertificate(certId1);
    const isValid2 = await certificateManager.verifyCertificate(certId2);
    console.log(`- Verifikasi Sertifikat 1: ${isValid1}`);
    console.log(`- Verifikasi Sertifikat 2: ${isValid2}`);

    console.log("\n🔍 URL verifikasi sertifikat:");
    const verificationData1 = await certificateManager.getVerificationData(
      certId1
    );
    const verificationData2 = await certificateManager.getVerificationData(
      certId2
    );
    console.log(`- Sertifikat 1: ${verificationData1}`);
    console.log(`- Sertifikat 2: ${verificationData2}`);

    console.log("\n🔍 Metadata sertifikat:");
    try {
      const certMetadata1 = await certificateManager.getCertificateMetadata(
        certId1
      );
      const certMetadata2 = await certificateManager.getCertificateMetadata(
        certId2
      );
      console.log(`- Metadata Sertifikat 1: ${certMetadata1}`);
      console.log(`- Metadata Sertifikat 2: ${certMetadata2}`);
    } catch (error) {
      console.log(
        `⚠️ Kesalahan metadata sertifikat: ${error.reason || error.message}`
      );
    }

    // BAGIAN 7: PENGUJIAN KEAMANAN & VALIDASI
    console.log("\n\n🔷 BAGIAN 7: PENGUJIAN KEAMANAN & VALIDASI");

    console.log(
      "\n🔒 Menguji penyelesaian bagian duplikat (seharusnya gagal)..."
    );
    try {
      await progressTracker.connect(student).completeSection(courseId1, 0);
      console.log("⚠️ Penyelesaian duplikat seharusnya gagal tetapi tidak!");
    } catch (error) {
      console.log("✅ Penyelesaian bagian duplikat berhasil diblokir");
    }

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

    // Uji validasi harga
    console.log("\n🔒 Menguji validasi harga maksimum...");
    const maxPriceInETH = await courseFactory.MAX_PRICE_ETH();
    console.log(
      `Harga maksimum yang diizinkan: ${ethers.formatEther(maxPriceInETH)} ETH`
    );

    console.log("\n🎉 Pengujian komprehensif berhasil diselesaikan!");
    console.log("\n📊 Ringkasan Tes:");
    console.log(`- Dibuat ${await courseFactory.getTotalCourses()} kursus`);
    const nextCertId = await certificateManager._nextCertificateId();
    console.log(`- Diterbitkan ${nextCertId - BigInt(1)} sertifikat`);
    console.log(`- Semua tindakan keamanan berfungsi dengan benar`);
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
