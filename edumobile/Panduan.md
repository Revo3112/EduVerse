Panduan Super Rinci: MetaMask SDK untuk Koneksi Dompet dengan Thirdweb SDK untuk React Native Expo (Manta Pacific Testnet)Panduan komprehensif ini menyediakan pendekatan langkah demi langkah untuk mengintegrasikan MetaMask SDK untuk koneksi dompet dan Thirdweb SDK untuk fungsionalitas blockchain lainnya (seperti mencetak NFT dan penyimpanan IPFS) dalam aplikasi React Native Expo. Solusi ini mengatasi masalah koneksi dompet umum yang ditemui dengan koneksi dompet default Thirdweb, dengan memanfaatkan MetaMask SDK untuk interaksi dompet yang kuat dan langsung, sambil tetap menggunakan alat-alat canggih Thirdweb untuk interaksi kontrak pintar dan penyimpanan terdesentralisasi. Kami akan secara khusus mengkonfigurasi ini untuk Manta Pacific Testnet.1Daftar IsiMemahami ArsitekturPrasyaratPengaturan Proyek dan Konfigurasi AwalLangkah-langkah Instalasi RinciLangkah 1: Buat Proyek Expo BaruLangkah 2: Instal Dependensi IntiLangkah 3: Konfigurasi Metro untuk Polyfills dan Resolusi ModulLangkah 4: Konfigurasi Babel untuk Alias ModulLangkah 5: Perbarui app.json untuk Modul NativeLangkah 6: Siapkan Variabel Lingkungan (.env)Langkah 7: Tambahkan Polyfills Global di App.jsLangkah 8: Prebuild dan Jalankan AplikasiLangkah 9: Instal Dependensi iOS (jika menargetkan iOS)Integrasi MetaMask SDK5.1: Layanan MetaMask (src/services/metamaskService.js)5.2: Hook MetaMask (src/hooks/useMetaMask.js)Integrasi Thirdweb SDK6.1: Layanan Thirdweb (src/services/thirdwebService.js)6.2: Hook Thirdweb (src/hooks/useThirdweb.js)Mengatur Integrasi: IntegrationService7.1: Layanan Integrasi (src/services/integrationService.js)7.2: Hook Integrasi (src/hooks/useIntegration.js)Komponen React Native8.1: Komponen Koneksi Dompet (src/components/WalletConnection.js)8.2: Komponen Pencetakan (src/components/MintingComponent.js)8.3: Komponen Unggah IPFS (src/components/IPFSUpload.js)Menyatukan Semuanya: App.jsPengujian dan DebuggingPraktik Terbaik dan Pertimbangan KeamananPemecahan Masalah UmumKesimpulan1. Memahami ArsitekturSolusi ini mengusulkan arsitektur modular yang secara jelas memisahkan tugas antara manajemen dompet dan interaksi blockchain. Arsitektur ini bukan hanya tentang membuat fungsionalitas bekerja, tetapi juga tentang membangun sistem yang stabil dan dapat dipelihara dengan menerapkan prinsip rekayasa perangkat lunak inti yaitu Pemisahan Kepentingan (Separation of Concerns). Dengan memisahkan lapisan koneksi dompet dari logika aplikasi terdesentralisasi (dApp), sistem menjadi lebih tangguh terhadap masalah di salah satu bagian dari tumpukan teknologi.1Pendekatan ini secara langsung mengatasi masalah yang diketahui dalam ekosistem Thirdweb untuk pengembang React Native. Mekanisme koneksi dompet internal Thirdweb dilaporkan memiliki masalah stabilitas; oleh karena itu, arsitektur ini secara sengaja mem-bypass-nya untuk menciptakan fondasi yang lebih kuat.1MetaMask SDK (Lapisan Koneksi Dompet): Lapisan ini bertanggung jawab penuh untuk menghubungkan ke dompet MetaMask pengguna, menangani pergantian akun, perubahan jaringan, dan menyediakan web3Provider (dari ethers.js) yang terhubung ke sesi MetaMask aktif pengguna. Dengan mengisolasi tanggung jawab ini, aplikasi tidak lagi bergantung pada mekanisme koneksi dompet internal Thirdweb, yang telah dilaporkan memiliki masalah.1Thirdweb SDK (Lapisan Interaksi Blockchain): Lapisan ini akan diinisialisasi menggunakan Web3Provider yang diperoleh dari MetaMask SDK. Hal ini memungkinkan Thirdweb untuk melakukan semua operasinya yang kuat (panggilan kontrak pintar, pencetakan NFT, unggahan IPFS, dll.) menggunakan dompet yang terhubung melalui MetaMask. Ini memastikan integrasi yang mulus dan memungkinkan pengembang untuk memanfaatkan set fitur Thirdweb yang kuat tanpa mengalami masalah koneksi.1Lapisan Layanan dan Hook: Untuk menjaga basis kode yang bersih dan dapat diskalakan, panduan ini mengimplementasikan layanan JavaScript khusus (misalnya, metamaskService.js, thirdwebService.js, integrationService.js) dan hook React yang sesuai (misalnya, useMetaMask, useThirdweb, useIntegration). Pola ini mempromosikan penggunaan kembali, kemampuan pengujian, dan pemisahan logika UI dari logika bisnis. Ini menunjukkan fokus tidak hanya pada membuat aplikasi berfungsi, tetapi juga membuatnya dapat dipelihara dan dapat diskalakan, yang merupakan pertimbangan penting untuk kesehatan proyek jangka panjang.12. PrasyaratSebelum memulai, pastikan Anda telah menginstal yang berikut di mesin pengembangan Anda. Prasyarat yang sangat spesifik, terutama detail Manta Pacific Testnet dan kunci API yang telah diisi sebelumnya, menunjukkan bahwa dokumen ini berasal dari konfigurasi dunia nyata yang berfungsi, memberikan titik awal yang dapat diandalkan dan dapat ditindaklanjuti bagi pengembang.1Node.js (versi LTS direkomendasikan): https://nodejs.org/npm (Node Package Manager) atau Yarn: Disertakan dengan instalasi Node.js.Expo CLI: Instal secara global menggunakan npm install -g expo-cli.Editor Kode: Visual Studio Code sangat direkomendasikan.Aplikasi Seluler MetaMask: Terinstal di perangkat seluler Anda (iOS atau Android) untuk menguji koneksi dompet.URL RPC dan ID Rantai Manta Pacific Testnet:URL RPC: https://pacific-rpc.testnet.manta.network/websocketID Rantai: 3441005 (atau $0x34925$ dalam heksadesimal)ID Klien Thirdweb: Anda akan memerlukan ID Klien Thirdweb untuk menginisialisasi Thirdweb SDK. Anda bisa mendapatkannya dari Dasbor Thirdweb Anda.EXPO_PUBLIC_THIRDWEB_CLIENT_ID yang Anda berikan, 95f0edae49127ccece18944a63b29320, akan digunakan.1Kunci API Livepeer (Opsional): NEXT_PUBLIC_LIVEPEER_API_KEY Anda, 5c3537cc-6809-4a12-8e8a-67549cce15ad, telah dicatat, tetapi Livepeer biasanya untuk streaming video. Meskipun tidak digunakan secara langsung dalam panduan ini untuk integrasi dompet/Thirdweb, ini dapat diintegrasikan secara terpisah jika aplikasi Anda memerlukan fungsionalitas video.13. Pengaturan Proyek dan Konfigurasi AwalKita akan mulai dengan membuat proyek Expo baru dan kemudian mengkonfigurasi lingkungannya untuk MetaMask SDK dan Thirdweb SDK. Struktur proyek yang diuraikan di bawah ini merupakan dukungan implisit terhadap standar pengembangan React profesional. Dengan menyajikan struktur file yang bersih dan terorganisir sebelum kode apa pun ditulis, panduan ini mengajarkan pelajaran penting dalam keahlian perangkat lunak: struktur mendahului implementasi.1Gambaran Struktur ProyekStruktur ini dengan sengaja memisahkan file konfigurasi di root dari kode aplikasi di dalam direktori src. Di dalam src, kode selanjutnya dibagi berdasarkan fungsi: components untuk UI, hooks untuk manajemen state dan logika, dan services untuk logika bisnis dan interaksi API. Pola yang sudah mapan ini memberikan fondasi yang kokoh untuk membangun aplikasi yang dapat diskalakan.1MetaMaskThirdwebApp/
├── App.js
├── app.json
├── babel.config.js
├── metro.config.js
├── package.json
├──.env
├──.gitignore
└── src/
├── components/
│ ├── WalletConnection.js
│ ├── MintingComponent.js
│ └── IPFSUpload.js
├── hooks/
│ ├── useMetaMask.js
│ ├── useThirdweb.js
│ └── useIntegration.js
└── services/
├── metamaskService.js
├── thirdwebService.js
└── integrationService.js 4. Langkah-langkah Instalasi RinciIkuti langkah-langkah ini dengan cermat untuk menyiapkan proyek React Native Expo Anda. Bagian ini adalah panduan praktis untuk menavigasi apa yang sering disebut "Polyfill Hell" dalam pengembangan Web3 React Native. Banyaknya konfigurasi menunjukkan tantangan mendasar yang signifikan: pustaka Web3 inti tidak dirancang secara native untuk lingkungan React Native. Panduan ini telah melakukan pekerjaan yang sulit untuk mengidentifikasi setiap polyfill dan penyesuaian konfigurasi yang diperlukan.1Langkah 1: Buat Proyek Expo BaruBuka terminal atau command prompt Anda dan jalankan perintah berikut untuk membuat proyek Expo baru. Kita akan menggunakan template kosong untuk memulai dari awal.1Bashnpx create-expo-app MetaMaskThirdwebApp --template blank
cd MetaMaskThirdwebApp
Langkah 2: Instal Dependensi IntiIni adalah langkah kritis di mana kita menginstal semua paket yang diperlukan untuk MetaMask SDK, Thirdweb SDK, ethers.js (yang diandalkan oleh kedua SDK), dan berbagai polyfill yang diperlukan agar modul Node.js berfungsi dengan benar di lingkungan React Native. Polyfill ini penting karena banyak pustaka web3 dibuat untuk lingkungan Node.js atau browser, bukan secara langsung untuk React Native.1Bashnpm install \
 @metamask/sdk-react \
 @thirdweb-dev/react-native \
 @thirdweb-dev/sdk \
 ethers@5.7.2 \
 react-native-get-random-values \
 @react-native-community/netinfo \
 expo-application \
 @react-native-async-storage/async-storage \
 expo-web-browser \
 expo-linking \
 react-native-aes-gcm-crypto \
 react-native-quick-crypto@0.7.0-rc.6 \
 amazon-cognito-identity-js \
 @coinbase/wallet-mobile-sdk \
 react-native-mmkv \
 react-native-svg \
 @walletconnect/react-native-compat \
 react-native-passkey \
 stream-browserify \
 buffer \
 process \
 vm-browserify \
 os-browserify \
 path-browserify \
 url \
 util \
 assert \
 events \
 querystring-es3 \
 stream-http \
 https-browserify \
 browserify-zlib

npm install --save-dev babel-plugin-module-resolver
Penjelasan Dependensi Kunci 1@metamask/sdk-react: SDK MetaMask resmi untuk aplikasi React, memungkinkan koneksi dompet langsung.@thirdweb-dev/react-native: Paket spesifik React Native dari Thirdweb, menyediakan komponen UI dan hook.@thirdweb-dev/sdk: SDK inti Thirdweb untuk berinteraksi dengan kontrak pintar, IPFS, dll.ethers@5.7.2: Pustaka fundamental untuk berinteraksi dengan blockchain Ethereum. Versi 5.7.2 ditentukan untuk kompatibilitas.react-native-get-random-values: Menyediakan generator angka acak yang aman secara kriptografis, penting untuk banyak operasi kripto.@react-native-community/netinfo: Untuk memeriksa konektivitas jaringan.expo-application: Memberikan akses ke informasi aplikasi.@react-native-async-storage/async-storage: Penyimpanan nilai-kunci persisten untuk React Native.expo-web-browser: Untuk membuka halaman web di browser, sering digunakan untuk alur OAuth atau koneksi dompet.expo-linking: Untuk menangani deep link, penting untuk pengalihan dompet.react-native-aes-gcm-crypto, react-native-quick-crypto, amazon-cognito-identity-js: Pustaka kriptografi dan alat manajemen identitas, sering digunakan oleh SDK dompet.@coinbase/wallet-mobile-sdk, react-native-mmkv, react-native-svg, @walletconnect/react-native-compat, react-native-passkey: Dependensi tambahan untuk berbagai konektor dompet, penyimpanan, UI, dan metode otentikasi yang mungkin digunakan atau didukung oleh Thirdweb secara internal.Polyfills Node.js: stream-browserify, buffer, process, vm-browserify, os-browserify, path-browserify, url, util, assert, events, querystring-es3, stream-http, https-browserify, browserify-zlib. Paket-paket ini menyediakan versi modul inti Node.js yang kompatibel dengan browser yang sering diandalkan oleh ethers.js dan pustaka web3 lainnya. Tanpa ini, aplikasi Anda kemungkinan besar akan mogok dengan kesalahan runtime terkait modul yang hilang.Langkah 3: Konfigurasi Metro untuk Polyfills dan Resolusi ModulMetro adalah bundler JavaScript untuk React Native. Kita perlu mengkonfigurasinya untuk menyelesaikan polyfill Node.js dengan benar dan menangani ekspor paket. Jika Anda belum memiliki file metro.config.js, Anda dapat membuatnya dengan menjalankan 1:Bashnpx expo customize metro.config.js
Kemudian, perbarui file metro.config.js Anda dengan konten berikut. Konfigurasi ini memastikan bahwa Metro menggunakan polyfill yang disediakan untuk modul inti Node.js dan menyelesaikan ekspor bernama dari paket dengan benar.1metro.config.jsJavaScriptconst { getDefaultConfig } = require("expo/metro-config");

const defaultConfig = getDefaultConfig(\_\_dirname);

const config = {
transformer: {
getTransformOptions: async () => ({
transform: {
experimentalImportSupport: false,
inlineRequires: true,
},
}),
},
resolver: {
extraNodeModules: {
...require("node-libs-react-native"),
crypto: require.resolve("react-native-quick-crypto"),
stream: require.resolve("stream-browserify"),
buffer: require.resolve("buffer"),
//...tambahkan polyfill lain yang diperlukan di sini
},
// TAMBAHKAN 2 PROPERTI INI untuk kompatibilitas Thirdweb
unstable_enablePackageExports: true,
unstable_conditionNames: ["react-native", "browser", "require"],
},
};

module.exports = require("merge-config")(defaultConfig, config);
Langkah 4: Konfigurasi Babel untuk Alias ModulBabel digunakan untuk mentranspilasi kode JavaScript Anda. Kita perlu mengkonfigurasinya untuk menyelesaikan alias modul dengan benar, terutama untuk crypto, stream, dan buffer, yang seringkali bermasalah di lingkungan React Native.1babel.config.jsJavaScriptmodule.exports = function (api) {
api.cache(true);
return {
presets: ["babel-preset-expo"],
plugins: [
"module-resolver",
{
alias: {
crypto: "react-native-quick-crypto",
stream: "stream-browserify",
buffer: "buffer",
},
},
],
};
};
Langkah 5: Perbarui app.json untuk Modul NativeUbah app.json Anda untuk menyertakan konfigurasi yang diperlukan untuk iOS dan Android, memastikan kompatibilitas dengan MetaMask SDK dan modul native lainnya. Perhatikan baik-baik bundleIdentifier untuk kedua platform, karena ini harus unik untuk aplikasi Anda. Selain itu, react-native-aes-gcm-crypto memerlukan versi SDK minimum 26 untuk Android.1app.jsonJSON{
"expo": {
"name": "MetaMask Thirdweb App",
"slug": "metamask-thirdweb-app",
"version": "1.0.0",
"orientation": "portrait",
"icon": "./assets/icon.png",
"userInterfaceStyle": "light",
"splash": {
"image": "./assets/splash.png",
"resizeMode": "contain",
"backgroundColor": "#ffffff"
},
"assetBundlePatterns": [
"**/*"
],
"ios": {
"supportsTablet": true,
"bundleIdentifier": "com.yourcompany.metamaskthirdwebapp", // GANTI INI
"extra": {
"pods":
}
},
"android": {
"adaptiveIcon": {
"foregroundImage": "./assets/adaptive-icon.png",
"backgroundColor": "#FFFFFF"
},
"package": "com.yourcompany.metamaskthirdwebapp", // GANTI INI
"minSdkVersion": 26 // Diperlukan untuk react-native-aes-gcm-crypto
},
"web": {
"favicon": "./assets/favicon.png"
},
"plugins":
}
}
Langkah 6: Siapkan Variabel Lingkungan (.env)Buat file .env di root proyek Anda untuk menyimpan informasi sensitif dan detail konfigurasi. Ini sangat penting untuk keamanan dan pengelolaan lingkungan yang berbeda dengan mudah. Ingatlah untuk menambahkan .env ke file .gitignore Anda untuk mencegahnya di-commit ke kontrol versi.1.envEXPO_PUBLIC_THIRDWEB_CLIENT_ID=95f0edae49127ccece18944a63b29320
EXPO_PUBLIC_CONTRACT_ADDRESS=your_smart_contract_address_here # Ganti dengan alamat kontrak Anda yang sebenarnya
EXPO_PUBLIC_CHAIN_ID=3441005 # ID Rantai Manta Pacific Testnet (desimal)
EXPO_PUBLIC_ETHEREUM_RPC_URL=https://pacific-rpc.testnet.manta.network/websocket # RPC Manta Pacific Testnet

# Opsional: Jika Anda memerlukan Livepeer untuk streaming video (tidak terkait langsung dengan integrasi dompet/thirdweb)

NEXT_PUBLIC_LIVEPEER_API_KEY=5c3537cc-6809-4a12-8e8a-67549cce15ad
Langkah 7: Tambahkan Polyfills Global di App.jsUntuk memastikan kompatibilitas dengan modul Node.js tertentu yang digunakan oleh ethers.js dan pustaka lainnya, tambahkan polyfill global di bagian paling atas file App.js Anda. Ini adalah praktik umum dalam pengembangan blockchain React Native. Juga, impor @thirdweb-dev/react-native-adapter di bagian paling atas seperti yang direkomendasikan oleh dokumentasi Thirdweb. Penempatan impor ini sangat penting dan dapat mencegah kesalahan runtime yang sulit di-debug.1App.js (pengaturan awal)JavaScript// Ini harus diimpor sebelum yang lain, sesuai dokumentasi Thirdweb
import "@thirdweb-dev/react-native-adapter";
import "react-native-get-random-values";
import { Buffer } from "buffer";

// Polyfills global HARUS berada di bagian paling atas setelah adapter thirdweb
global.Buffer = Buffer;

// Impor lain di bawah ini
import React from "react";
import {
SafeAreaView,
ScrollView,
StatusBar,
StyleSheet,
Text,
View,
} from "react-native";

// Kita akan menambahkan komponen-komponen ini nanti
// import WalletConnection from "./src/components/WalletConnection";
// import MintingComponent from "./src/components/MintingComponent";
// import IPFSUpload from "./src/components/IPFSUpload";

const App = () => {
return (
<SafeAreaView style={styles.container}>
<StatusBar barStyle="dark-content" backgroundColor="#fff" />
<ScrollView contentInsetAdjustmentBehavior="automatic">
<View style={styles.header}>
<Text style={styles.headerTitle}>MetaMask + Thirdweb App</Text>
<Text style={styles.headerSubtitle}>
Terhubung dengan MetaMask, berinteraksi dengan Thirdweb
</Text>
</View>
{/_ Komponen Anda akan ditempatkan di sini _/}
</ScrollView>
</SafeAreaView>
);
};

const styles = StyleSheet.create({
container: {
backgroundColor: "#fff",
flex: 1,
},
header: {
padding: 20,
alignItems: "center",
backgroundColor: "#f8f9fa",
},
headerTitle: {
fontSize: 28,
fontWeight: "bold",
color: "#333",
marginBottom: 5,
},
headerSubtitle: {
fontSize: 16,
color: "#666",
textAlign: "center",
},
});

export default App;
Langkah 8: Prebuild dan Jalankan AplikasiKarena MetaMask SDK dan Thirdweb menggunakan modul native, Anda perlu melakukan prebuild pada proyek Expo Anda. Langkah ini menghasilkan file proyek native iOS dan Android berdasarkan app.json dan dependensi yang terinstal. Peringatan bahwa Expo Go tidak didukung adalah pengetahuan "tribal" yang penting yang dapat menghemat waktu debugging berjam-jam bagi pengembang; ini adalah wawasan yang lahir dari pengalaman, bukan dari sekadar membaca dokumentasi.1Catatan: Expo Go tidak didukung untuk pengaturan ini karena konflik dengan modul native. Anda harus menggunakan build pengembangan.Pertama, prebuild proyek Anda (hanya diperlukan sekali atau ketika dependensi native berubah) 1:Bashnpx expo prebuild
Kemudian, jalankan build pengembangan di platform target Anda 1:Bash# Untuk iOS
npx expo run:ios

# Untuk Android

npx expo run:android
Jika Expo CLI mengatakan "Using Expo Go" saat memulai aplikasi, tekan s untuk beralih ke build pengembangan.Langkah 9: Instal Dependensi iOS (jika menargetkan iOS)Jika Anda mengembangkan untuk iOS, navigasikan ke direktori ios dan instal dependensi CocoaPods. Ini penting untuk menautkan modul native. Pastikan Anda telah menginstal CocoaPods (sudo gem install cocoapods).1Bashcd ios && pod install && cd.. 5. Integrasi MetaMask SDKBagian ini merinci implementasi MetaMask SDK untuk menangani koneksi dompet. Kami akan membuat layanan khusus dan hook React untuk tujuan ini. Arsitektur ini mengimplementasikan solusi manajemen state kustom yang ringan menggunakan layanan singleton dan event emitter sederhana. Ini adalah pilihan arsitektur yang disengaja untuk menghindari penarikan pustaka yang lebih berat seperti Redux atau Zustand untuk satu masalah, menjaga integrasi tetap mandiri dan ringan dependensi.15.1: Layanan MetaMask (src/services/metamaskService.js)Layanan ini menangani inisialisasi MetaMask SDK, koneksi, pemutusan, dan interaksi dengan dompet yang terhubung. Ini diekspor sebagai new MetaMaskService(), memastikan hanya satu instance yang ada di seluruh aplikasi (pola Singleton). Ia juga menyediakan instance provider dan signer ethers.js yang akan digunakan oleh Thirdweb SDK. Layanan ini berisi implementasi event bus sendiri dengan metode on, off, dan emit, yang merupakan tanda jelas dari solusi kustom yang mandiri.1JavaScriptimport { MetaMaskSDK } from "@metamask/sdk-react";
import { ethers } from "ethers";

class MetaMaskService {
constructor() {
this.sdk = null;
this.provider = null;
this.signer = null;
this.account = null;
this.chainId = null;
this.eventListeners = {}; // Bus acara sederhana untuk komunikasi internal
}

// Inisialisasi MetaMask SDK
initializeSDK(sdkOptions = {}) {
const defaultOptions = {
dappMetadata: {
name: "MetaMask Thirdweb App",
url: "https://your-app-url.com", // Ganti dengan URL aplikasi Anda
iconUrl: "https://your-app-url.com/icon.png", // Ganti dengan ikon aplikasi Anda
},
// Gunakan EXPO_PUBLIC_ETHEREUM_RPC_URL untuk Manta Pacific Testnet
readonlyRPCMap: {
:
process.env.EXPO_PUBLIC_ETHEREUM_RPC_URL,
},
debug: **DEV**, // Aktifkan mode debug dalam pengembangan
...sdkOptions,
};
this.sdk = new MetaMaskSDK(defaultOptions);
return this.sdk;
}

// Terhubung ke MetaMask
async connect() {
try {
if (!this.sdk) {
throw new Error("SDK tidak diinisialisasi. Panggil initializeSDK terlebih dahulu.");
}
const accounts = await this.sdk.connect();
if (accounts && accounts.length > 0) {
this.account = accounts;
this.provider = this.sdk.getProvider();

        // Buat provider dan signer ethers dari provider MetaMask
        const ethersProvider = new ethers.providers.Web3Provider(this.provider);
        this.signer = ethersProvider.getSigner();

        // Dapatkan ID rantai saat ini
        this.chainId = await this.provider.request({ method: "eth_chainId" });

        // Siapkan pendengar acara untuk perubahan akun dan rantai
        this.setupEventListeners();
        this.emit("accountsChanged", accounts); // Kirim acara internal
        this.emit("chainChanged", this.chainId); // Kirim acara internal

        return {
          account: this.account,
          chainId: this.chainId,
          provider: this.provider,
          signer: this.signer,
        };
      }
      throw new Error("Tidak ada akun yang dikembalikan dari koneksi MetaMask.");
    } catch (error) {
      console.error("Gagal terhubung ke MetaMask:", error);
      throw error;
    }

}

// Putuskan koneksi dari MetaMask
async disconnect() {
try {
if (this.sdk) {
await this.sdk.disconnect();
}
this.clearState();
this.emit("disconnected"); // Kirim acara internal
} catch (error) {
console.error("Gagal memutuskan koneksi dari MetaMask:", error);
throw error;
}
}

// Periksa apakah MetaMask saat ini terhubung
isConnected() {
return this.sdk?.isConnected() |
| false;
}

// Dapatkan alamat akun yang saat ini terhubung
getAccount() {
return this.account;
}

// Dapatkan ID rantai yang saat ini terhubung
getChainId() {
return this.chainId;
}

// Dapatkan instance provider Web3 dari MetaMask SDK
getProvider() {
return this.provider;
}

// Dapatkan instance Signer ethers.js
getSigner() {
return this.signer;
}

// Minta MetaMask untuk beralih ke jaringan yang berbeda
async switchNetwork(chainId) {
try {
if (!this.provider) {
throw new Error("Provider MetaMask tidak tersedia. Hubungkan dompet terlebih dahulu.");
}
await this.provider.request({
method: "wallet_switchEthereumChain",
params: [{ chainId }],
});
this.chainId = chainId; // Perbarui state internal
this.emit("chainChanged", this.chainId); // Kirim acara internal
return chainId;
} catch (error) {
console.error("Gagal beralih jaringan:", error);
throw error;
}
}

// Minta MetaMask untuk menambahkan jaringan baru
async addNetwork(networkConfig) {
try {
if (!this.provider) {
throw new Error("Provider MetaMask tidak tersedia. Hubungkan dompet terlebih dahulu.");
}
await this.provider.request({
method: "wallet_addEthereumChain",
params: [networkConfig],
});
} catch (error) {
console.error("Gagal menambahkan jaringan:", error);
throw error;
}
}

// Tandatangani pesan menggunakan dompet yang terhubung
async signMessage(message) {
try {
if (!this.signer) {
throw new Error("Signer Ethers.js tidak tersedia. Hubungkan dompet terlebih dahulu.");
}
return await this.signer.signMessage(message);
} catch (error) {
console.error("Gagal menandatangani pesan:", error);
throw error;
}
}

// Kirim transaksi menggunakan dompet yang terhubung
async sendTransaction(transactionRequest) {
try {
if (!this.signer) {
throw new Error("Signer Ethers.js tidak tersedia. Hubungkan dompet terlebih dahulu.");
}
const tx = await this.signer.sendTransaction(transactionRequest);
return tx; // Mengembalikan respons transaksi
} catch (error) {
console.error("Gagal mengirim transaksi:", error);
throw error;
}
}

// Siapkan pendengar acara untuk acara provider MetaMask
setupEventListeners() {
if (!this.provider) return;

    this.provider.on("accountsChanged", (accounts) => {
      if (accounts.length === 0) {
        this.clearState();
        this.emit("disconnected");
        console.log("Akun MetaMask berubah: terputus");
      } else {
        this.account = accounts;
        this.emit("accountsChanged", accounts);
        console.log("Akun MetaMask berubah menjadi:", this.account);
      }
    });

    this.provider.on("chainChanged", (chainId) => {
      this.chainId = chainId;
      this.emit("chainChanged", this.chainId);
      console.log("Rantai MetaMask berubah menjadi:", this.chainId);
    });

    this.provider.on("disconnect", (error) => {
      this.clearState();
      this.emit("disconnected");
      console.log("MetaMask terputus:", error);
    });

    this.provider.on("connect", (info) => {
      console.log("MetaMask terhubung:", info);
      this.emit("connected", info);
    });

}

// Bersihkan variabel state internal saat terputus
clearState() {
this.account = null;
this.chainId = null;
this.provider = null;
this.signer = null;
}

// Metode pemancar acara sederhana
on(eventName, listener) {
if (!this.eventListeners[eventName]) {
this.eventListeners[eventName] =;
}
this.eventListeners[eventName].push(listener);
}

off(eventName, listener) {
if (!this.eventListeners[eventName]) return;
this.eventListeners[eventName] = this.eventListeners[eventName].filter(
(l) => l!== listener
);
}

emit(eventName, data) {
if (!this.eventListeners[eventName]) return;
this.eventListeners[eventName].forEach((listener) => listener(data));
}
}

export default new MetaMaskService();
5.2: Hook MetaMask (src/hooks/useMetaMask.js)Hook React kustom ini menyediakan cara yang nyaman bagi komponen React untuk berinteraksi dengan MetaMaskService. Ini mengelola state koneksi, akun, ID rantai, dan mengekspos fungsi untuk menghubungkan, memutuskan, dan melakukan operasi dompet. Ini juga berlangganan acara internal MetaMaskService untuk menjaga state-nya tetap sinkron, secara efektif mengisolasi logika bisnis mentah di layanan dari logika presentasi khusus React di hook.1JavaScriptimport { useState, useEffect, useCallback } from "react";
import MetaMaskService from "../services/metamaskService";

export const useMetaMask = () => {
const [isConnected, setIsConnected] = useState(MetaMaskService.isConnected());
const [account, setAccount] = useState(MetaMaskService.getAccount());
const [chainId, setChainId] = useState(MetaMaskService.getChainId());
const [isConnecting, setIsConnecting] = useState(false);
const [error, setError] = useState(null);

useEffect(() => {
// Inisialisasi SDK saat komponen dipasang (aman untuk dipanggil berkali-kali)
MetaMaskService.initializeSDK();

    // Siapkan pendengar untuk perubahan state dari layanan
    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        setIsConnected(false);
        setAccount(null);
        setChainId(null);
      } else {
        setIsConnected(true);
        setAccount(accounts);
      }
    };

    const handleChainChanged = (newChainId) => {
      setChainId(newChainId);
    };

    const handleDisconnected = () => {
      setIsConnected(false);
      setAccount(null);
      setChainId(null);
    };

    const handleConnected = () => {
      setIsConnected(true);
      setAccount(MetaMaskService.getAccount());
      setChainId(MetaMaskService.getChainId());
    };

    MetaMaskService.on("accountsChanged", handleAccountsChanged);
    MetaMaskService.on("chainChanged", handleChainChanged);
    MetaMaskService.on("disconnected", handleDisconnected);
    MetaMaskService.on("connected", handleConnected);

    // Bersihkan pendengar saat komponen dilepas
    return () => {
      MetaMaskService.off("accountsChanged", handleAccountsChanged);
      MetaMaskService.off("chainChanged", handleChainChanged);
      MetaMaskService.off("disconnected", handleDisconnected);
      MetaMaskService.off("connected", handleConnected);
    };

},);

// Fungsi connect: memulai koneksi melalui MetaMaskService
const connect = useCallback(async () => {
try {
setIsConnecting(true);
setError(null);
const result = await MetaMaskService.connect();
// State akan diperbarui oleh pendengar acara, tidak perlu diatur di sini
return result;
} catch (err) {
setError(err.message);
throw err;
} finally {
setIsConnecting(false);
}
},);

// Fungsi disconnect: memutuskan koneksi melalui MetaMaskService
const disconnect = useCallback(async () => {
try {
await MetaMaskService.disconnect();
// State akan diperbarui oleh pendengar acara, tidak perlu diatur di sini
setError(null);
} catch (err) {
setError(err.message);
throw err;
}
},);

// Fungsi switch network: meminta pergantian jaringan melalui MetaMaskService
const switchNetwork = useCallback(async (targetChainId) => {
try {
setError(null);
const result = await MetaMaskService.switchNetwork(targetChainId);
// State akan diperbarui oleh pendengar acara, tidak perlu diatur di sini
return result;
} catch (err) {
setError(err.message);
throw err;
}
},);

// Fungsi sign message: meminta penandatanganan pesan melalui MetaMaskService
const signMessage = useCallback(async (message) => {
try {
setError(null);
return await MetaMaskService.signMessage(message);
} catch (err) {
setError(err.message);
throw err;
}
},);

// Fungsi send transaction: meminta pengiriman transaksi melalui MetaMaskService
const sendTransaction = useCallback(async (transactionRequest) => {
try {
setError(null);
return await MetaMaskService.sendTransaction(transactionRequest);
} catch (err) {
setError(err.message);
throw err;
}
},);

return {
isConnected,
account,
chainId,
isConnecting,
error,
connect,
disconnect,
switchNetwork,
signMessage,
sendTransaction,
provider: MetaMaskService.getProvider(), // Ekspos provider untuk Thirdweb
signer: MetaMaskService.getSigner(), // Ekspos signer untuk penggunaan langsung jika diperlukan
};
}; 6. Integrasi Thirdweb SDKBagian ini berfokus pada integrasi Thirdweb SDK, memastikan ia menggunakan provider dan signer yang diperoleh dari MetaMask SDK. Keberhasilan integrasi bergantung pada komposabilitas SDK dan hook. Hook useThirdweb bergantung pada useMetaMask, menciptakan aliran data yang jelas dan reaktif. Thirdweb SDK hanya diinisialisasi setelah MetaMask berhasil terhubung, mencegah kondisi balapan dan memastikan SDK selalu memiliki signer yang diperlukan.16.1: Layanan Thirdweb (src/services/thirdwebService.js)Layanan ini merangkum semua interaksi Thirdweb SDK, termasuk inisialisasi kontrak, unggahan IPFS, dan pencetakan NFT. Metode initializeSDK-nya adalah jembatan kritis, mengambil provider dan chainId dari MetaMask untuk menginisialisasi SDK-nya.1JavaScriptimport { ThirdwebSDK } from "@thirdweb-dev/sdk";
import { ethers } from "ethers";

class ThirdwebService {
constructor() {
this.sdk = null;
this.contract = null;
this.storage = null;
}

// Inisialisasi Thirdweb SDK dengan provider dan ID rantai MetaMask
async initializeSDK(provider, chainId) {
try {
if (!provider) {
throw new Error("Provider MetaMask diperlukan untuk menginisialisasi Thirdweb SDK.");
}

      // Buat provider dan signer ethers dari provider MetaMask
      const ethersProvider = new ethers.providers.Web3Provider(provider);
      const signer = ethersProvider.getSigner();

      // Inisialisasi Thirdweb SDK menggunakan signer dan ID klien
      // Pastikan chainId dalam format yang benar (misalnya, desimal atau string hex)
      this.sdk = ThirdwebSDK.fromSigner(signer, parseInt(chainId, 16), { // Konversi chainId hex ke desimal
        clientId: process.env.EXPO_PUBLIC_THIRDWEB_CLIENT_ID, // ID Klien Thirdweb Anda
      });

      // Inisialisasi penyimpanan untuk operasi IPFS
      this.storage = this.sdk.storage;
      console.log("Thirdweb SDK berhasil diinisialisasi dengan provider MetaMask.");
      return this.sdk;
    } catch (error) {
      console.error("Gagal menginisialisasi Thirdweb SDK:", error);
      throw error;
    }

}

// Dapatkan instance kontrak dari Thirdweb SDK
async getContract(contractAddress, contractType = "custom") {
try {
if (!this.sdk) {
throw new Error("Thirdweb SDK tidak diinisialisasi. Hubungkan dompet terlebih dahulu.");
}
this.contract = await this.sdk.getContract(contractAddress, contractType);
return this.contract;
} catch (error) {
console.error(`Gagal mendapatkan kontrak di ${contractAddress}:`, error);
throw error;
}
}

// Unggah data ke IPFS menggunakan penyimpanan Thirdweb
async uploadToIPFS(data) {
try {
if (!this.storage) {
throw new Error("Penyimpanan Thirdweb tidak diinisialisasi.");
}
const uri = await this.storage.upload(data);
console.log("Diunggah ke IPFS, URI:", uri);
return uri;
} catch (error) {
console.error("Gagal mengunggah ke IPFS:", error);
throw error;
}
}

// Cetak NFT menggunakan SDK kontrak Thirdweb
async mintNFT(contractAddress, metadata) {
try {
const contract = await this.getContract(contractAddress, "nft-collection");
// Fungsi mint Thirdweb dapat langsung mengambil objek metadata, ia menangani unggahan IPFS secara internal
const tx = await contract.mint(metadata);
console.log("NFT berhasil dicetak:", tx);
return tx; // Mengembalikan tanda terima transaksi dan metadata
} catch (error) {
console.error("Gagal mencetak NFT:", error);
throw error;
}
}

// Cetak NFT ke alamat tertentu
async mintNFTTo(contractAddress, toAddress, metadata) {
try {
const contract = await this.getContract(contractAddress, "nft-collection");
const tx = await contract.mintTo(toAddress, metadata);
console.log(`NFT berhasil dicetak ke ${toAddress}:`, tx);
return tx;
} catch (error) {
console.error(`Gagal mencetak NFT ke ${toAddress}:`, error);
throw error;
}
}

// Dapatkan semua NFT yang dimiliki oleh sebuah alamat
async getOwnedNFTs(contractAddress, walletAddress) {
try {
const contract = await this.getContract(contractAddress, "nft-collection");
const nfts = await contract.getOwned(walletAddress);
console.log(`NFT yang dimiliki oleh ${walletAddress}:`, nfts);
return nfts;
} catch (error) {
console.error("Gagal mendapatkan NFT yang dimiliki:", error);
throw error;
}
}

// Bersihkan instance SDK dan state terkait saat terputus
clearSDK() {
this.sdk = null;
this.contract = null;
this.storage = null;
console.log("State Thirdweb SDK dibersihkan.");
}

// Dapatkan instance Thirdweb SDK saat ini
getSDK() {
return this.sdk;
}

// Dapatkan instance penyimpanan Thirdweb saat ini (untuk akses IPFS langsung)
getStorage() {
return this.storage;
}
}

export default new ThirdwebService();
6.2: Hook Thirdweb (src/hooks/useThirdweb.js)Hook kustom ini menyediakan antarmuka yang nyaman bagi komponen React untuk berinteraksi dengan ThirdwebService. Hook useEffect yang menginisialisasi ThirdwebService memiliki [isConnected, provider, chainId] dalam array dependensinya. Ini berarti efek akan berjalan kembali setiap kali status koneksi dompet, rantai yang terhubung, atau instance provider berubah. Ini secara terprogram memberlakukan aturan arsitektur: state Thirdweb selalu berasal dari dan reaktif terhadap state MetaMask.1JavaScriptimport { useState, useEffect, useCallback } from "react";
import ThirdwebService from "../services/thirdwebService";
import { useMetaMask } from "./useMetaMask"; // Impor hook MetaMask

export const useThirdweb = () => {
const { provider, chainId, isConnected } = useMetaMask(); // Dapatkan state MetaMask
const [isInitialized, setIsInitialized] = useState(false);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState(null);

// Inisialisasi Thirdweb SDK saat MetaMask terhubung atau provider/chainId-nya berubah
useEffect(() => {
const initializeThirdweb = async () => {
if (isConnected && provider && chainId) {
try {
setIsLoading(true);
setError(null);
await ThirdwebService.initializeSDK(provider, chainId);
setIsInitialized(true);
} catch (err) {
setError(err.message);
setIsInitialized(false);
} finally {
setIsLoading(false);
}
} else {
// Bersihkan state Thirdweb SDK jika MetaMask terputus
ThirdwebService.clearSDK();
setIsInitialized(false);
}
};
initializeThirdweb();
}, [isConnected, provider, chainId]); // Jalankan kembali saat dependensi ini berubah

// Unggah data ke IPFS
const uploadToIPFS = useCallback(async (data) => {
try {
setError(null);
return await ThirdwebService.uploadToIPFS(data);
} catch (err) {
setError(err.message);
throw err;
}
},);

// Unggah metadata JSON ke IPFS
const uploadMetadata = useCallback(async (metadata) => {
try {
setError(null);
return await ThirdwebService.uploadMetadata(metadata);
} catch (err) {
setError(err.message);
throw err;
}
},);

// Cetak NFT
const mintNFT = useCallback(async (contractAddress, metadata) => {
try {
setIsLoading(true);
setError(null);
const result = await ThirdwebService.mintNFT(contractAddress, metadata);
return result;
} catch (err) {
setError(err.message);
throw err;
} finally {
setIsLoading(false);
}
},);

// Cetak NFT ke alamat tertentu
const mintNFTTo = useCallback(async (contractAddress, toAddress, metadata) => {
try {
setIsLoading(true);
setError(null);
const result = await ThirdwebService.mintNFTTo(contractAddress, toAddress, metadata);
return result;
} catch (err) {
setError(err.message);
throw err;
} finally {
setIsLoading(false);
}
},);

return {
isInitialized,
isLoading,
error,
uploadToIPFS,
uploadMetadata,
mintNFT,
mintNFTTo,
sdk: ThirdwebService.getSDK(), // Ekspos instance SDK jika diperlukan untuk penggunaan lanjutan
storage: ThirdwebService.getStorage(), // Ekspos instance penyimpanan untuk penggunaan IPFS langsung
};
}; 7. Mengatur Integrasi: The IntegrationServiceLapisan ini menunjukkan pola desain Facade. Tujuannya adalah untuk menyediakan antarmuka yang disederhanakan dan terpadu ke subsistem yang lebih kompleks. Dengan membuat lapisan ini, pengembang UI dapat membuat komponen yang jauh lebih sederhana, karena mereka tidak perlu mengelola proses dua langkah menghubungkan dompet dan kemudian menginisialisasi SDK lain. Ini adalah tanda desain perangkat lunak yang matang, berfokus pada pengalaman pengembang dan mengurangi beban kognitif bagi penulis komponen.17.1: Layanan Integrasi (src/services/integrationService.js)Layanan ini bertanggung jawab untuk menginisialisasi MetaMask dan Thirdweb SDK, mengelola state mereka yang saling terhubung, dan menyediakan fungsi komposit. Metode connect merangkum urutan: await MetaMaskService.connect() diikuti oleh await ThirdwebService.initializeSDK(). Metode mintCertification adalah "fungsi komposit" yang menyediakan API tingkat bisnis (certificationData) daripada API tingkat rendah (metadata). Seorang pengembang komponen sekarang dapat dengan mudah mengimpor useIntegration dan memanggil connect() atau mintCertification(), tanpa perlu mengetahui bahwa dua layanan terpisah sedang dikoordinasikan di belakang layar.1JavaScriptimport MetaMaskService from "./metamaskService";
import ThirdwebService from "./thirdwebService";

class IntegrationService {
constructor() {
this.isConnected = false; // Status koneksi integrasi keseluruhan
this.listeners = {}; // Untuk penanganan acara internal
}

// Inisialisasi integrasi lengkap: MetaMask SDK dan siapkan pendengar
async initialize() {
try {
MetaMaskService.initializeSDK();
this.setupConnectionListener();
console.log("Layanan integrasi diinisialisasi.");
return true;
} catch (error) {
console.error("Gagal menginisialisasi layanan integrasi:", error);
throw error;
}
}

// Hubungkan MetaMask dan kemudian inisialisasi Thirdweb dengan provider MetaMask
async connect() {
try {
const metamaskResult = await MetaMaskService.connect();
await ThirdwebService.initializeSDK(
metamaskResult.provider,
metamaskResult.chainId
);
this.isConnected = true;
this.notifyListeners("connected", metamaskResult);
console.log("MetaMask dan Thirdweb terintegrasi dan terhubung.");
return metamaskResult;
} catch (error) {
console.error("Gagal menghubungkan integrasi:", error);
this.disconnect();
throw error;
}
}

// Putuskan kedua layanan dan bersihkan state mereka
async disconnect() {
try {
await MetaMaskService.disconnect();
ThirdwebService.clearSDK();
this.isConnected = false;
this.notifyListeners("disconnected");
console.log("MetaMask dan Thirdweb terputus.");
} catch (error) {
console.error("Gagal memutuskan integrasi:", error);
throw error;
}
}

// Dapatkan status koneksi saat ini dari integrasi keseluruhan
getConnectionStatus() {
return {
isConnected: this.isConnected,
metamaskConnected: MetaMaskService.isConnected(),
thirdwebInitialized:!!ThirdwebService.getSDK(),
};
}

// Contoh fungsi komposit: Cetak sertifikasi NFT
async mintCertification(contractAddress, certificationData) {
try {
if (!this.isConnected) {
throw new Error("Tidak terhubung ke dompet. Harap hubungkan sebelum mencetak.");
}
const metadata = {
name: `Sertifikasi: ${certificationData.title}`,
description: certificationData.description,
image: certificationData.imageUrl,
attributes: {
certificationType: certificationData.type,
issuedTo: certificationData.recipient,
issuedBy: certificationData.issuer,
issuedDate: new Date().toISOString(),
...certificationData.additionalAttributes,
},
};
const result = await ThirdwebService.mintNFT(contractAddress, metadata);
console.log("Sertifikasi NFT dicetak:", result);
return {...result, metadata };
} catch (error) {
console.error("Gagal mencetak sertifikasi:", error);
throw error;
}
}

// Siapkan pendengar acara untuk perubahan MetaMask untuk menginisialisasi ulang Thirdweb
setupConnectionListener() {
MetaMaskService.on("accountsChanged", async (accounts) => {
if (accounts.length === 0) {
await this.disconnect();
} else {
const provider = MetaMaskService.getProvider();
const chainId = MetaMaskService.getChainId();
if (provider && chainId) {
await ThirdwebService.initializeSDK(provider, chainId);
this.isConnected = true;
this.notifyListeners("connected", { account: accounts, chainId });
}
}
});

    MetaMaskService.on("chainChanged", async (chainId) => {
      const provider = MetaMaskService.getProvider();
      if (provider) {
        await ThirdwebService.initializeSDK(provider, chainId);
        this.isConnected = true;
        this.notifyListeners("connected", { account: MetaMaskService.getAccount(), chainId });
      }
    });

    MetaMaskService.on("disconnected", () => {
      this.disconnect();
    });

}

// Metode pemancar acara sederhana
on(eventName, listener) {
if (!this.listeners[eventName]) {
this.listeners[eventName] =;
}
this.listeners[eventName].push(listener);
}

off(eventName, listener) {
if (!this.listeners[eventName]) return;
this.listeners[eventName] = this.listeners[eventName].filter((l) => l!== listener);
}

notifyListeners(eventName, data) {
if (!this.listeners[eventName]) return;
this.listeners[eventName].forEach((listener) => listener(data));
}
}

export default new IntegrationService();
7.2: Hook Integrasi (src/hooks/useIntegration.js)Hook React kustom ini memberikan akses komponen utama aplikasi ke IntegrationService. Ini mengelola status koneksi keseluruhan dan mengekspos fungsi tingkat tinggi untuk berinteraksi dengan MetaMask dan Thirdweb. Ini berlangganan acara internal IntegrationService untuk menjaga state-nya tetap sinkron.1JavaScriptimport { useState, useEffect, useCallback } from "react";
import IntegrationService from "../services/integrationService";

export const useIntegration = () => {
const = useState(
IntegrationService.getConnectionStatus()
);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState(null);

useEffect(() => {
const initializeIntegration = async () => {
try {
await IntegrationService.initialize();
updateConnectionStatus();
} catch (err) {
setError(err.message);
}
};
initializeIntegration();

    const handleConnected = () => updateConnectionStatus();
    const handleDisconnected = () => updateConnectionStatus();

    IntegrationService.on("connected", handleConnected);
    IntegrationService.on("disconnected", handleDisconnected);

    return () => {
      IntegrationService.off("connected", handleConnected);
      IntegrationService.off("disconnected", handleDisconnected);
    };

},);

const updateConnectionStatus = useCallback(() => {
const status = IntegrationService.getConnectionStatus();
setConnectionStatus(status);
},);

const connect = useCallback(async () => {
try {
setIsLoading(true);
setError(null);
const result = await IntegrationService.connect();
return result;
} catch (err) {
setError(err.message);
throw err;
} finally {
setIsLoading(false);
}
},);

const disconnect = useCallback(async () => {
try {
setError(null);
await IntegrationService.disconnect();
} catch (err) {
setError(err.message);
throw err;
}
},);

const mintCertification = useCallback(async (contractAddress, certificationData) => {
try {
setIsLoading(true);
setError(null);
const result = await IntegrationService.mintCertification(
contractAddress,
certificationData
);
return result;
} catch (err) {
setError(err.message);
throw err;
} finally {
setIsLoading(false);
}
},);

return {
connectionStatus,
isLoading,
error,
connect,
disconnect,
mintCertification,
};
}; 8. Komponen React NativeKesederhanaan komponen-komponen ini adalah bukti utama keberhasilan arsitektur. Logika UI dipisahkan dengan bersih dari logika Web3 yang kompleks, menghasilkan komponen yang deklaratif, mudah dibaca, dan hanya berfokus pada penyajian UI dan penanganan acara pengguna. Misalnya, fungsi handleMint di MintingComponent.js melakukan beberapa validasi dasar dan kemudian membuat satu panggilan: await mintNFT(contractAddress, metadata). Semua kompleksitas mendapatkan signer, menginisialisasi SDK, mengunggah metadata ke IPFS, dan memanggil kontrak pintar disembunyikan di balik satu panggilan fungsi dari hook useThirdweb.18.1: Komponen Koneksi Dompet (src/components/WalletConnection.js)Komponen ini menyediakan antarmuka pengguna untuk menghubungkan dan memutuskan koneksi dari dompet MetaMask, dan menampilkan informasi akun dan jaringan yang terhubung. Ini menggunakan hook useMetaMask.1JavaScriptimport React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useMetaMask } from "../hooks/useMetaMask";

const WalletConnection = () => {
const { isConnected, account, chainId, isConnecting, error, connect, disconnect, switchNetwork } = useMetaMask();

const handleConnect = async () => {
try {
await connect();
Alert.alert("Sukses", "Dompet berhasil terhubung!");
} catch (err) {
Alert.alert("Error", `Gagal terhubung: ${err.message}`);
}
};

const handleDisconnect = async () => {
try {
await disconnect();
Alert.alert("Sukses", "Dompet berhasil diputuskan!");
} catch (err) {
Alert.alert("Error", `Gagal memutuskan: ${err.message}`);
}
};

const handleSwitchToMantaTestnet = async () => {
try {
// ID Rantai Manta Pacific Testnet: 3441005 (desimal) atau 0x34925 (hex)
await switchNetwork("0x34925");
Alert.alert("Sukses", "Beralih ke Manta Pacific Testnet!");
} catch (err) {
Alert.alert("Error", `Gagal beralih jaringan: ${err.message}`);
}
};

const formatAddress = (address) => {
if (!address) return "";
return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const getNetworkName = (chainId) => {
const networks = {
"0x1": "Ethereum Mainnet",
"0x89": "Polygon Mainnet",
"0xa": "Optimism Mainnet",
"0xa4b1": "Arbitrum One",
"0x38": "Binance Smart Chain Mainnet",
"0x34925": "Manta Pacific Testnet",
};
return networks[chainId] |
| `ID Rantai: ${chainId}`;
};

return (
<View style={styles.container}>
<Text style={styles.title}>Koneksi Dompet</Text>
{error && (
<View style={styles.errorContainer}>
<Text style={styles.errorText}>{error}</Text>
</View>
)}
{isConnected? (
<View style={styles.connectedContainer}>
<View style={styles.infoContainer}>
<Text style={styles.label}>Akun:</Text>
<Text style={styles.value}>{formatAddress(account)}</Text>
</View>
<View style={styles.infoContainer}>
<Text style={styles.label}>Jaringan:</Text>
<Text style={styles.value}>{getNetworkName(chainId)}</Text>
</View>
<View style={styles.buttonContainer}>
<TouchableOpacity style={} onPress={handleSwitchToMantaTestnet}>
<Text style={styles.secondaryButtonText}>Beralih ke Manta Testnet</Text>
</TouchableOpacity>
<TouchableOpacity style={} onPress={handleDisconnect}>
<Text style={styles.disconnectButtonText}>Putuskan</Text>
</TouchableOpacity>
</View>
</View>
) : (
<View style={styles.disconnectedContainer}>
<Text style={styles.description}>Hubungkan dompet MetaMask Anda untuk memulai</Text>
<TouchableOpacity style={} onPress={handleConnect} disabled={isConnecting}>
{isConnecting? <ActivityIndicator color="#fff" /> : <Text style={styles.connectButtonText}>Hubungkan MetaMask</Text>}
</TouchableOpacity>
</View>
)}
</View>
);
};

const styles = StyleSheet.create({
container: { padding: 20, backgroundColor: "#f5f5f5", borderRadius: 10, margin: 10 },
title: { fontSize: 24, fontWeight: "bold", textAlign: "center", marginBottom: 20, color: "#333" },
errorContainer: { backgroundColor: "#ffebee", padding: 10, borderRadius: 5, marginBottom: 15, borderLeftWidth: 4, borderLeftColor: "#f44336" },
errorText: { color: "#c62828", fontSize: 14 },
connectedContainer: { alignItems: "center" },
disconnectedContainer: { alignItems: "center" },
infoContainer: { flexDirection: "row", justifyContent: "space-between", width: "100%", paddingVertical: 8, paddingHorizontal: 15, backgroundColor: "#fff", borderRadius: 8, marginBottom: 10 },
label: { fontSize: 16, fontWeight: "600", color: "#666" },
value: { fontSize: 16, color: "#333", fontFamily: "monospace" },
description: { fontSize: 16, textAlign: "center", color: "#666", marginBottom: 20 },
buttonContainer: { flexDirection: "row", justifyContent: "space-around", width: "100%", marginTop: 15 },
button: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, minWidth: 120, alignItems: "center" },
connectButton: { backgroundColor: "#f6851b", width: "100%" },
connectButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
secondaryButton: { backgroundColor: "#2196f3", flex: 1, marginRight: 10 },
secondaryButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
disconnectButton: { backgroundColor: "#f44336", flex: 1 },
disconnectButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});

export default WalletConnection;
8.2: Komponen Pencetakan (src/components/MintingComponent.js)Komponen ini menyediakan antarmuka pengguna untuk mencetak NFT. Ini menggunakan hook useThirdweb untuk berinteraksi dengan Thirdweb SDK untuk pencetakan dan unggahan IPFS. Ini juga menggunakan useMetaMask untuk memeriksa status koneksi dompet.1JavaScriptimport React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from "react-native";
import { useThirdweb } from "../hooks/useThirdweb";
import { useMetaMask } from "../hooks/useMetaMask";

const MintingComponent = () => {
const { isInitialized, isLoading, mintNFT } = useThirdweb();
const { isConnected } = useMetaMask();
const [contractAddress, setContractAddress] = useState(process.env.EXPO_PUBLIC_CONTRACT_ADDRESS |
| "");
const [nftName, setNftName] = useState("");
const = useState("");
const [imageUrl, setImageUrl] = useState("");
const [attributes, setAttributes] = useState("");
const [isMinting, setIsMinting] = useState(false);

const handleMint = async () => {
if (!isConnected) return Alert.alert("Error", "Harap hubungkan dompet Anda terlebih dahulu.");
if (!isInitialized) return Alert.alert("Error", "Thirdweb SDK tidak diinisialisasi. Harap tunggu atau periksa koneksi.");
if (!contractAddress ||!nftName ||!nftDescription) return Alert.alert("Error", "Harap isi semua bidang yang diperlukan.");

    try {
      setIsMinting(true);
      let parsedAttributes = {};
      if (attributes) {
        try {
          parsedAttributes = JSON.parse(attributes);
        } catch (err) {
          return Alert.alert("Error", "Format atribut tidak valid. Harap gunakan JSON yang valid.");
        }
      }
      const metadata = { name: nftName, description: nftDescription, image: imageUrl, attributes: parsedAttributes };
      const result = await mintNFT(contractAddress, metadata);
      Alert.alert("Sukses!", `NFT berhasil dicetak!\nHash Transaksi: ${result.receipt.transactionHash}\nID Token: ${result.id}`,);
    } catch (error) {
      console.error("Kesalahan pencetakan:", error);
      Alert.alert("Error", `Gagal mencetak NFT: ${error.message |

| error}`);
} finally {
setIsMinting(false);
}
};

if (!isConnected) {
return (
<View style={styles.container}>
<Text style={styles.title}>Pencetakan NFT</Text>
<Text style={styles.message}>Harap hubungkan dompet Anda untuk mencetak NFT.</Text>
</View>
);
}

return (
<ScrollView style={styles.container}>
<Text style={styles.title}>Cetak NFT</Text>
<View style={styles.form}>
{/_ Input untuk Alamat Kontrak, Nama NFT, Deskripsi, URL Gambar, Atribut _/}
<TouchableOpacity style={} onPress={handleMint} disabled={!isInitialized |
| isMinting |
| isLoading}>
{isMinting |
| isLoading? <ActivityIndicator color="#fff" /> : <Text style={styles.mintButtonText}>Cetak NFT</Text>}
</TouchableOpacity>
{!isInitialized && <Text style={styles.warningText}>Thirdweb SDK sedang diinisialisasi...</Text>}
</View>
</ScrollView>
);
};

const styles = StyleSheet.create({
container: { flex: 1, padding: 20, backgroundColor: "#f5f5f5" },
title: { fontSize: 24, fontWeight: "bold", textAlign: "center", marginBottom: 20, color: "#333" },
message: { fontSize: 16, textAlign: "center", color: "#666", marginTop: 50 },
form: { backgroundColor: "#fff", borderRadius: 10, padding: 20 },
mintButton: { backgroundColor: "#4caf50", paddingVertical: 15, borderRadius: 8, alignItems: "center", marginTop: 10 },
disabledButton: { backgroundColor: "#ccc" },
mintButtonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
warningText: { textAlign: "center", color: "#ff9800", marginTop: 10, fontSize: 14 },
});

export default MintingComponent;
8.3: Komponen Unggah IPFS (src/components/IPFSUpload.js)Komponen ini menyediakan antarmuka pengguna untuk mengunggah data teks dan JSON langsung ke IPFS menggunakan fungsionalitas penyimpanan Thirdweb. Ini menunjukkan cara memanfaatkan Thirdweb untuk penyimpanan terdesentralisasi.1JavaScriptimport React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, TextInput } from "react-native";
import { useThirdweb } from "../hooks/useThirdweb";
import { useMetaMask } from "../hooks/useMetaMask";

const IPFSUpload = () => {
const { isInitialized, uploadToIPFS, uploadMetadata } = useThirdweb();
const { isConnected } = useMetaMask();
const = useState("");
const = useState("");
const [isUploading, setIsUploading] = useState(false);
const [uploadedUri, setUploadedUri] = useState("");

const handleUpload = async (type) => {
if ((type === 'text' &&!textData.trim()) |
| (type === 'json' &&!jsonData.trim())) {
return Alert.alert("Error", "Harap masukkan beberapa data untuk diunggah.");
}
if (!isInitialized) {
return Alert.alert("Error", "Thirdweb SDK tidak diinisialisasi. Harap hubungkan dompet.");
}
setIsUploading(true);
try {
let uri;
if (type === 'text') {
uri = await uploadToIPFS(textData);
} else {
const parsedData = JSON.parse(jsonData);
uri = await uploadMetadata(parsedData);
}
setUploadedUri(uri);
Alert.alert("Sukses", `Data berhasil diunggah ke IPFS!\nURI: ${uri}`);
} catch (error) {
console.error(`Kesalahan unggah IPFS ${type}:`, error);
Alert.alert("Error", `Gagal mengunggah ${type}: ${error.message |
| error}`);
} finally {
setIsUploading(false);
}
};

if (!isConnected) {
return (
<View style={styles.container}>
<Text style={styles.title}>Unggah IPFS</Text>
<Text style={styles.message}>Harap hubungkan dompet Anda untuk menggunakan fitur IPFS.</Text>
</View>
);
}

return (
<View style={styles.container}>
<Text style={styles.title}>Unggah ke IPFS</Text>
{/_ Input untuk Teks dan JSON _/}
<View style={styles.section}>
<Text style={styles.sectionTitle}>Unggah Teks</Text>
<TextInput style={[styles.input, styles.textArea]} value={textData} onChangeText={setTextData} placeholder="Masukkan teks untuk diunggah..." multiline />
<TouchableOpacity style={} onPress={() => handleUpload('text')} disabled={!isInitialized |
| isUploading}>
{isUploading? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Unggah Teks</Text>}
</TouchableOpacity>
</View>
<View style={styles.section}>
<Text style={styles.sectionTitle}>Unggah JSON</Text>
<TextInput style={[styles.input, styles.textArea]} value={jsonData} onChangeText={setJsonData} placeholder='{"name": "Dokumen Contoh"}' multiline />
<TouchableOpacity style={} onPress={() => handleUpload('json')} disabled={!isInitialized |
| isUploading}>
{isUploading? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Unggah JSON</Text>}
</TouchableOpacity>
</View>
{uploadedUri? (
<View style={styles.resultSection}>
<Text style={styles.resultTitle}>Hasil Unggahan Terakhir:</Text>
<Text style={styles.uriText} numberOfLines={2}>{uploadedUri}</Text>
</View>
) : null}
</View>
);
};

const styles = StyleSheet.create({
container: { padding: 20, backgroundColor: "#f5f5f5", borderRadius: 10, margin: 10 },
title: { fontSize: 24, fontWeight: "bold", textAlign: "center", marginBottom: 20, color: "#333" },
message: { fontSize: 16, textAlign: "center", color: "#666", marginTop: 50 },
section: { backgroundColor: "#fff", borderRadius: 8, padding: 15, marginBottom: 15 },
sectionTitle: { fontSize: 18, fontWeight: "600", color: "#333", marginBottom: 10 },
input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: "#fff", marginBottom: 10 },
textArea: { height: 100, textAlignVertical: "top" },
button: { paddingVertical: 12, borderRadius: 8, alignItems: "center" },
primaryButton: { backgroundColor: "#2196f3" },
secondaryButton: { backgroundColor: "#ff9800" },
buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
resultSection: { backgroundColor: "#e8f5e8", borderRadius: 8, padding: 15, marginTop: 10 },
resultTitle: { fontSize: 16, fontWeight: "600", color: "#2e7d32", marginBottom: 8 },
uriText: { flex: 1, fontSize: 14, color: "#333", fontFamily: "monospace" },
});

export default IPFSUpload; 9. Menyatukan Semuanya: App.jsFile App.js terakhir ini tampak sederhana, yang merupakan fitur paling kuatnya. Ini berfungsi sebagai akar komposisi tetapi hampir tidak mengandung logika. Ini menunjukkan bahwa aplikasi yang dirancang dengan baik dapat memiliki titik masuk yang sangat bersih, karena semua kompleksitas dienkapsulasi dengan benar dalam modul-modul khusus. Kesederhanaan ini adalah hasil langsung dari keputusan arsitektur yang dibuat di bagian 1, 5, 6, dan 7; App.js yang bersih adalah hadiah terakhir untuk pekerjaan desain di muka tersebut.1App.js (versi final)JavaScript// Ini harus diimpor sebelum yang lain, sesuai dokumentasi Thirdweb
import "@thirdweb-dev/react-native-adapter";
import "react-native-get-random-values";
import { Buffer } from "buffer";

// Polyfills global HARUS berada di bagian paling atas setelah adapter thirdweb
global.Buffer = Buffer;

import React from "react";
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import WalletConnection from "./src/components/WalletConnection";
import MintingComponent from "./src/components/MintingComponent";
import IPFSUpload from "./src/components/IPFSUpload";

const App = () => {
return (
<SafeAreaView style={styles.container}>
<StatusBar barStyle="dark-content" backgroundColor="#fff" />
<ScrollView contentInsetAdjustmentBehavior="automatic">
<View style={styles.header}>
<Text style={styles.headerTitle}>MetaMask + Thirdweb App</Text>
<Text style={styles.headerSubtitle}>
Terhubung dengan MetaMask, berinteraksi dengan Thirdweb
</Text>
</View>
<WalletConnection />
<MintingComponent />
<IPFSUpload />
</ScrollView>
</SafeAreaView>
);
};

const styles = StyleSheet.create({
container: {
backgroundColor: "#fff",
flex: 1,
},
header: {
padding: 20,
alignItems: "center",
backgroundColor: "#f8f9fa",
},
headerTitle: {
fontSize: 28,
fontWeight: "bold",
color: "#333",
marginBottom: 5,
},
headerSubtitle: {
fontSize: 16,
color: "#666",
textAlign: "center",
},
});

export default App; 10. Pengujian dan DebuggingBagian ini memberikan strategi yang dapat ditindaklanjuti yang melampaui saran generik, disesuaikan dengan spesifikasi alur kerja pengembangan dApp native.1Build Pengembangan: Selalu gunakan npx expo run:ios atau npx expo run:android untuk pengujian, karena Expo Go tidak didukung.Aplikasi Seluler MetaMask: Pastikan Anda memiliki aplikasi seluler MetaMask yang terinstal di perangkat Anda. SDK akan mencoba melakukan deep link ke sana untuk koneksi.Log Konsol: Manfaatkan pernyataan console.log secara ekstensif di layanan dan hook Anda untuk melacak alur data dan mengidentifikasi di mana masalah mungkin terjadi.Inspektur Jaringan: Gunakan alat pengembang browser Anda (jika berjalan di web) atau alat seperti Flipper (untuk aplikasi native) untuk memeriksa permintaan dan respons jaringan, terutama untuk interaksi blockchain.Penanganan Kesalahan: Terapkan blok try-catch yang kuat di sekitar semua operasi asinkron, terutama panggilan jaringan dan blockchain, untuk menangani kesalahan dengan baik dan memberikan umpan balik yang informatif kepada pengguna.Faucet Manta Pacific Testnet: Jika Anda memerlukan token uji untuk Manta Pacific Testnet, cari faucet yang andal untuk mendapatkannya.11. Praktik Terbaik dan Pertimbangan KeamananBagian ini mengangkat panduan dari resep teknis menjadi sumber daya pengembangan profesional dengan menangani persyaratan non-fungsional seperti keamanan, kegunaan, dan pemeliharaan.1Variabel Lingkungan: Jangan pernah melakukan hardcode informasi sensitif seperti kunci pribadi atau kunci API langsung di kode Anda. Selalu gunakan variabel lingkungan (misalnya, file .env) dan pastikan mereka tidak di-commit ke kontrol versi.Penanganan Kesalahan: Terapkan penanganan kesalahan yang komprehensif dan pesan kesalahan yang ramah pengguna. Pengguna harus mengerti apa yang salah dan bagaimana cara memperbaikinya.Pengalaman Pengguna: Berikan umpan balik yang jelas kepada pengguna selama operasi asinkron (misalnya, indikator pemuatan, pesan sukses/gagal). Pertimbangkan kasus-kasus tepi seperti pemutusan jaringan atau transaksi yang ditolak.Keamanan Kontrak Pintar: Jika Anda menerapkan kontrak pintar Anda sendiri, pastikan mereka diaudit dan diuji secara menyeluruh untuk kerentanan.Biaya Gas: Informasikan pengguna tentang potensi biaya gas untuk transaksi dan berikan perkiraan jika memungkinkan.Pergantian Jaringan: Pandu pengguna dengan jelas tentang cara beralih jaringan jika aplikasi Anda mendukung banyak rantai.Deep Linking: Uji deep linking secara menyeluruh di perangkat iOS dan Android untuk memastikan koneksi dompet yang mulus.Dependensi: Jaga agar dependensi proyek Anda tetap diperbarui untuk mendapatkan manfaat dari perbaikan bug, peningkatan kinerja, dan patch keamanan.12. Pemecahan Masalah UmumBagian ini berisi bukti paling kuat dari keahlian penulis. Ini bukan masalah teoretis; ini adalah bekas luka pertempuran. Kesalahan yang tercantum adalah pesan-pesan samar yang persis akan dihadapi pengembang saat mencoba membangun ini dari awal. Dengan mendokumentasikannya dan solusinya, penulis menghemat waktu frustrasi yang tak terhitung bagi pengembang lain dan memperkuat status panduan sebagai sumber daya praktis yang esensial.1Kesalahan: SDK not initialized. Call initializeSDK first.: Kesalahan ini biasanya berarti Anda mencoba menggunakan fungsi MetaMask SDK sebelum diinisialisasi dengan benar. Pastikan MetaMaskService.initializeSDK() dipanggil di awal siklus hidup aplikasi Anda, idealnya di App.js atau komponen tingkat atas.Kesalahan: No accounts returned from MetaMask connection.: Ini bisa terjadi jika pengguna membatalkan permintaan koneksi di MetaMask, atau jika ada masalah dengan aplikasi MetaMask itu sendiri. Pastikan MetaMask terinstal dan tidak terkunci di perangkat pengguna.Kesalahan: Failed to switch network:...: Ini biasanya menunjukkan bahwa jaringan target tidak dikonfigurasi di MetaMask pengguna, atau ada masalah dengan chainId yang diberikan. Periksa kembali chainId dan URL RPC untuk Manta Pacific Testnet.Kesalahan: Thirdweb SDK not initialized.: Ini berarti ThirdwebService.initializeSDK() tidak dipanggil atau gagal. Ini sering terjadi jika koneksi MetaMask (yang menyediakan provider dan signer untuk Thirdweb) tidak berhasil.Kesalahan Metro Bundler (misalnya, Unable to resolve module 'crypto'): Kesalahan ini hampir selalu terkait dengan polyfill yang hilang atau konfigurasi Metro/Babel yang salah. Kunjungi kembali Langkah 3 dan Langkah 4, pastikan semua polyfill diatur dengan benar di metro.config.js dan babel.config.js.Invariant Violation: requireNativeComponent: 'RNCWebView' was not found.: Ini menunjukkan masalah penautan modul native. Pastikan Anda telah menjalankan npx expo prebuild dan cd ios && pod install && cd.. (untuk iOS) setelah menginstal dependensi native.Variabel EXPO*PUBLIC*... tidak terdefinisi: Pastikan Anda telah membuat file .env di root proyek Anda dan Anda menjalankan aplikasi Anda dengan npx expo start (atau run:ios / run:android), yang secara otomatis memuat variabel-variabel ini. Juga, verifikasi bahwa file .env diformat dengan benar.Fungsi Thirdweb tidak berfungsi setelah koneksi MetaMask: Periksa kembali bahwa ThirdwebService.initializeSDK dipanggil dengan provider dan chainId yang benar yang diperoleh dari koneksi MetaMask. Hook useIntegration dirancang untuk menangani ini secara otomatis.13. KesimpulanPanduan komprehensif ini memberikan solusi yang kuat untuk mengintegrasikan MetaMask SDK untuk koneksi dompet dengan Thirdweb SDK untuk fungsionalitas blockchain lainnya dalam aplikasi React Native Expo, yang secara khusus disesuaikan untuk Manta Pacific Testnet. Dengan memisahkan logika koneksi dompet dari logika interaksi blockchain, kami mencapai aplikasi yang lebih stabil, dapat dipelihara, dan ramah pengguna. Pendekatan ini memungkinkan pengembang untuk memanfaatkan kekuatan kedua SDK yang kuat, memberikan pengalaman yang mulus bagi pengguna saat berinteraksi dengan aplikasi terdesentralisasi.1Ingatlah untuk terus menguji aplikasi Anda, terutama setelah pembaruan dependensi, dan patuhi praktik terbaik untuk keamanan dan pengalaman pengguna. Dengan dokumentasi terperinci ini, Anda dilengkapi dengan baik untuk membangun aplikasi terdesentralisasi yang kuat dan andal di React Native Expo.
