# Dokumentasi Sistem Pengecekan Lisensi EduVerse

## Overview

Sistem pengecekan lisensi di EduVerse menggunakan smart contract ERC1155 untuk memastikan bahwa pengguna yang sudah memiliki lisensi aktif untuk suatu course tidak dapat membeli lisensi lagi sampai lisensi tersebut expired.

## Komponen Utama

### 1. SmartContractService.hasValidLicense()

**Lokasi:** `src/services/SmartContractService.js`

Method ini langsung berkomunikasi dengan smart contract untuk:

- Mengecek balance user untuk course ID tertentu menggunakan `balanceOf(userAddress, courseId)`
- Jika balance > 0, mengambil data lisensi menggunakan `getLicense(userAddress, courseId)`
- Memverifikasi bahwa lisensi masih aktif dan belum expired

```javascript
async hasValidLicense(userAddress, courseId) {
  // 1. Cek balance (ERC1155)
  const balance = await this.contracts.courseLicense.balanceOf(userAddress, courseId);

  if (Number(balance) > 0) {
    // 2. Ambil data lisensi
    const licenseData = await this.contracts.courseLicense.getLicense(userAddress, courseId);

    // 3. Cek status aktif dan expiry
    const now = Math.floor(Date.now() / 1000);
    return licenseData.isActive && Number(licenseData.expiryTimestamp) > now;
  }

  return false;
}
```

### 2. useHasActiveLicense Hook

**Lokasi:** `src/hooks/useBlockchain.js`

React hook yang:

- Menggunakan `SmartContractService.hasValidLicense()` untuk pengecekan
- Mengelola state loading, error, dan hasil pengecekan
- Auto-refresh ketika courseId atau address berubah
- Menyediakan fungsi refetch untuk refresh manual

### 3. DashboardScreen Integration

**Lokasi:** `src/screens/DashboardScreen.js`

Dashboard menggunakan hook untuk:

- Mengecek status lisensi untuk course yang dipilih di modal
- Mengirim prop `hasLicense` dan `licenseLoading` ke CourseDetailModal
- Refresh status lisensi setelah berhasil mint license

### 4. CourseDetailModal UX

**Lokasi:** `src/components/CourseDetailModal.js`

Modal menampilkan:

- Loading state saat mengecek lisensi
- Pesan hijau jika user sudah punya lisensi aktif
- Tombol disabled dengan teks "Anda sudah memiliki lisensi aktif"
- Mencegah error "Existing License Not Expired" dari smart contract

## Flow Pengecekan

1. **User membuka detail course**

   - `useHasActiveLicense` dipanggil dengan courseId
   - Hook menampilkan loading state

2. **Pengecekan di blockchain**

   - `SmartContractService.hasValidLicense()` dipanggil
   - Method melakukan 2 panggilan ke smart contract:
     - `balanceOf(userAddress, courseId)` - cek apakah user punya token
     - `getLicense(userAddress, courseId)` - ambil detail lisensi jika ada

3. **Hasil pengecekan**

   - Jika user punya lisensi aktif: tombol disabled + pesan informasi
   - Jika user tidak punya lisensi: tombol aktif untuk membeli
   - Jika terjadi error: tombol disabled + log error

4. **Setelah mint license berhasil**
   - `refetchLicense()` dipanggil untuk refresh status
   - UI otomatis update sesuai status baru

## Keamanan

- **Double validation:** Cek balance dulu, baru cek detail lisensi
- **Timestamp validation:** Memastikan lisensi belum expired
- **Error handling:** Fallback ke safe state jika terjadi error
- **Real-time data:** Selalu ambil data terbaru dari blockchain

## Benefits

1. **UX yang baik:** User tidak melihat error teknis dari smart contract
2. **Data real-time:** Selalu sinkron dengan state blockchain terbaru
3. **Efisien:** Hanya mengecek saat diperlukan (per course)
4. **Robust:** Handle edge cases dan error gracefully

## Testing

Untuk memastikan sistem bekerja dengan benar:

1. **Test case 1:** User belum punya lisensi

   - Tombol "Beli Lisensi" aktif
   - Tidak ada pesan lisensi

2. **Test case 2:** User punya lisensi aktif

   - Tombol disabled dengan teks "Anda sudah memiliki lisensi aktif"
   - Pesan hijau muncul

3. **Test case 3:** Setelah mint berhasil

   - Status otomatis berubah dari case 1 ke case 2
   - Tidak ada error dari smart contract

4. **Test case 4:** Network error
   - Loading state ditampilkan
   - Tombol disabled untuk safety
