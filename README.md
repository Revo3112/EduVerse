<div align="center">
  <img src="./EduVerseApp/assets/Eduverse_logo.png" alt="EduVerse Logo" width="200" height="200" />
</div>

# 🎓 EduVerse - Web3 Educational Platform

<div align="center">
  <strong>Platform Edukasi Blockchain Multi-Platform dengan Arsitektur Modular Profesional</strong>
</div>

<div align="center">

  ![Manta Pacific](https://img.shields.io/badge/Network-Manta%20Pacific%20Testnet-blue?style=for-the-badge)
  ![React Native](https://img.shields.io/badge/Mobile-React%20Native-61DAFB?style=for-the-badge&logo=react)
  ![Next.js](https://img.shields.io/badge/Frontend-Next.js%2015-000000?style=for-the-badge&logo=nextdotjs)
  ![Hardhat](https://img.shields.io/badge/Contracts-Hardhat-F7DF1E?style=for-the-badge)

</div>

---

## 🚀 Professional Development Environment

EduVerse adalah platform edukasi berbasis blockchain yang dibangun dengan **arsitektur modular profesional** untuk development experience yang optimal.

---

## ⭐ **Quick Start**

### 🎯 **Main Portal (RECOMMENDED)**
```bash
npm run portal
```
*Single entry point untuk semua operasi development*

### ⚡ **Quick Actions**
```bash
npm run quick <action>

# Examples:
npm run quick full-deploy    # Deploy everything
npm run quick status-check   # Check project status
npm run quick sync-abis      # Sync ABI files
```

### 📋 **Available Commands**
```bash
npm run portal          # 🚀 Professional portal interface
npm run dev            # 🚀 Alias untuk portal
npm run quick <action> # ⚡ Quick actions
npm run cli           # 📋 Legacy CLI interface

# Individual operations
npm run deploy        # Deploy contracts
npm run verify:comprehensive  # Verify contracts
npm run export:abi    # Export ABI files
npm run setup:mobile  # Setup mobile environment
```

---

## 🏗️ **Architecture Overview**

### **🎯 Professional Modular Design**
```
scripts/
├── portal.js              # 🚀 Main Portal Entry Point
├── portal.js              # 🎪 Main Interface - All operations
├── core/
│   └── system.js          # 🔧 Core utilities & enhanced logging
├── modules/
│   ├── deployment/        # 🚀 Deployment operations
│   ├── verification/      # 🔍 Verification operations
│   ├── testing/          # 🧪 Testing operations
│   ├── utilities/        # 🛠️ ABI export & utilities
│   └── development/      # ⚙️ Development operations
└── [individual scripts]   # 📋 Legacy scripts for CI/CD
```

### **✅ Key Features**
- **🎯 Single Portal Interface** - One command untuk semua operasi
- **🔧 Enhanced Logging** - Professional color-coded output
- **📊 Real-time Status** - Project health monitoring
- **🚨 Error Management** - Comprehensive error handling
- **🔄 Backward Compatible** - Legacy scripts tetap functional
- **📱 Mobile Ready** - Automatic ABI sync untuk React Native
- **🌐 Frontend Ready** - ABI export untuk Next.js frontend

---

## 🎯 **Usage Examples**

### **Complete Development Workflow**
```bash
# 1. Start with project status
npm run portal
# Select: 6 → Project Status

# 2. Deploy complete system
npm run portal
# Select: 1 → Deployment Operations → 1 → Deploy Complete System

# 3. Quick verification
npm run quick status-check
```

### **Development Daily Usage**
```bash
# Quick status check
npm run quick status-check

# Deploy and setup everything
npm run quick full-deploy

# Sync ABI files to mobile/frontend
npm run quick sync-abis
```

---

## 🔧 **Technical Details**

### **Smart Contracts**
- **CertificateManager** - NFT certificates untuk course completion
- **CourseFactory** - Factory pattern untuk course creation
- **CourseLicense** - Licensing system untuk course access
- **ProgressTracker** - Student progress tracking

### **Network Configuration**
- **Main Network:** Manta Pacific Sepolia Testnet
- **Chain ID:** 3441006
- **Explorer:** https://pacific-explorer.sepolia-testnet.manta.network

### **Development Stack**
- **Hardhat** - Smart contract development framework
- **React Native** - Mobile application
- **Next.js** - Frontend website
- **IPFS/Pinata** - Decentralized file storage
- **Livepeer** - Video streaming

---

## 📱 **Mobile & Frontend Integration**

### **Automatic ABI Synchronization**
Portal system automatically syncs contract ABIs to:
- `EduVerseApp/src/constants/abi/` - React Native app
- `eduweb/abis/` - Next.js frontend (primary)

### **Environment Management**
```bash
npm run setup:mobile    # Complete mobile environment setup
npm run update:env      # Update environment variables
```

---

## 🧪 **Testing**

### **Interactive Testing**
```bash
npm run portal
# Select: 3 → Testing Operations
```

### **Individual Test Scripts**
```bash
npm run test:interact   # Interactive contract testing
npm run test:courses    # Course exploration testing
npm run test:licenses   # License system testing
npm run test:update     # Course update testing
```

---

## 🚀 **Deployment**

### **Production Deployment**
```bash
npm run portal
# Select: 1 → Deployment Operations → 1 → Deploy Complete System
```

### **CI/CD Integration**
```bash
# Individual commands for automation
npm run compile
npm run deploy
npm run verify:comprehensive
npm run setup:mobile
```

---

## 📊 **Development Features**

### **✅ Professional Development Environment**
- **Enhanced User Experience** - Color-coded, interactive interface
- **Real-time Monitoring** - Project status dan health checking
- **Error Management** - Comprehensive error handling dan recovery
- **Development Efficiency** - One-command workflows
- **Consistency Checking** - ABI dan network compatibility validation

### **✅ Quality Assurance**
- **Syntax Validation** - All files error-free
- **Integration Testing** - Cross-module compatibility
- **Documentation Consistency** - Accurate dan up-to-date
- **Performance Optimized** - Fast startup dan responsive interface

---

## � **EduVerse Platform Features**

### **For Educators**
- **Course Creation** - Deploy courses as smart contracts
- **Content Management** - IPFS-based content storage
- **Student Tracking** - Blockchain-based progress monitoring
- **Certificate Issuance** - NFT certificates untuk completion

### **For Students**
- **Course Access** - License-based course enrollment
- **Progress Tracking** - Transparent progress monitoring
- **Certificate Collection** - NFT certificate ownership
- **Mobile Learning** - React Native mobile app

### **For Developers**
- **Professional Tools** - Complete development environment
- **Modular Architecture** - Clean, maintainable codebase
- **Automated Workflows** - One-command deployment dan testing
- **Documentation** - Comprehensive guides dan examples

---

## 🏛️ **Project Architecture**

```
/
├── contracts/         # Smart Contract source code (Solidity)
├── scripts/           # Development portal & deployment scripts
│   ├── portal.js      # 🚀 Main Portal Interface
│   ├── portal.js       # 🎪 Main Interface
│   ├── core/          # 🔧 Core utilities
│   └── modules/       # 📦 Modular managers
├── test/              # Smart Contract tests
├── EduVerseApp/       # React Native mobile app
├── eduweb/            # Next.js frontend (primary)
└── hardhat.config.js  # Hardhat configuration
```

---

## 🔗 **Links & Resources**

- **Smart Contracts:** [/contracts](./contracts)
- **Mobile App:** [/EduVerseApp](./EduVerseApp)
- **Frontend:** [/eduweb](./eduweb)
- **Development Scripts:** [/scripts](./scripts)

---

## 📝 **Development Status**

**✅ Production Ready**
- Smart contracts deployed dan verified
- Mobile app integrated dengan blockchain
- Frontend website functional
- Professional development environment
- Comprehensive testing suite
- Complete documentation

---

*🏗️ Built with professional modular architecture*
*🎯 Optimized for developer experience*
*🚀 Ready for production deployment*
    cd eduverse
    ```

2.  **Instal Dependensi Backend (Root):**
    Perintah ini menginstal Hardhat dan semua paket yang dibutuhkan untuk smart contract.
    ```bash
    npm install
    ```

3.  **Instal Dependensi Aplikasi Mobile:**
    ```bash
    cd EduVerseApp
    npm install
    cd ..
    ```

4.  **Instal Dependensi Situs Web:**
    ```bash
    cd eduweb
    npm install
    cd ..
    ```

### Langkah 2: Konfigurasi Variabel Lingkungan

Anda perlu menyediakan kunci rahasia agar skrip dapat berinteraksi dengan jaringan blockchain dan layanan pihak ketiga.

1.  **Konfigurasi Backend (Hardhat):**
    - Buat file baru bernama `.env` di direktori **root** proyek.
    - Tambahkan *private key* dari dompet Ethereum Anda. Kunci ini **wajib** ada untuk mendeploy kontrak ke testnet atau mainnet.

    ```env
    # File: ./ .env
    PRIVATE_KEY=0x_KUNCI_PRIVAT_DOMPET_ANDA
    ```

2.  **Konfigurasi Aplikasi Mobile (Expo):**
    - Pindah ke direktori `EduVerseApp`.
    - Buat file baru bernama `.env` di dalam direktori `EduVerseApp`.
    - Tambahkan Project ID yang Anda dapatkan dari [WalletConnect Cloud](https://cloud.walletconnect.com/). Ini **wajib** ada agar fungsionalitas dompet di aplikasi mobile berjalan.

    ```env
    # File: ./EduVerseApp/.env
    ENV_PROJECT_ID=ID_PROYEK_WALLETCONNECT_ANDA
    ```

## 🛠️ EduVerse Development CLI

**EduVerse hadir dengan sistem CLI terpadu untuk mempermudah development workflow.**

### 🎯 Quick Start dengan CLI

```bash
# Interactive CLI (RECOMMENDED untuk pemula)
npm run cli

# Quick Actions (RECOMMENDED untuk developer berpengalaman)
npm run quick full-deploy    # Deploy + verify + setup lengkap
npm run quick status-check   # Check status project

# Help
npm run quick help           # Lihat semua quick actions
```

### 🚀 Common Workflows

**1. Deploy Everything (First Time)**
```bash
npm run quick full-deploy
```

**2. Verification Only**
```bash
npm run quick quick-verify
```

**3. Setup Mobile App**
```bash
npm run quick sync-abis
```

**4. Interactive Menu**
```bash
npm run cli
# Navigate through:
# 1. 🚀 Deployment Operations
# 2. 🔍 Verification Operations
# 3. 🧪 Testing Operations
# 4. 🛠️ Utility Operations
# 5. ⚙️ Development Operations
# 6. 📊 Project Status
```

📖 **Dokumentasi Lengkap CLI:** [CLI-DOCUMENTATION.md](./CLI-DOCUMENTATION.md)

### Langkah 2.1: Test CLI (Optional)

Sebelum melanjutkan, Anda bisa test CLI untuk memastikan semua berjalan dengan baik:

```bash
# Check project status
npm run quick status-check

# Atau menggunakan interactive CLI
npm run cli
# Pilih: 6 (Project Status)
```
    - Buat file baru bernama `.env` di dalam direktori `EduVerseApp`.
    - Tambahkan Project ID yang Anda dapatkan dari [WalletConnect Cloud](https://cloud.walletconnect.com/). Ini **wajib** ada agar fungsionalitas dompet di aplikasi mobile berjalan.

    ```env
    # File: ./EduVerseApp/.env
    ENV_PROJECT_ID=ID_PROYEK_WALLETCONNECT_ANDA
    ```

### Langkah 3: Deploy Smart Contracts

Setelah konfigurasi selesai, deploy smart contract ke jaringan Manta Pacific Testnet.

**🚀 Menggunakan CLI (RECOMMENDED):**
```bash
# Option 1: Full deployment dengan CLI
npm run quick full-deploy

# Option 2: Interactive deployment
npm run cli
# Pilih: 1 (Deployment) → 1 (Deploy Complete System)
```

**📋 Manual (Advanced):**
1.  **Kompilasi Kontrak:**
    ```bash
    npm run compile
    ```

2.  **Deploy ke Manta Testnet:**
    ```bash
    npm run deploy
    ```

3.  **Verifikasi Contracts:**
    ```bash
    npm run verify:comprehensive
    ```

*Catatan: Pastikan dompet yang terhubung dengan `PRIVATE_KEY` Anda memiliki cukup dana (ETH di Manta Sepolia Testnet) untuk membayar gas fee.*

### Langkah 4: Setup Aplikasi Mobile

**🚀 Menggunakan CLI (RECOMMENDED):**
```bash
# Option 1: Quick action
npm run quick sync-abis

# Option 2: Interactive
npm run cli
# Pilih: 4 (Utilities) → 3 (Complete Mobile Setup)
```

**📋 Manual (Advanced):**
```bash
npm run export:abi    # Export ABI files
npm run update:env    # Update environment variables
```

### Langkah 5: Jalankan Aplikasi

Sekarang semua sudah siap. Anda dapat menjalankan aplikasi mobile dan situs web.

1.  **Menjalankan Aplikasi Mobile:**
    - Pindah ke direktori aplikasi mobile.
    - Jalankan perintah `start` untuk membuka Metro Bundler.
    - Pindai QR code menggunakan aplikasi Expo Go di ponsel Anda.

    ```bash
    cd EduVerseApp
    npm start
    ```

2.  **Menjalankan Situs Web:**
    - Pindah ke direktori situs web.
    - Jalankan server pengembangan Next.js.

    ```bash
    cd eduweb
    npm run dev
    ```
    Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

## 📜 Skrip Penting Lainnya

- `npm run test`: Menjalankan rangkaian tes untuk smart contract.
- `npm run deploy:local`: Mendeploy kontrak ke jaringan lokal Hardhat untuk pengujian cepat.
- `npm run lint` (di `eduweb`): Menjalankan ESLint untuk memeriksa kualitas kode frontend.

## 🤝 Berkontribusi

Kontribusi sangat kami hargai. Jika Anda ingin berkontribusi, silakan *fork* repositori ini, buat *branch* baru untuk perubahan Anda, dan ajukan *Pull Request*.

## 📄 Lisensi

Proyek ini dilisensikan di bawah **ISC License**. Lihat file `package.json` di root untuk detailnya.
