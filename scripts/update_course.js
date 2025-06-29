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
    `---> ✅ Transaksi "${description}" berhasil dikonfirmasi. Gas yang digunakan: ${receipt.gasUsed.toString()}`
  );
  return receipt;
}

async function main() {
  try {
    console.log("🔬 Eduverse Platform - Skenario HANYA Update Data Kursus");

    // Muat alamat kontrak yang sudah di-deploy
    const addresses = JSON.parse(
      fs.readFileSync("deployed-contracts.json", "utf8")
    );

    // Di testnet, kita akan menggunakan akun yang sama untuk semua peran
    const [deployer] = await ethers.getSigners();
    const creator = deployer;

    console.log(
      "\n⚠️ Menjalankan di testnet - menggunakan akun deployer untuk semua peran"
    );
    console.log(`👤 Akun: ${deployer.address}`);

    // Terhubung ke kontrak
    const CourseFactory = await ethers.getContractFactory("CourseFactory");
    const courseFactory = CourseFactory.attach(addresses.courseFactory);
    console.log("\n✅ Berhasil terhubung ke CourseFactory");

    // --- BAGIAN 1: DEFINISIKAN ID KURSUS DAN DATA BARU ---
    console.log("\n\n🔷 BAGIAN 1: PERSIAPAN DATA UPDATE");

    // Tentukan ID kursus yang akan di-update secara manual
    // Menggunakan BigInt (n) untuk konsistensi
    const web3CourseId = 2n;
    const defiCourseId = 3n;
    console.log(`- Target ID untuk 'Blockchain 101': ${web3CourseId}`);
    console.log(`- Target ID untuk 'DeFi Fundamentals': ${defiCourseId}`);

    // Definisikan data baru
    const newThumbnailCID =
      "bafybeifb6towxr55repjqmfvkm3qnhaz43a2ys7n56rwi5qnj5kzcphoaa";
    const newContentCID =
      "bafybeiffnr3jq3gxaesi4rpxpbvi2nhlqvosztpvoxx6cognsqyfbkhvuq";
    const newTitleForWeb3Course = "Blockchain 101";
    console.log(`- Judul Baru: ${newTitleForWeb3Course}`);
    console.log(`- Thumbnail CID Baru: ${newThumbnailCID}`);
    console.log(`- Konten CID Baru (untuk semua bagian): ${newContentCID}`);
    console.log("========================================");

    // --- BAGIAN 2: MEMPERBARUI DATA KURSUS ---
    console.log("\n\n🔷 BAGIAN 2: MEMPERBARUI DATA DI BLOCKCHAIN");

    // Ambil data asli sebelum diubah untuk referensi
    const originalWeb3Course = await courseFactory.getCourse(web3CourseId);
    const originalDeFiCourse = await courseFactory.getCourse(defiCourseId);

    // --- Memperbarui Kursus Web3/Blockchain (ID: 2) ---
    console.log(
      `\n🔄 Memperbarui detail utama untuk Kursus ID ${web3CourseId}...`
    );
    await sendTransaction(
      courseFactory.connect(creator).updateCourse(
        web3CourseId,
        newTitleForWeb3Course, // Judul baru
        originalWeb3Course.description, // Deskripsi tetap
        newThumbnailCID, // Thumbnail baru
        originalWeb3Course.pricePerMonth, // Harga tetap
        true // Tetap aktif
      ),
      `Update Detail Kursus ID ${web3CourseId}`
    );

    console.log(
      `\n🔄 Memperbarui konten bagian (sections) untuk Kursus ID ${web3CourseId}...`
    );
    const sectionsToUpdateWeb3 = await courseFactory.getCourseSections(
      web3CourseId
    );
    for (let i = 0; i < sectionsToUpdateWeb3.length; i++) {
      const section = sectionsToUpdateWeb3[i];
      await sendTransaction(
        courseFactory.connect(creator).updateCourseSection(
          web3CourseId,
          i, // sectionId adalah index
          section.title, // Judul bagian tetap
          newContentCID, // Content CID baru untuk semua bagian
          section.duration // Durasi tetap
        ),
        `Update Bagian ${i} dari Kursus ID ${web3CourseId}`
      );
    }

    // --- Memperbarui Kursus DeFi (ID: 3) ---
    console.log(
      `\n🔄 Memperbarui thumbnail untuk Kursus ID ${defiCourseId}...`
    );
    await sendTransaction(
      courseFactory.connect(creator).updateCourse(
        defiCourseId,
        originalDeFiCourse.title, // Judul tetap
        originalDeFiCourse.description, // Deskripsi tetap
        newThumbnailCID, // Thumbnail baru
        originalDeFiCourse.pricePerMonth, // Harga tetap
        true // Tetap aktif
      ),
      `Update Detail Kursus ID ${defiCourseId}`
    );

    console.log(
      `\n🔄 Memperbarui konten bagian (sections) untuk Kursus ID ${defiCourseId}...`
    );
    const sectionsToUpdateDeFi = await courseFactory.getCourseSections(
      defiCourseId
    );
    for (let i = 0; i < sectionsToUpdateDeFi.length; i++) {
      const section = sectionsToUpdateDeFi[i];
      await sendTransaction(
        courseFactory.connect(creator).updateCourseSection(
          defiCourseId,
          i, // sectionId adalah index
          section.title, // Judul bagian tetap
          newContentCID, // Content CID baru untuk semua bagian
          section.duration // Durasi tetap
        ),
        `Update Bagian ${i} dari Kursus ID ${defiCourseId}`
      );
    }

    console.log("\n✅ Semua proses update telah dikirim.");
    console.log("========================================");

    // --- BAGIAN 3: VERIFIKASI DATA SETELAH UPDATE ---
    console.log("\n\n🔷 BAGIAN 3: VERIFIKASI DATA SETELAH UPDATE");

    console.log(`\n🔍 Verifikasi Data Akhir Kursus ID ${web3CourseId}...`);
    const finalWeb3Course = await courseFactory.getCourse(web3CourseId);
    console.log(`- Judul Baru: ${finalWeb3Course.title}`);
    console.log(`- Thumbnail Baru: ${finalWeb3Course.thumbnailCID}`);
    const finalWeb3Sections = await courseFactory.getCourseSections(
      web3CourseId
    );
    for (let i = 0; i < finalWeb3Sections.length; i++) {
      console.log(
        `- Content CID Bagian ${i} Baru: ${finalWeb3Sections[i].contentCID}`
      );
    }

    console.log(`\n🔍 Verifikasi Data Akhir Kursus ID ${defiCourseId}...`);
    const finalDeFiCourse = await courseFactory.getCourse(defiCourseId);
    console.log(`- Judul (Tetap): ${finalDeFiCourse.title}`);
    console.log(`- Thumbnail Baru: ${finalDeFiCourse.thumbnailCID}`);
    const finalDeFiSections = await courseFactory.getCourseSections(
      defiCourseId
    );
    for (let i = 0; i < finalDeFiSections.length; i++) {
      console.log(
        `- Content CID Bagian ${i} Baru: ${finalDeFiSections[i].contentCID}`
      );
    }

    console.log("\n🎉 Skenario update berhasil dijalankan!");
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
