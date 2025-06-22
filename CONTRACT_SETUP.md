# Contract Setup & Architecture Documentation

## Overview

EduVerse adalah platform pendidikan Web3 yang menggunakan beberapa smart contract yang saling terkait. Dokumen ini menjelaskan arsitektur kontrak, alur deployment, dan integrasi antara kontrak-kontrak tersebut.

## Kontrak Utama

1. **CourseFactory** - Mengelola pembuatan dan pendaftaran kursus
2. **CourseLicense** - Menangani pembelian dan kepemilikan lisensi kursus
3. **ProgressTracker** - Melacak kemajuan pengguna dalam kursus
4. **CertificateManager** - Menangani sertifikat penyelesaian kursus
5. **PlatformRegistry** - Mendaftarkan semua kontrak platform untuk kemudahan akses

## Alur Deployment

Kontrak-kontrak di-deploy secara terpisah (bukan menggunakan PlatformFactory) untuk mengoptimalkan biaya gas dan menghindari batasan ukuran kontrak.

```
1. MockV3Aggregator (price feed)
2. CourseFactory
3. CourseLicense
4. ProgressTracker
5. CertificateManager
6. PlatformRegistry
7. Register semua kontrak di PlatformRegistry
```

## Catatan Tentang PlatformFactory

Kontrak `PlatformFactory.sol` ada dalam codebase tetapi **tidak digunakan** dalam deployment aktual. Kontrak ini awalnya dirancang untuk men-deploy semua kontrak platform dalam satu transaksi, tetapi pendekatan ini dihindari untuk alasan berikut:

1. Biaya gas yang lebih tinggi
2. Potensi mencapai batas ukuran kontrak
3. Fleksibilitas yang lebih rendah dalam pengaturan kontrak

Oleh karena itu, referensi ke `PlatformFactory` telah dikomentari dari script ekspor ABI dan file helper untuk menghindari kebingungan.

## Struktur File ABI & Kontrak

- **contracts/** - Kontrak Solidity sumber
- **artifacts/** - Compiled contract artifacts
- **scripts/** - Script deployment dan utilitas lainnya
  - `deploy.js` - Script deployment utama
  - `ABI-Export.js` - Mengekspor ABI ke aplikasi mobile dan frontend
- **EduVerseApp/src/constants/abi/** - File ABI untuk aplikasi mobile
- **frontend_website/eduverse/abis/** - File ABI untuk frontend website

## Mengupdate Kontrak

Jika Anda perlu mengubah kontrak:

1. Update file kontrak Solidity
2. Deploy ulang menggunakan `npx hardhat run scripts/deploy.js --network <your-network>`
3. Ekspor ABI-ABI yang diperbarui menggunakan `node scripts/ABI-Export.js`
4. Verifikasi kontrak (opsional) menggunakan `npx hardhat run scripts/verify-separated.js --network <your-network>`

## Troubleshooting

Jika mengalami masalah dengan referensi kontrak null:

- Pastikan kontrak telah di-deploy dengan benar
- Periksa file `deployed-contracts.json` untuk mengetahui alamat kontrak yang benar
- Jalankan `node scripts/ABI-Export.js` untuk memperbarui file ABI dan alamat
