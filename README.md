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
├── portal.js              # 🚀 Main Portal Entry Point (423 lines)
├── export-system.js       # 🔄 Unified ABI Export System (372 lines)
├── core/
│   └── system.js          # 🔧 Core utilities & enhanced logging
├── modules/               # 📦 5 Specialized Managers
│   ├── deployment/        # 🚀 Deployment operations
│   │   └── manager.js     # (195 lines)
│   ├── verification/      # 🔍 Verification operations
│   │   └── manager.js     # (225 lines)
│   ├── testing/          # 🧪 Testing operations
│   │   └── manager.js     # (285 lines)
│   ├── utilities/        # 🛠️ ABI export & utilities
│   │   └── manager.js     # (380 lines)
│   └── development/      # ⚙️ Development operations
│       └── manager.js     # (269 lines)
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

### **Smart Contracts (Deployed)**
- **CourseFactory** - Factory pattern untuk course creation
  - Address: `0x58052b96b05fFbE5ED31C376E7762b0F6051e15A`
- **CourseLicense** - ERC1155 licensing system untuk course access
  - Address: `0x32b235fDabbcF4575aF259179e30a228b1aC72a9`
- **ProgressTracker** - Student progress tracking
  - Address: `0x6e3B6FbE90Ae4fca8Ff5eB207A61193ef204FA18`
- **CertificateManager** - NFT certificates untuk course completion
  - Address: `0x857e484cd949888736d71C0EfC7D981897Df3e61`

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
EduVerse/
├── contracts/             # 📜 Smart Contract source code (Solidity)
│   ├── CourseFactory.sol
│   ├── CourseLicense.sol
│   ├── ProgressTracker.sol
│   └── CertificateManager.sol
├── scripts/               # 🚀 Development portal & deployment scripts
│   ├── portal.js          # Main Portal Interface (423 lines)
│   ├── export-system.js   # Unified ABI Export (372 lines)
│   ├── core/system.js     # Core utilities
│   └── modules/           # 5 Specialized managers
├── test/                  # 🧪 Smart Contract tests
├── EduVerseApp/           # 📱 React Native mobile app
│   ├── src/constants/abi/ # Auto-synced contract ABIs
│   └── App.js             # Main app with Web3 integration
├── eduweb/                # 🌐 Next.js frontend website
│   ├── abis/              # Auto-synced contract ABIs
│   └── app/               # Next.js 15 app router
├── deployed-contracts.json # 📋 Single source of truth
└── hardhat.config.js      # Hardhat configuration
```

---

## 🔗 **Links & Resources**

- **Smart Contracts:** [/contracts](./contracts)
- **Mobile App:** [/EduVerseApp](./EduVerseApp)
- **Frontend:** [/eduweb](./eduweb)
- **Development Scripts:** [/scripts](./scripts)

---

## 📝 **Development Status**

**✅ Production Ready (July 2025)**
- ✅ Smart contracts deployed dan verified pada Manta Pacific Testnet
- ✅ Mobile app (React Native + Expo) fully integrated dengan blockchain
- ✅ Frontend website (Next.js 15) functional dengan Livepeer streaming
- ✅ Professional Portal development environment (8 menu sections)
- ✅ Comprehensive testing suite (4 test scripts + interactive testing)
- ✅ Automatic ABI synchronization system ke semua platform
- ✅ Complete documentation dan AI coding instructions
- ✅ Cross-platform environment management
- ✅ Real-time status monitoring dan health checking

**🚀 Latest Updates:**
- **Portal System V2**: 8 main sections dengan 40+ operations
- **ExportSystem**: Unified ABI distribution ke mobile dan frontend
- **Manager Architecture**: 5 specialized managers untuk operasi terpisah
- **Enhanced Logging**: Professional color-coded output dengan progress tracking
- **Environment Automation**: Auto-managed `.env` files untuk semua platform

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
    - Tambahkan Project ID yang Anda dapatkan dari [WalletConnect Cloud](https://cloud.walletconnect.com/) dan ThirdWeb Client ID dari [ThirdWeb Dashboard](https://thirdweb.com/dashboard). Kedua kunci ini **wajib** ada agar fungsionalitas dompet di aplikasi mobile berjalan.

    ```env
    # File: ./EduVerseApp/.env
    ENV_PROJECT_ID=ID_PROYEK_WALLETCONNECT_ANDA
    EXPO_PUBLIC_THIRDWEB_CLIENT_ID=ID_CLIENT_THIRDWEB_ANDA
    ```

3.  **Konfigurasi Frontend (Next.js):**
    - Untuk menjalankan frontend web, Anda membutuhkan API key dari Livepeer untuk streaming video.
    - Dapatkan API key dari [Livepeer Studio](https://livepeer.studio/).

    ```env
    # File: ./eduweb/.env.local
    NEXT_PUBLIC_LIVEPEER_API_KEY=API_KEY_LIVEPEER_ANDA
    ```

    **Catatan:** File environment lainnya akan otomatis di-generate oleh portal system setelah deployment kontrak.

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

**Catatan:** Sistem CLI telah berevolusi menjadi Portal System yang lebih canggih. Gunakan `npm run portal` untuk interface yang lebih lengkap dan user-friendly.

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
npm run portal
# Navigate through:
# 1. 🚀 Deployment Operations
# 2. 🔍 Verification Operations
# 3. 🧪 Testing Operations
# 4. 🛠️ Utilities Operations
# 5. ⚙️ Development Operations
# 6. 📊 Project Status
# 7. 🔧 Quick Actions
```

**Portal System Features:**
- **8 Main Menu Sections** dengan 40+ sub-operasi
- **Real-time Status Monitoring** untuk semua komponen
- **Automatic ABI Synchronization** ke mobile dan frontend
- **Error Recovery & Debugging** dengan logging yang komprehensif
- **Sequential Operation Management** untuk mencegah konflik

### Langkah 2.1: Test Portal System (Recommended)

Sebelum melanjutkan, test portal system untuk memastikan semua berjalan dengan baik:

```bash
# Check project status
npm run portal
# Select: 6 → 1 (Complete Project Status)

# Atau quick check
npm run quick status-check
```

Portal akan menampilkan status semua komponen:
- 📦 **Deployed Contracts**: Status deployment
- 🔍 **Verification**: Network compatibility
- 📱 **Mobile Ready**: ABI files + environment setup
- 🌐 **Frontend Ready**: ABI distribution status
    - Buat file baru bernama `.env` di dalam direktori `EduVerseApp`.
    - Tambahkan Project ID yang Anda dapatkan dari [WalletConnect Cloud](https://cloud.walletconnect.com/). Ini **wajib** ada agar fungsionalitas dompet di aplikasi mobile berjalan.

    ```env
    # File: ./EduVerseApp/.env
    ENV_PROJECT_ID=ID_PROYEK_WALLETCONNECT_ANDA
    ```

### Langkah 3: Deploy Smart Contracts

Setelah konfigurasi selesai, deploy smart contract ke jaringan Manta Pacific Testnet.

**🚀 Menggunakan Portal System (RECOMMENDED):**
```bash
# Option 1: Full deployment pipeline
npm run portal
# Select: 7 → 1 (Full Deploy & Setup)

# Option 2: Step-by-step deployment
npm run portal
# Select: 1 → 1 (Deploy Complete System)
# Then: 2 → 1 (Complete Verification)
# Then: 4 → 1 (Complete Mobile Setup)
```

**⚡ Quick Actions:**
```bash
# One-command deployment
npm run quick full-deploy
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

**🚀 Menggunakan Portal System (RECOMMENDED):**
```bash
# Option 1: Complete mobile setup
npm run portal
# Select: 4 → 1 (Complete Mobile Setup)

# Option 2: Quick action
npm run quick sync-abis
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

## 📜 **Available Scripts & Commands**

### **Portal System Commands**
```bash
npm run portal          # 🚀 Main portal interface (RECOMMENDED)
npm run dev            # 🚀 Alias untuk portal
```

### **Quick Actions**
```bash
npm run quick full-deploy      # Deploy + verify + setup everything
npm run quick status-check     # Complete project health check
npm run quick sync-abis        # Sync ABI files to all platforms
npm run quick quick-verify     # Quick verification check
```

### **Individual Operations (Advanced)**
```bash
# Smart Contract Operations
npm run compile                # Compile contracts
npm run deploy                 # Deploy to Manta Pacific Testnet
npm run verify:comprehensive   # Comprehensive contract verification

# Testing Operations
npm run test                   # Run Hardhat tests
npm run test:interact          # Interactive contract testing
npm run test:courses           # Course exploration testing
npm run test:licenses          # License system testing
npm run test:update            # Course update testing

# ABI & Environment Management
npm run export:abi             # Export ABI files
npm run export:mobile          # Export ABI ke mobile only
npm run export:frontend        # Export ABI ke frontend only
npm run setup:mobile           # Complete mobile environment setup
npm run update:env             # Update environment variables

# Development Utilities
npm run network                # Network helper information
npm run console                # Hardhat console
npm run clean                  # Clean build artifacts
```

### **Platform-Specific Commands**
```bash
# Mobile App (EduVerseApp)
cd EduVerseApp
npm start                      # Start Expo development server
npm run android                # Run on Android
npm run ios                    # Run on iOS

# Frontend Web (eduweb)
cd eduweb
npm run dev                    # Start Next.js development server
npm run build                  # Build production version
npm run lint                   # Run ESLint
```

## 🔧 **Troubleshooting & Common Issues**

### **Portal System Issues**
```bash
# Issue: Portal won't start
# Solution: Check Node.js version and dependencies
node --version                 # Should be >= 16
npm install

# Issue: Operations fail silently
# Solution: Check system logs
npm run portal
# Select: 6 → 6 (Development Status) untuk debug info
```

### **Environment & ABI Issues**
```bash
# Issue: ABI files outdated or missing
# Solution: Re-export ABIs
npm run portal
# Select: 4 → 2 (Export ABI All)

# Issue: Environment variables not updated
# Solution: Update environment manually
npm run portal
# Select: 4 → 4 (Update Mobile Environment)
```

### **Network & Deployment Issues**
```bash
# Issue: Network connection errors
# Solution: Check Manta Pacific RPC
npm run network

# Issue: Contract deployment fails
# Solution: Check wallet balance and network
npm run portal
# Select: 6 → 1 untuk check prerequisites
```

### **Mobile App Issues**
```bash
# Issue: Wallet connection fails
# Solution: Check environment variables
npm run portal
# Select: 4 → 6 (Show Utilities Status)

# Issue: Contract calls fail
# Solution: Verify contract setup
npm run portal
# Select: 2 → 1 (Complete Verification)
```

## 🤝 Berkontribusi

Kontribusi sangat kami hargai. Jika Anda ingin berkontribusi, silakan *fork* repositori ini, buat *branch* baru untuk perubahan Anda, dan ajukan *Pull Request*.

## 📄 Lisensi

Proyek ini dilisensikan di bawah **ISC License**. Lihat file `package.json` di root untuk detailnya.
