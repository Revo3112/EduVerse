# Tutorial Mendalam Migrasi dApp EduVerse ke React Native Expo

**Penulis:** Manus AI

## Pendahuluan

Tutorial ini akan memandu Anda melalui proses migrasi dApp "EduVerse" ke aplikasi React Native Expo yang mandiri dan siap produksi, dengan fokus pada integrasi terbaik untuk koneksi dompet, penyimpanan IPFS, dan streaming video. Kami telah memilih opsi yang paling kompatibel, mudah digunakan, dan minim konflik dependensi untuk memastikan proses pengembangan yang efisien dan hasil akhir yang robust.

**Pilihan Teknologi Terbaik:**
*   **Koneksi Dompet:** `@web3modal/wagmi-react-native` bersama `wagmi` dan `viem`.
*   **Penyimpanan IPFS:** Web3.Storage (Storacha) menggunakan `@web3-storage/w3up-client`.
*   **Video Streaming:** Livepeer menggunakan `@livepeer/react-native`.

Tutorial ini akan memberikan panduan langkah demi langkah, termasuk instalasi, konfigurasi, dan contoh kode yang mendalam untuk setiap integrasi.

## 1. Persiapan Lingkungan Pengembangan

Pastikan Anda memiliki lingkungan pengembangan yang sesuai. Kami akan menggunakan Node.js, npm (atau yarn), dan Expo CLI.

### 1.1 Instalasi Node.js dan npm

Pastikan Node.js (versi 18 atau lebih baru direkomendasikan untuk kompatibilitas terbaru) dan npm (atau yarn) terinstal di sistem Anda. Anda dapat mengunduhnya dari [situs resmi Node.js](https://nodejs.org/).

### 1.2 Instalasi Expo CLI

Instal Expo CLI secara global:

```bash
npm install -g expo-cli
```

### 1.3 Membuat Proyek React Native Expo Baru

Buat proyek Expo baru:

```bash
npx create-expo-app EduVerseApp --template blank
cd EduVerseApp
```

### 1.4 Konfigurasi `app.json` untuk Deep Linking

Untuk WalletConnect, kita perlu mengkonfigurasi deep linking agar dompet seluler dapat kembali ke aplikasi Anda setelah koneksi atau transaksi. Tambahkan properti `scheme` di bagian `expo` dan konfigurasi `ios`/`android` yang relevan di `app.json` (atau `app.config.js`):

```json
// app.json
{
  "expo": {
    "name": "EduVerseApp",
    "slug": "eduverseapp",
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
      "bundleIdentifier": "com.eduverse.app", // Ganti dengan ID bundle unik Anda
      "associatedDomains": ["applinks:eduverse.app"] // Ganti dengan domain universal Anda
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.eduverse.app", // Ganti dengan nama paket unik Anda
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [
            {
              "scheme": "eduverse", // Skema URL kustom Anda
              "host": "*"
            }
          ],
          "category": [
            "BROWSABLE",
            "DEFAULT"
          ]
        }
      ]
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "scheme": "eduverse" // Skema URL kustom Anda
  }
}
```

### 1.5 Struktur Direktori Proyek

Untuk menjaga kode tetap terorganisir, buat struktur direktori berikut di dalam folder `EduVerseApp`:

```bash
mkdir -p src/providers src/screens src/components src/services src/constants src/utils src/constants/abi
```

## 2. Konfigurasi Blockchain

EduVerse dApp akan berinteraksi dengan Manta Pacific Testnet. Kita perlu mendefinisikan konfigurasi jaringan ini.

### 2.1 File `blockchain.js`

Buat file `src/constants/blockchain.js` dan tambahkan konfigurasi Manta Pacific Testnet:

```javascript
// src/constants/blockchain.js
import { defineChain } from "viem";

export const mantaPacificTestnet = defineChain({
  id: 3441006,
  name: "Manta Pacific Testnet",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://pacific-rpc.sepolia-testnet.manta.network/http"] },
  },
  blockExplorers: {
    default: { name: "Manta Pacific Explorer", url: "https://pacific-explorer.sepolia-testnet.manta.network/" },
  },
  contracts: {
    // Tambahkan alamat kontrak yang relevan jika ada yang sudah di-deploy secara default
  },
});

export const BLOCKCHAIN_CONFIG = {
  CHAIN_ID: mantaPacificTestnet.id,
  RPC_URL: mantaPacificTestnet.rpcUrls.default.http[0],
  CHAIN_NAME: mantaPacificTestnet.name,
  NATIVE_CURRENCY_SYMBOL: mantaPacificTestnet.nativeCurrency.symbol,
  BLOCK_EXPLORER_URL: mantaPacificTestnet.blockExplorers.default.url,
};
```

## 3. Ekstraksi dan Penggunaan ABI Smart Contract

ABI (Application Binary Interface) adalah jembatan antara aplikasi Anda dan smart contract di blockchain. Kami akan mengekstrak ABI dari file JSON yang Anda berikan dan menyimpannya di proyek.

### 3.1 Menyimpan File ABI

Anda telah menyediakan file JSON untuk setiap smart contract. Simpan file-file ABI ini di direktori `src/constants/abi/`:

*   `CertificateManager.json`
*   `CourseFactory.json`
*   `CourseLicense.json`
*   `MockV3Aggregator.json`
*   `PlatformFactory.json`
*   `PlatformRegistry.json`
*   `ProgressTracker.json`

Pastikan hanya bagian `abi` dari file JSON yang disimpan. Contoh untuk `CertificateManager.json`:

```json
// src/constants/abi/CertificateManager.json
[
  // ... array ABI dari file JSON Anda ...
]
```

### 3.2 Interaksi Smart Contract dengan `wagmi` dan `viem`

`wagmi` dan `viem` menyediakan cara yang sangat efisien dan type-safe untuk berinteraksi dengan smart contract. Kita akan membuat layanan untuk mengelola interaksi dengan smart contract EduVerse.

Buat file `src/services/SmartContractService.js`:

```javascript
// src/services/SmartContractService.js
import { useReadContract, useWriteContract, useSimulateContract } from "wagmi";
import { parseEther } from "viem";

// Import semua ABI yang diperlukan
import CertificateManagerABI from "../constants/abi/CertificateManager.json";
import CourseFactoryABI from "../constants/abi/CourseFactory.json";
import CourseLicenseABI from "../constants/abi/CourseLicense.json";
import MockV3AggregatorABI from "../constants/abi/MockV3Aggregator.json";
import PlatformFactoryABI from "../constants/abi/PlatformFactory.json";
import PlatformRegistryABI from "../constants/abi/PlatformRegistry.json";
import ProgressTrackerABI from "../constants/abi/ProgressTracker.json";

// Alamat kontrak yang sudah di-deploy (ganti dengan alamat yang sebenarnya dari deployed-contracts.json Anda)
// Gunakan alamat kontrak yang valid di Manta Pacific Testnet
export const CONTRACT_ADDRESSES = {
  CertificateManager: "0x...", 
  CourseFactory: "0x...",    
  CourseLicense: "0x...",    
  MockV3Aggregator: "0x...", 
  PlatformFactory: "0x...",  
  PlatformRegistry: "0x...",
  ProgressTracker: "0x...",



};

// Hook kustom untuk interaksi dengan smart contract
export function useEduVerseContracts() {
  // Contoh penggunaan useReadContract untuk membaca data dari CourseFactory
  const { data: courseCount } = useReadContract({
    address: CONTRACT_ADDRESSES.CourseFactory,
    abi: CourseFactoryABI,
    functionName: "courseCount",
  });

  // Contoh penggunaan useWriteContract untuk menulis data ke CourseFactory
  const { writeContract: createCourse, data: createCourseTxHash, isPending: isCreatingCourse } = useWriteContract();

  const createNewCourse = async (name, description, price, durationMonths) => {
    try {
      createCourse({
        address: CONTRACT_ADDRESSES.CourseFactory,
        abi: CourseFactoryABI,
        functionName: "createCourse",
        args: [name, description, parseEther(price.toString()), BigInt(durationMonths)],
      });
    } catch (error) {
      console.error("Error simulating createCourse:", error);
      throw error;
    }
  };

  // Contoh penggunaan useSimulateContract untuk simulasi transaksi
  const { data: simulateMintLicense } = useSimulateContract({
    address: CONTRACT_ADDRESSES.CourseLicense,
    abi: CourseLicenseABI,
    functionName: "mintLicense",
    args: [BigInt(1), BigInt(1)], // Contoh argumen
    value: parseEther("0.01"), // Contoh nilai ETH yang dikirim
  });

  const { writeContract: mintLicense, isPending: isMintingLicense } = useWriteContract();

  const handleMintLicense = async (courseId, durationMonths, value) => {
    if (!simulateMintLicense?.request) {
      console.error("Simulation failed or request not ready.");
      return;
    }
    try {
      mintLicense(simulateMintLicense.request);
    } catch (error) {
      console.error("Error minting license:", error);
      throw error;
    }
  };

  return {
    courseCount: courseCount ? Number(courseCount) : 0,
    createNewCourse,
    createCourseTxHash,
    isCreatingCourse,
    handleMintLicense,
    isMintingLicense,
    // Tambahkan hook untuk kontrak lainnya sesuai kebutuhan
  };
}
```

## 4. Integrasi Dompet Web3 Seluler (`@web3modal/wagmi-react-native`)

Kita akan menggunakan kombinasi `wagmi` dan `Web3Modal` untuk integrasi dompet yang mulus dan kaya fitur.

### 4.1 Instalasi Dependensi

```bash
npm install wagmi viem @tanstack/react-query @web3modal/wagmi-react-native @walletconnect/modal-react-native
```

### 4.2 Konfigurasi `wagmi` Client

Buat file `src/providers/WagmiProvider.js` untuk mengkonfigurasi `wagmi` client dan `Web3Modal`.

```javascript
// src/providers/WagmiProvider.js
import React from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createWeb3Modal, defaultWagmiConfig } from "@web3modal/wagmi-react-native";
import { mantaPacificTestnet } from "../constants/blockchain";

// 1. Get projectId at https://cloud.walletconnect.com
const projectId = "YOUR_WALLETCONNECT_PROJECT_ID"; // Ganti dengan Project ID Anda

// 2. Create wagmiConfig
const metadata = {
  name: "EduVerse",
  description: "Educational DApp on Manta Pacific",
  url: "https://eduverse.app", // Ganti dengan URL dApp Anda
  icons: ["https://eduverse.app/icon.png"], // Ganti dengan ikon dApp Anda
  redirect: {
    native: "eduverse://", // Skema URL kustom Anda dari app.json
    universal: "https://eduverse.app", // Universal link Anda
  },
};

const chains = [mantaPacificTestnet];

const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
  transports: {
    [mantaPacificTestnet.id]: http(),
  },
});

// 3. Create modal
createWeb3Modal({
  projectId,
  wagmiConfig,
  enableAnalytics: true, // Optional - defaults to your projectId
  defaultChain: mantaPacificTestnet,
  // ... tambahkan konfigurasi lain jika diperlukan
});

const queryClient = new QueryClient();

export function WagmiWeb3ModalProvider({ children }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

### 4.3 Menggunakan `WagmiWeb3ModalProvider` di `App.js`

Bungkus komponen root aplikasi Anda dengan `WagmiWeb3ModalProvider` di `App.js`:

```javascript
// App.js
import React from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import { WagmiWeb3ModalProvider } from "./src/providers/WagmiProvider";
import MainScreen from "./src/screens/MainScreen";

// Pastikan polyfills diimpor paling awal
import "./polyfills"; 

export default function App() {
  return (
    <WagmiWeb3ModalProvider>
      <SafeAreaView style={styles.container}>
        <MainScreen />
      </SafeAreaView>
    </WagmiWeb3ModalProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
});
```

### 4.4 Menggunakan Hooks `wagmi` di Komponen Anda

Sekarang Anda dapat menggunakan hooks `wagmi` di komponen React Native Anda untuk mengelola koneksi dompet dan interaksi blockchain.

```javascript
// src/screens/MainScreen.js (Contoh)
import React from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { useWeb3Modal } from "@web3modal/wagmi-react-native";
import { useAccount, useDisconnect, useBalance } from "wagmi";
import { BLOCKCHAIN_CONFIG } from "../constants/blockchain";

function MainScreen() {
  const { open } = useWeb3Modal();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Selamat Datang di EduVerse</Text>
      {!isConnected ? (
        <Button title="Connect Wallet" onPress={() => open()} />
      ) : (
        <View>
          <Text>Connected to {BLOCKCHAIN_CONFIG.CHAIN_NAME}</Text>
          <Text>Address: {address.substring(0, 6)}...{address.substring(address.length - 4)}</Text>
          {balance && <Text>Balance: {balance.formatted} {balance.symbol}</Text>}
          <Button title="Disconnect Wallet" onPress={() => disconnect()} />
        </View>
      )}
      {/* Tambahkan navigasi ke layar lain atau komponen dApp di sini */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
});

export default MainScreen;
```

## 5. Integrasi IPFS dengan Web3.Storage (Storacha)

Web3.Storage (sekarang Storacha) adalah pilihan terbaik untuk penyimpanan IPFS karena kapasitas gratis yang memadai dan client library yang mudah digunakan.

### 5.1 Instalasi Dependensi

```bash
npm install @web3-storage/w3up-client
```

### 5.2 Konfigurasi dan Autentikasi

Proses autentikasi dengan `w3up-client` melibatkan pembuatan akun dan otorisasi melalui email. Untuk aplikasi React Native, Anda perlu melakukan ini secara manual atau melalui alur backend yang aman. Setelah Anda mendapatkan `DID` (Decentralized Identifier) untuk akun dan `space` Anda, Anda dapat menggunakannya di aplikasi.

Buat file `src/services/IpfsService.js`:

```javascript
// src/services/IpfsService.js
import * as Client from "@web3-storage/w3up-client";

// Ganti dengan DID akun dan space Anda yang sudah ada
// Anda perlu melakukan login dan membuat space secara manual di https://console.web3.storage/
// atau melalui script Node.js terpisah untuk mendapatkan nilai-nilai ini.
const WEB3_STORAGE_ACCOUNT_DID = "did:key:YOUR_ACCOUNT_DID"; 
const WEB3_STORAGE_SPACE_DID = "did:key:YOUR_SPACE_DID";

let clientInstance = null;

export async function getWeb3StorageClient() {
  if (clientInstance) {
    return clientInstance;
  }

  const client = await Client.create();

  // Load account dan space
  const account = await client.loadAccount(WEB3_STORAGE_ACCOUNT_DID);
  client.setCurrentAccount(account);

  const space = await client.loadSpace(WEB3_STORAGE_SPACE_DID);
  client.setCurrentSpace(space);

  clientInstance = client;
  return clientInstance;
}

// Fungsi untuk mengunggah file
export async function uploadFileToWeb3Storage(file, fileName, contentType) {
  try {
    const client = await getWeb3StorageClient();
    const fileToUpload = new File([file], fileName, { type: contentType });
    const cid = await client.uploadFile(fileToUpload);
    console.log("Uploaded file with CID:", cid.toString());
    return cid.toString();
  } catch (error) {
    console.error("Error uploading file to Web3.Storage:", error);
    throw error;
  }
}

// Fungsi untuk mengunggah metadata NFT
export async function uploadNftMetadataToWeb3Storage(name, description, imageCid, videoCid = null) {
  const metadata = {
    name: name,
    description: description,
    image: `ipfs://${imageCid}`, // Link ke gambar di IPFS
    animation_url: videoCid ? `ipfs://${videoCid}` : undefined, // Link ke video di IPFS (opsional)
    attributes: [
      { trait_type: "Course", value: "Blockchain Fundamentals" },
      { trait_type: "Instructor", value: "Manus AI" }
    ]
  };

  const metadataBlob = new Blob([JSON.stringify(metadata)], { type: "application/json" });
  const metadataCid = await uploadFileToWeb3Storage(metadataBlob, "metadata.json", "application/json");

  console.log("NFT Metadata uploaded with CID:", metadataCid);
  return metadataCid;
}
```

**Penting:** Anda harus mengganti `YOUR_ACCOUNT_DID` dan `YOUR_SPACE_DID` dengan nilai yang sebenarnya. Untuk mendapatkannya, Anda bisa mendaftar di [Web3.Storage Console](https://console.web3.storage/) dan membuat space. Atau, Anda bisa menggunakan script Node.js terpisah untuk login dan membuat space, lalu menyimpan DID yang dihasilkan.

### 5.3 Contoh Penggunaan di Komponen

```javascript
// Contoh di komponen React Native
import React, { useState } from "react";
import { View, Button, Image, Text, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { uploadFileToWeb3Storage, uploadNftMetadataToWeb3Storage } from "../services/IpfsService";

function IpfsUploadComponent() {
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [ipfsCid, setIpfsCid] = useState(null);
  const [metadataCid, setMetadataCid] = useState(null);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleUpload = async () => {
    if (!image) {
      alert("Please select an image first.");
      return;
    }

    setUploading(true);
    try {
      const response = await fetch(image);
      const blob = await response.blob();
      
      // Upload gambar
      const cid = await uploadFileToWeb3Storage(blob, "course_image.jpg", blob.type);
      setIpfsCid(cid);

      // Upload metadata NFT
      const metaCid = await uploadNftMetadataToWeb3Storage(
        "My Awesome Course NFT",
        "This NFT grants access to an awesome blockchain course.",
        cid
      );
      setMetadataCid(metaCid);

      alert("Upload successful!");
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed. Check console for details.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Button title="Pick an image" onPress={pickImage} />
      {image && <Image source={{ uri: image }} style={{ width: 200, height: 200 }} />}
      <Button title="Upload to IPFS" onPress={handleUpload} disabled={uploading} />
      {uploading && <ActivityIndicator size="small" color="#0000ff" />}
      {ipfsCid && <Text>Image CID: {ipfsCid}</Text>}
      {metadataCid && <Text>Metadata CID: {metadataCid}</Text>}
      {ipfsCid && <Text>IPFS Gateway: https://ipfs.io/ipfs/{ipfsCid}</Text>}
    </View>
  );
}

export default IpfsUploadComponent;
```

## 6. Integrasi Livepeer untuk Video Streaming

Livepeer adalah solusi terdesentralisasi yang kuat untuk video streaming, sangat cocok untuk konten pembelajaran berbasis video di EduVerse.

### 6.1 Instalasi Dependensi

```bash
npm install @livepeer/react-native expo-av react-native-svg
```

### 6.2 Konfigurasi Livepeer Client

Anda perlu membuat instance `LivepeerClient` dan membungkus aplikasi Anda dengan `LivepeerConfig`. Dapatkan API Key dari [Livepeer Studio](https://livepeer.studio/).

Buat file `src/providers/LivepeerProvider.js`:

```javascript
// src/providers/LivepeerProvider.js
import React from "react";
import { LivepeerConfig, createReactClient, studioProvider } from "@livepeer/react-native";

// Ganti dengan Livepeer API Key Anda dari livepeer.studio
const LIVEPEER_API_KEY = "YOUR_LIVEPEER_API_KEY"; 

const livepeerClient = createReactClient({
  provider: studioProvider({
    apiKey: LIVEPEER_API_KEY,
  }),
});

export function LivepeerProvider({ children }) {
  return (
    <LivepeerConfig client={livepeerClient}>
      {children}
    </LivepeerConfig>
  );
}
```

Kemudian, bungkus komponen root aplikasi Anda dengan `LivepeerProvider` di `App.js` (di dalam `WagmiWeb3ModalProvider`):

```javascript
// App.js
import React from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import { WagmiWeb3ModalProvider } from "./src/providers/WagmiProvider";
import { LivepeerProvider } from "./src/providers/LivepeerProvider";
import MainScreen from "./src/screens/MainScreen";

// Pastikan polyfills diimpor paling awal
import "./polyfills"; 

export default function App() {
  return (
    <WagmiWeb3ModalProvider>
      <LivepeerProvider>
        <SafeAreaView style={styles.container}>
          <MainScreen />
        </SafeAreaView>
      </LivepeerProvider>
    </WagmiWeb3ModalProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
});
```

### 6.3 Mengunggah Video

Livepeer SDK menyediakan hook `useCreateAsset` untuk mengunggah video. Video yang diunggah akan ditranskode dan tersedia untuk streaming.

Buat file `src/services/LivepeerService.js`:

```javascript
// src/services/LivepeerService.js
import { useCreateAsset } from "@livepeer/react-native";
import { useState, useEffect } from "react";

export function useVideoUploader() {
  const [videoFile, setVideoFile] = useState(null);
  const { mutate: createAsset, data, status, error } = useCreateAsset(
    videoFile
      ? {
          name: videoFile.name,
          file: videoFile.file, // File object atau Blob
        }
      : undefined
  );

  const uploadVideo = async (file, fileName) => {
    // `file` harus berupa File object atau Blob. Untuk React Native, Anda perlu mengonversi URI menjadi Blob.
    // Contoh: const response = await fetch(uri); const blob = await response.blob();
    setVideoFile({ name: fileName, file: file });
    createAsset();
  };

  return { uploadVideo, data, status, error };
}
```

### 6.4 Memutar Video

Anda dapat menggunakan komponen `Player` dari `@livepeer/react-native` atau `Video` dari `expo-av`.

```javascript
// Contoh penggunaan di komponen React Native
import React from "react";
import { View, Text } from "react-native";
import { Player } from "@livepeer/react-native";
// import { Video } from "expo-av"; // Jika menggunakan expo-av

function VideoPlayerComponent({ playbackId }) {
  if (!playbackId) {
    return <Text>No video to play.</Text>;
  }
  return (
    <View style={{ width: "100%", height: 200 }}>
      <Player
        playbackId={playbackId} // ID pemutaran dari hasil upload Livepeer
        loop
        muted
        autoPlay
        showPipButton
        showTitle={false}
      />
    </View>
  );
}

// Contoh penggunaan Expo-AV:
/*
function ExpoVideoPlayer({ videoUri }) {
  const video = React.useRef(null);
  const [status, setStatus] = React.useState({});
  return (
    <View>
      <Video
        ref={video}
        source={{ uri: videoUri }} // URL streaming dari Livepeer
        useNativeControls
        resizeMode="contain"
        isLooping
        onPlaybackStatusUpdate={setStatus}
        style={{ width: "100%", height: 200 }}
      />
    </View>
  );
}
*/
```

### 6.5 Video NFT

Livepeer juga menyediakan modul `@livepeer/video-nft` yang dapat mempermudah proses minting NFT dari video yang diunggah. Setelah video diunggah ke Livepeer dan mendapatkan URL IPFS, URL tersebut dapat digunakan sebagai `animation_url` atau `video` di metadata NFT yang kemudian diunggah ke IPFS dan disimpan di `tokenURI` smart contract.

## 7. Pengembangan UI/UX dan Komponen Aplikasi

Setelah integrasi blockchain dan layanan dasar, Anda dapat mulai membangun antarmuka pengguna dApp EduVerse. Gunakan komponen React Native standar dan gaya untuk menciptakan pengalaman pengguna yang responsif.

### 7.1 Contoh Komponen

*   **`WalletStatus.js`**: Menampilkan status koneksi dompet dan alamat pengguna.
*   **`NetworkInfo.js`**: Menampilkan informasi jaringan yang terhubung.
*   **`CoursesScreen.js`**: Menampilkan daftar kursus yang tersedia, berinteraksi dengan `CourseFactory`.
*   **`CertificatesScreen.js`**: Menampilkan sertifikat yang dimiliki pengguna, berinteraksi dengan `CertificateManager`.

Contoh `CoursesScreen.js` (sederhana):

```javascript
// src/screens/CoursesScreen.js
import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Button } from "react-native";
import { useEduVerseContracts, CONTRACT_ADDRESSES } from "../services/SmartContractService";
import { useReadContract } from "wagmi";
import { parseEther } from "viem";
import CourseFactoryABI from "../constants/abi/CourseFactory.json";
import { BLOCKCHAIN_CONFIG } from "../constants/blockchain";

function CoursesScreen() {
  const { courseCount } = useEduVerseContracts();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchCourses() {
      if (typeof courseCount === "undefined" || courseCount === 0) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const fetchedCourses = [];
        for (let i = 1; i <= courseCount; i++) {
          const course = await readContract({
            address: CONTRACT_ADDRESSES.CourseFactory,
            abi: CourseFactoryABI,
            functionName: "courses",
            args: [BigInt(i)],
          });
          fetchedCourses.push({
            id: Number(course[0]),
            name: course[1],
            description: course[2],
            price: Number(course[3]) / 1e18, // Convert from wei to ETH
            durationMonths: Number(course[4]),
            creator: course[5],
          });
        }
        setCourses(fetchedCourses);
      } catch (err) {
        console.error("Failed to fetch courses:", err);
        setError("Failed to load courses. Please check console for details.");
      } finally {
        setLoading(false);
      }
    }
    fetchCourses();
  }, [courseCount]);

  const renderItem = ({ item }) => (
    <View style={styles.courseItem}>
      <Text style={styles.courseTitle}>{item.name}</Text>
      <Text style={styles.courseDescription}>{item.description}</Text>
      <Text style={styles.coursePrice}>Price: {item.price} {BLOCKCHAIN_CONFIG.NATIVE_CURRENCY_SYMBOL}</Text>
      <Text style={styles.courseDuration}>Duration: {item.durationMonths} months</Text>
      <Button title="Purchase License" onPress={() => alert("Purchase functionality to be implemented!")} />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading courses...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Available Courses</Text>
      <FlatList
        data={courses}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        ListEmptyComponent={<Text style={styles.emptyText}>No courses available.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: "#f0f0f0",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  courseItem: {
    backgroundColor: "#ffffff",
    padding: 15,
    marginVertical: 8,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  courseDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  coursePrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  courseDuration: {
    fontSize: 14,
    color: "#555",
    marginBottom: 10,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
    color: "#888",
  },
  errorText: {
    color: "red",
    fontSize: 16,
    textAlign: "center",
  },
});

export default CoursesScreen;
```

## 8. Testing dan Validasi Fungsionalitas

Setelah semua komponen diimplementasikan, lakukan pengujian menyeluruh untuk memastikan semua fungsionalitas bekerja dengan benar.

### 8.1 Menjalankan Aplikasi di Web Browser

Untuk pengujian cepat, Anda dapat menjalankan aplikasi Expo di browser:

```bash
npm run web
```

Ini akan membuka aplikasi di browser default Anda. Anda dapat menggunakan ekstensi dompet browser (seperti MetaMask) atau WalletConnect untuk menguji koneksi.

### 8.2 Menjalankan Aplikasi di Emulator/Perangkat Fisik

Untuk pengujian di perangkat seluler, gunakan Expo Go app. Pindai QR code yang muncul di terminal setelah menjalankan:

```bash
npm start
```

### 8.3 Poin-Poin Pengujian

*   **Koneksi Dompet:** Pastikan aplikasi dapat terhubung dan terputus dari dompet seluler (misalnya, Trust Wallet, Rainbow Wallet) melalui WalletConnect.
*   **Interaksi Smart Contract:** Uji semua fungsi smart contract (misalnya, membuat kursus, membeli lisensi, melacak kemajuan, menerbitkan sertifikat).
*   **Upload IPFS:** Uji fungsionalitas upload gambar/video dan metadata NFT ke layanan IPFS yang Anda pilih.
*   **Streaming Video:** Pastikan video yang diunggah melalui Livepeer dapat diputar dengan benar di aplikasi.
*   **UI/UX Responsif:** Pastikan antarmuka pengguna terlihat baik dan berfungsi di berbagai ukuran layar dan orientasi.
*   **Penanganan Error:** Verifikasi bahwa aplikasi menangani error dengan baik (misalnya, transaksi gagal, koneksi jaringan terputus).

## 9. Dokumentasi Arsitektur dan Panduan Deployment

Dokumentasi adalah kunci untuk pemeliharaan dan pengembangan di masa mendatang. Kami telah membuat dokumen `ARCHITECTURE_DOCUMENTATION.md` yang merinci arsitektur, dependensi, dan pertimbangan keamanan. Anda dapat mengkonversinya ke PDF menggunakan `manus-md-to-pdf`.

### 9.1 Panduan Deployment

*   **Deployment Aplikasi Expo:** Untuk deployment ke toko aplikasi (App Store, Google Play), Anda dapat menggunakan `expo build` atau `expo prebuild` untuk menghasilkan build native, lalu mengunggahnya secara manual. Untuk deployment web, `expo export:web` akan menghasilkan file statis yang dapat di-host di layanan seperti Netlify, Vercel, atau GitHub Pages.
*   **Deployment Smart Contract:** Pastikan smart contract Anda sudah di-deploy ke Manta Pacific Testnet (atau mainnet) dan alamatnya diperbarui di `CONTRACT_ADDRESSES` di `SmartContractService.js`.
*   **Kunci API:** Pastikan semua kunci API (WalletConnect Project ID, Livepeer API Key, kunci IPFS) disimpan dengan aman (misalnya, menggunakan variabel lingkungan atau layanan manajemen rahasia) dan tidak di-hardcode dalam kode produksi.

## Kesimpulan

Migrasi dApp EduVerse ke React Native Expo dengan integrasi langsung ke blockchain, WalletConnect, IPFS, dan Livepeer adalah langkah signifikan menuju aplikasi yang lebih mandiri, efisien, dan terdesentralisasi. Dengan mengikuti panduan ini, Anda akan memiliki fondasi yang kuat untuk mengembangkan dan menskalakan dApp EduVerse Anda. Ingatlah untuk selalu memprioritaskan keamanan, pengujian menyeluruh, dan dokumentasi yang baik dalam setiap tahap pengembangan.


# Tutorial Lengkap Migrasi dApp EduVerse ke React Native Expo

**Penulis:** Manus AI

## Pendahuluan

Tutorial ini akan memandu Anda melalui proses migrasi dApp "EduVerse" dari arsitektur yang mungkin bergantung pada middleware seperti Thirdweb dan MetaMask ke aplikasi React Native Expo yang mandiri dan siap produksi. Kami akan fokus pada integrasi smart contract secara langsung menggunakan Ethers.js, implementasi solusi dompet seluler yang kompatibel (WalletConnect), serta integrasi layanan penyimpanan terdesentralisasi (IPFS) dan streaming video (Livepeer). Tujuan utama adalah menghasilkan kode yang bersih, aman, dan fungsional, dengan UI/UX yang responsif dan terhubung mulus dengan logika smart contract.

## 1. Persiapan Lingkungan Pengembangan

Sebelum memulai, pastikan Anda memiliki lingkungan pengembangan yang sesuai. Kami akan menggunakan Node.js, npm (atau yarn), dan Expo CLI.

### 1.1 Instalasi Node.js dan npm

Pastikan Node.js (versi 16 atau lebih baru) dan npm (atau yarn) terinstal di sistem Anda. Anda dapat mengunduhnya dari [situs resmi Node.js](https://nodejs.org/).

### 1.2 Instalasi Expo CLI

Expo CLI adalah alat baris perintah yang memudahkan pengembangan aplikasi React Native dengan Expo. Instal secara global:

```bash
npm install -g expo-cli
```

### 1.3 Membuat Proyek React Native Expo Baru

Buat proyek Expo baru. Kami akan menamai proyek ini `EduVerseApp`.

```bash
npx create-expo-app EduVerseApp --template blank
cd EduVerseApp
```

### 1.4 Instalasi Dependensi Utama

Kita akan membutuhkan beberapa pustaka untuk interaksi blockchain, koneksi dompet, dan polyfill yang diperlukan untuk lingkungan React Native.

```bash
npm install ethers @walletconnect/modal-react-native @react-native-async-storage/async-storage react-native-get-random-values react-native-svg
npm install react-native-url-polyfill
```

### 1.5 Konfigurasi Polyfill

Beberapa pustaka Web3 memerlukan polyfill untuk berfungsi dengan baik di lingkungan React Native. Buat file `polyfills.js` di root proyek Anda (`EduVerseApp/polyfills.js`):

```javascript
// polyfills.js
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
```

Kemudian, impor file `polyfills.js` ini di baris paling atas file `App.js` Anda:

```javascript
// App.js
import './polyfills';
// ... kode App.js lainnya
```

### 1.6 Struktur Direktori Proyek

Untuk menjaga kode tetap terorganisir, buat struktur direktori berikut di dalam folder `EduVerseApp`:

```
mkdir -p src/providers src/screens src/components src/services src/constants src/utils src/constants/abi
```

## 2. Konfigurasi Blockchain

EduVerse dApp akan berinteraksi dengan Manta Pacific Testnet. Kita perlu mendefinisikan konfigurasi jaringan ini.

### 2.1 File `blockchain.js`

Buat file `src/constants/blockchain.js` dan tambahkan konfigurasi Manta Pacific Testnet:

```javascript
// src/constants/blockchain.js
export const BLOCKCHAIN_CONFIG = {
  CHAIN_ID: 3441006, // Chain ID untuk Manta Pacific Testnet
  RPC_URL: 'https://pacific-rpc.sepolia-testnet.manta.network/http', // RPC URL resmi
  CHAIN_NAME: 'Manta Pacific Testnet',
  NATIVE_CURRENCY_SYMBOL: 'ETH',
  BLOCK_EXPLORER_URL: 'https://pacific-explorer.sepolia-testnet.manta.network/',
};
```

## 3. Ekstraksi dan Penggunaan ABI Smart Contract

ABI (Application Binary Interface) adalah jembatan antara aplikasi Anda dan smart contract di blockchain. Kami akan mengekstrak ABI dari file JSON yang Anda berikan dan menyimpannya di proyek.

### 3.1 Menyimpan File ABI

Anda telah menyediakan file JSON untuk setiap smart contract. Simpan file-file ABI ini di direktori `src/constants/abi/`:

*   `CertificateManager.json`
*   `CourseFactory.json`
*   `CourseLicense.json`
*   `MockV3Aggregator.json`
*   `PlatformFactory.json`
*   `PlatformRegistry.json`
*   `ProgressTracker.json`

Pastikan hanya bagian `abi` dari file JSON yang disimpan. Contoh untuk `CertificateManager.json`:

```json
// src/constants/abi/CertificateManager.json
[
  // ... array ABI dari file JSON Anda ...
]
```

### 3.2 Interaksi Smart Contract dengan Ethers.js

Ethers.js adalah pustaka JavaScript yang kuat untuk berinteraksi dengan blockchain Ethereum dan kompatibel. Kita akan membuat layanan untuk mengelola interaksi dengan smart contract EduVerse.

Buat file `src/services/SmartContractService.js`:

```javascript
// src/services/SmartContractService.js
import { ethers } from 'ethers';
import { BLOCKCHAIN_CONFIG } from '../constants/blockchain';

// Import semua ABI yang diperlukan
import CertificateManagerABI from '../constants/abi/CertificateManager.json';
import CourseFactoryABI from '../constants/abi/CourseFactory.json';
import CourseLicenseABI from '../constants/abi/CourseLicense.json';
import MockV3AggregatorABI from '../constants/abi/MockV3Aggregator.json';
import PlatformFactoryABI from '../constants/abi/PlatformFactory.json';
import PlatformRegistryABI from '../constants/abi/PlatformRegistry.json';
import ProgressTrackerABI from '../constants/abi/ProgressTracker.json';

// Alamat kontrak yang sudah di-deploy (ganti dengan alamat yang sebenarnya dari deployed-contracts.json Anda)
const CONTRACT_ADDRESSES = {
  CertificateManager: '0x...', // Ganti dengan alamat sebenarnya
  CourseFactory: '0x...',    // Ganti dengan alamat sebenarnya
  CourseLicense: '0x...',    // Ganti dengan alamat sebenarnya
  MockV3Aggregator: '0x...', // Ganti dengan alamat sebenarnya
  PlatformFactory: '0x...',  // Ganti dengan alamat sebenarnya
  PlatformRegistry: '0x...',// Ganti dengan alamat sebenarnya
  ProgressTracker: '0x...',  // Ganti dengan alamat sebenarnya
};

export class SmartContractService {
  constructor(signerOrProvider) {
    this.signerOrProvider = signerOrProvider;
    this.contracts = {};

    // Inisialisasi setiap kontrak
    this.contracts.CertificateManager = new ethers.Contract(
      CONTRACT_ADDRESSES.CertificateManager,
      CertificateManagerABI,
      this.signerOrProvider
    );
    this.contracts.CourseFactory = new ethers.Contract(
      CONTRACT_ADDRESSES.CourseFactory,
      CourseFactoryABI,
      this.signerOrProvider
    );
    this.contracts.CourseLicense = new ethers.Contract(
      CONTRACT_ADDRESSES.CourseLicense,
      CourseLicenseABI,
      this.signerOrProvider
    );
    this.contracts.MockV3Aggregator = new ethers.Contract(
      CONTRACT_ADDRESSES.MockV3Aggregator,
      MockV3AggregatorABI,
      this.signerOrProvider
    );
    this.contracts.PlatformFactory = new ethers.Contract(
      CONTRACT_ADDRESSES.PlatformFactory,
      PlatformFactoryABI,
      this.signerOrProvider
    );
    this.contracts.PlatformRegistry = new ethers.Contract(
      CONTRACT_ADDRESSES.PlatformRegistry,
      PlatformRegistryABI,
      this.signerOrProvider
    );
    this.contracts.ProgressTracker = new ethers.Contract(
      CONTRACT_ADDRESSES.ProgressTracker,
      ProgressTrackerABI,
      this.signerOrProvider
    );
  }

  // Contoh fungsi interaksi dengan kontrak CourseFactory
  async createCourse(name, description, price, durationMonths) {
    try {
      const tx = await this.contracts.CourseFactory.createCourse(
        name, description, ethers.utils.parseEther(price.toString()), durationMonths
      );
      await tx.wait();
      console.log('Course created successfully:', tx.hash);
      return tx.hash;
    } catch (error) {
      console.error('Error creating course:', error);
      throw error;
    }
  }

  async getCourseDetails(courseId) {
    try {
      const course = await this.contracts.CourseFactory.courses(courseId);
      return {
        id: course.id.toString(),
        name: course.name,
        description: course.description,
        price: ethers.utils.formatEther(course.price),
        durationMonths: course.durationMonths.toString(),
        creator: course.creator,
      };
    } catch (error) {
      console.error('Error getting course details:', error);
      throw error;
    }
  }

  // Tambahkan fungsi-fungsi lain untuk interaksi dengan kontrak lainnya
  // Contoh: mintLicense, renewLicense, trackProgress, issueCertificate, dll.
}

// Hook kustom untuk menggunakan SmartContractService
// src/utils/useSmartContract.js
import { useState, useEffect, useCallback } from 'react';
import { SmartContractService } from '../services/SmartContractService';
import { useWalletConnect } from '../providers/WalletConnectProvider';

export function useSmartContract() {
  const { signer, provider, isConnected } = useWalletConnect();
  const [contractService, setContractService] = useState(null);

  useEffect(() => {
    if (isConnected && signer) {
      setContractService(new SmartContractService(signer));
    } else if (provider) {
      // Jika tidak terhubung dengan wallet, gunakan provider saja untuk read-only operations
      setContractService(new SmartContractService(provider));
    } else {
      setContractService(null);
    }
  }, [isConnected, signer, provider]);

  return contractService;
}
```

## 4. Integrasi Dompet Web3 Seluler (WalletConnect)

WalletConnect adalah protokol komunikasi open-source untuk menghubungkan dApps ke dompet seluler. Kami akan menggunakan `@walletconnect/modal-react-native` untuk integrasi yang mulus.

### 4.1 Konfigurasi WalletConnect Provider

Buat file `src/providers/WalletConnectProvider.js`:

```javascript
// src/providers/WalletConnectProvider.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { WalletConnectModal } from '@walletconnect/modal-react-native';
import { ethers } from 'ethers';
import { BLOCKCHAIN_CONFIG } from '../constants/blockchain';

const WalletConnectContext = createContext();

export const useWalletConnect = () => {
  const context = useContext(WalletConnectContext);
  if (!context) {
    throw new Error('useWalletConnect must be used within WalletConnectProvider');
  }
  return context;
};

export const WalletConnectProvider = ({ children }) => {
  // TODO: Ganti dengan Project ID WalletConnect Anda yang sebenarnya dari cloud.walletconnect.com
  // Anda bisa mendapatkan Project ID gratis setelah mendaftar di WalletConnect Cloud.
  const WALLETCONNECT_PROJECT_ID = 'YOUR_WALLETCONNECT_PROJECT_ID'; 

  const providerMetadata = {
    name: 'EduVerse',
    description: 'Educational DApp on Manta Pacific',
    url: 'https://eduverse.app', // Ganti dengan URL dApp Anda
    icons: ['https://eduverse.app/icon.png'], // Ganti dengan ikon dApp Anda
    redirect: {
      native: 'eduverse://', // Skema URL kustom untuk deep linking
      universal: 'https://eduverse.app', // Universal link untuk deep linking
    },
  };

  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState('');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    initializeModal();
  }, []);

  const initializeModal = async () => {
    try {
      const walletConnectModal = new WalletConnectModal({
        projectId: WALLETCONNECT_PROJECT_ID,
        metadata: providerMetadata,
        chains: [BLOCKCHAIN_CONFIG.CHAIN_ID],
        rpcMap: {
          [BLOCKCHAIN_CONFIG.CHAIN_ID]: BLOCKCHAIN_CONFIG.RPC_URL,
        },
      });

      setModal(walletConnectModal);

      // Event listeners untuk status sesi
      walletConnectModal.on('session_event', (event) => {
        console.log('Session event:', event);
      });

      walletConnectModal.on('session_update', (event) => {
        console.log('Session update:', event);
      });

      walletConnectModal.on('session_delete', (event) => {
        console.log('Session deleted:', event);
        handleDisconnect();
      });

    } catch (error) {
      console.error('Failed to initialize WalletConnect modal:', error);
    }
  };

  const connectWallet = async () => {
    if (!modal) {
      console.error('WalletConnect modal not initialized');
      return;
    }

    try {
      // Membuka modal koneksi WalletConnect
      const { uri, approval } = await modal.connect();
      
      if (uri) {
        console.log('WalletConnect URI:', uri);
        // Di sini Anda bisa menampilkan QR code atau instruksi deep linking jika diperlukan
      }

      const session = await approval();
      
      if (session) {
        await handleSessionApproval(session);
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const handleSessionApproval = async (session) => {
    try {
      // Menggunakan provider dari WalletConnect untuk Ethers.js
      const web3Provider = new ethers.providers.Web3Provider(modal.getProvider());
      const web3Signer = web3Provider.getSigner();
      const userAddress = await web3Signer.getAddress();

      setProvider(web3Provider);
      setSigner(web3Signer);
      setAddress(userAddress);
      setIsConnected(true);

      console.log('Wallet connected:', userAddress);
    } catch (error) {
      console.error('Failed to handle session approval:', error);
    }
  };

  const disconnectWallet = async () => {
    try {
      if (modal) {
        await modal.disconnect();
      }
      handleDisconnect();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      handleDisconnect(); // Pastikan status terputus meskipun ada error
    }
  };

  const handleDisconnect = () => {
    setProvider(null);
    setSigner(null);
    setAddress('');
    setIsConnected(false);
    console.log('Wallet disconnected');
  };

  const value = {
    isConnected,
    address,
    provider,
    signer,
    connectWallet,
    disconnectWallet,
    modal,
  };

  return (
    <WalletConnectContext.Provider value={value}>
      {children}
    </WalletConnectContext.Provider>
  );
};
```

### 4.2 Konfigurasi Deep Linking (App Scheme)

Untuk memungkinkan dompet seluler kembali ke aplikasi Anda setelah koneksi atau transaksi, Anda perlu mengkonfigurasi deep linking di `app.json` (atau `app.config.js`) proyek Expo Anda. Tambahkan properti `scheme` di bagian `expo`:

```json
// app.json
{
  "expo": {
    "name": "EduVerseApp",
    "slug": "eduverseapp",
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
      "bundleIdentifier": "com.yourcompany.eduverseapp",
      "associatedDomains": ["applinks:eduverse.app"]
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.yourcompany.eduverseapp",
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [
            {
              "scheme": "eduverse",
              "host": "*"
            }
          ],
          "category": [
            "BROWSABLE",
            "DEFAULT"
          ]
        }
      ]
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "scheme": "eduverse" // <-- Tambahkan ini
  }
}
```

Pastikan `bundleIdentifier` (iOS) dan `package` (Android) sesuai dengan identifikasi aplikasi Anda. Properti `associatedDomains` (iOS) dan `intentFilters` (Android) penting untuk universal linking dan deep linking.

### 4.3 Menggunakan WalletConnect di Komponen Anda

Sekarang Anda dapat menggunakan hook `useWalletConnect` di komponen React Native Anda untuk mengelola koneksi dompet.

```javascript
// src/screens/MainScreen.js (Contoh)
import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useWalletConnect } from '../providers/WalletConnectProvider';
import { BLOCKCHAIN_CONFIG } from '../constants/blockchain';

function MainScreen() {
  const { isConnected, address, connectWallet, disconnectWallet } = useWalletConnect();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Selamat Datang di EduVerse</Text>
      {!isConnected ? (
        <Button title="Connect Wallet" onPress={connectWallet} />
      ) : (
        <View>
          <Text>Connected to {BLOCKCHAIN_CONFIG.CHAIN_NAME}</Text>
          <Text>Address: {address.substring(0, 6)}...{address.substring(address.length - 4)}</Text>
          <Button title="Disconnect Wallet" onPress={disconnectWallet} />
        </View>
      )}
      {/* Tambahkan navigasi ke layar lain atau komponen dApp di sini */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});

export default MainScreen;
```

Dan pastikan `App.js` Anda menggunakan `WalletConnectProvider`:

```javascript
// App.js
import './polyfills';
import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { WalletConnectProvider } from './src/providers/WalletConnectProvider';
import MainScreen from './src/screens/MainScreen';

export default function App() {
  return (
    <WalletConnectProvider>
      <SafeAreaView style={styles.container}>
        <MainScreen />
      </SafeAreaView>
    </WalletConnectView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
```

## 5. Integrasi IPFS (InterPlanetary File System)

Untuk penyimpanan metadata dan file media seperti gambar dan video, penggunaan IPFS sangat direkomendasikan karena sifatnya yang terdesentralisasi dan tahan sensor. Ada beberapa layanan IPFS gratis yang dapat digunakan, seperti Web3.Storage (sekarang Storacha), Filebase, dan Pinata. Bagian ini akan membahas integrasi dengan layanan-layanan tersebut.

### 5.1 Web3.Storage (Storacha)

Web3.Storage, yang baru-baru ini berganti nama menjadi Storacha, adalah layanan penyimpanan file yang sederhana dan efisien untuk IPFS dan Filecoin. Layanan ini menyediakan API dan client library yang memudahkan pengembang untuk mengunggah dan mengambil data secara terdesentralisasi. Storacha menawarkan 5 GB penyimpanan gratis, yang cukup untuk kebutuhan awal proyek.

#### Instalasi

Tambahkan paket `w3up-client` ke proyek Anda:

```bash
npm install @web3-storage/w3up-client
```

#### Inisialisasi dan Autentikasi

Sebelum dapat mengunggah file, Anda perlu menginisialisasi client dan melakukan autentikasi. Proses autentikasi melibatkan pembuatan akun dan otorisasi melalui email. Setelah itu, Anda dapat membuat 'space' (ruang penyimpanan) untuk mengelola unggahan Anda.

```javascript
// src/services/IpfsService.js (bagian Web3.Storage)
import * as Client from '@web3-storage/w3up-client';
// import { filesFromPaths } from 'files-from-path'; // Untuk lingkungan Node.js/web

// Fungsi untuk menginisialisasi client Web3.Storage
export async function setupWeb3Storage() {
  const client = await Client.create();

  // Proses login dan pembuatan space biasanya dilakukan sekali secara manual atau melalui alur khusus.
  // Untuk produksi, Anda mungkin akan menyimpan DID space dan account di tempat aman.
  // Contoh alur login (hanya perlu dijalankan sekali untuk mendapatkan account dan space):
  /*
  if (!Object.keys(client.accounts()).length) {
    const account = await client.login('your-email@example.com');
    console.log('Please check your email to verify your account and click the link.');
    // Setelah verifikasi, Anda bisa membuat space dan memprovision-nya
    // const space = await client.createSpace('my-eduverse-space');
    // await space.save();
    // await account.provision(space.did());
    // client.setCurrentSpace(space.did()); // Set space aktif
  }
  */

  // Pastikan ada space yang aktif. Jika tidak, Anda perlu membuatnya atau memuatnya.
  // Ini adalah contoh placeholder. Dalam aplikasi nyata, Anda akan memuat DID space yang sudah ada.
  // const spaceDID = 'did:key:YOUR_SPACE_DID'; // Ganti dengan DID space Anda yang sebenarnya
  // const space = await client.loadSpace(spaceDID);
  // client.setCurrentSpace(space.did());

  return client;
}

// Fungsi untuk mengunggah file
export async function uploadFileToWeb3Storage(client, file, fileName) {
  try {
    // `file` harus berupa Blob atau File object. Untuk React Native, Anda perlu mengonversi URI menjadi Blob.
    // Contoh: const response = await fetch(uri); const blob = await response.blob();
    const fileToUpload = new File([file], fileName, { type: file.type });
    const cid = await client.uploadFile(fileToUpload);
    console.log('Uploaded file with CID:', cid.toString());
    return cid.toString();
  } catch (error) {
    console.error('Error uploading file to Web3.Storage:', error);
    throw error;
  }
}

// Fungsi untuk mengunggah metadata NFT
export async function uploadNftMetadataToWeb3Storage(client, name, description, imageCid, videoCid = null) {
  const metadata = {
    name: name,
    description: description,
    image: `ipfs://${imageCid}`, // Link ke gambar di IPFS
    animation_url: videoCid ? `ipfs://${videoCid}` : undefined, // Link ke video di IPFS (opsional)
    attributes: [
      { trait_type: "Course", value: "Blockchain Fundamentals" },
      { trait_type: "Instructor", value: "Manus AI" }
    ]
  };

  const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
  const metadataCid = await uploadFileToWeb3Storage(client, metadataBlob, 'metadata.json');

  console.log('NFT Metadata uploaded with CID:', metadataCid);
  return metadataCid;
}
```

### 5.2 Filebase

Filebase adalah platform penyimpanan objek yang kompatibel dengan S3 yang dibangun di atas jaringan IPFS dan Sia. Ini menawarkan 5 GB penyimpanan gratis dan dukungan untuk hingga 1000 file. Keunggulan Filebase adalah kompatibilitasnya dengan API S3, yang berarti Anda dapat menggunakan SDK S3 standar untuk mengunggah file.

#### Instalasi

```bash
npm install @aws-sdk/client-s3 @aws-sdk/lib-storage
```

#### Konfigurasi dan Unggah

Anda perlu mendapatkan kunci API (Access Key ID dan Secret Access Key) dari dashboard Filebase Anda.

```javascript
// src/services/IpfsService.js (bagian Filebase)
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

const FILEBASE_ENDPOINT = "https://s3.filebase.com";
const FILEBASE_ACCESS_KEY_ID = "YOUR_FILEBASE_ACCESS_KEY_ID"; // Ganti dengan kunci Anda
const FILEBASE_SECRET_ACCESS_KEY = "YOUR_FILEBASE_SECRET_ACCESS_KEY"; // Ganti dengan kunci Anda
const FILEBASE_BUCKET_NAME = "your-eduverse-bucket"; // Ganti dengan nama bucket Anda

const s3Client = new S3Client({
  endpoint: FILEBASE_ENDPOINT,
  region: "us-east-1", 
  credentials: {
    accessKeyId: FILEBASE_ACCESS_KEY_ID,
    secretAccessKey: FILEBASE_SECRET_ACCESS_KEY,
  },
});

export async function uploadFileToFilebase(file, fileName, contentType) {
  try {
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: FILEBASE_BUCKET_NAME,
        Key: fileName,
        Body: file, 
        ACL: 'public-read', 
        ContentType: contentType, 
      },
    });

    await upload.done();
    // Filebase akan menyediakan IPFS gateway. Anda bisa mendapatkan CID dari dashboard Filebase setelah upload.
    // Atau, Anda bisa membangun URL IPFS secara manual jika Filebase menyediakan pola yang konsisten.
    const ipfsGatewayUrl = `https://${FILEBASE_BUCKET_NAME}.ipfs.filebase.io/${fileName}`;
    console.log('File uploaded to Filebase:', ipfsGatewayUrl);
    return ipfsGatewayUrl;
  } catch (error) {
    console.error('Error uploading to Filebase:', error);
    throw error;
  }
}
```

### 5.3 Pinata

Pinata adalah layanan pinning IPFS populer lainnya yang menawarkan 1 GB penyimpanan gratis. Pinata menyediakan API yang kuat untuk mengelola file IPFS Anda. Anda akan memerlukan kunci API Pinata (API Key dan Secret API Key) dari dashboard mereka.

#### Instalasi (opsional, jika menggunakan axios)

```bash
npm install axios
```

#### Konfigurasi dan Unggah

```javascript
// src/services/IpfsService.js (bagian Pinata)
import axios from 'axios';

const PINATA_API_KEY = "YOUR_PINATA_API_KEY"; // Ganti dengan kunci Anda
const PINATA_SECRET_API_KEY = "YOUR_PINATA_SECRET_API_KEY"; // Ganti dengan kunci Anda

export async function uploadFileToPinata(file, fileName, contentType) {
  try {
    const formData = new FormData();
    formData.append('file', file, fileName);

    const res = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      formData,
      {
        maxBodyLength: Infinity,
        headers: {
          'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_SECRET_API_KEY,
        },
      }
    );

    console.log('File uploaded to Pinata:', res.data);
    const ipfsHash = res.data.IpfsHash;
    const ipfsUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
    return ipfsUrl;
  } catch (error) {
    console.error('Error uploading to Pinata:', error.response ? error.response.data : error.message);
    throw error;
  }
}
```

## 6. Integrasi Livepeer untuk Video Streaming

Livepeer adalah jaringan video terdesentralisasi yang memungkinkan pengembang untuk mengintegrasikan kemampuan streaming video ke dalam aplikasi mereka. Ini sangat cocok untuk dApp EduVerse yang mungkin memiliki konten pembelajaran berupa video.

### 6.1 Instalasi

Instal paket Livepeer React Native dan dependensi yang diperlukan:

```bash
npm install @livepeer/react-native expo-av react-native-svg
```

### 6.2 Konfigurasi Livepeer Client

Anda perlu membuat instance `LivepeerClient` dan membungkus aplikasi Anda dengan `LivepeerConfig`. Dapatkan API Key dari Livepeer Studio.

```javascript
// src/providers/LivepeerProvider.js
import React from "react";
import { LivepeerConfig, createReactClient, studioProvider } from "@livepeer/react-native";

// Ganti dengan Livepeer API Key Anda dari livepeer.studio
const LIVEPEER_API_KEY = "YOUR_LIVEPEER_API_KEY"; 

const livepeerClient = createReactClient({
  provider: studioProvider({
    apiKey: LIVEPEER_API_KEY,
  }),
});

export function LivepeerProvider({ children }) {
  return (
    <LivepeerConfig client={livepeerClient}>
      {children}
    </LivepeerConfig>
  );
}
```

Kemudian, bungkus komponen root aplikasi Anda dengan `LivepeerProvider` di `App.js` (di dalam `WalletConnectProvider`):

```javascript
// App.js
import './polyfills';
import React from 'react';
import { SafeAreaView, StyleSheet }n 'react-native';
import { WalletConnectProvider } from './src/providers/WalletConnectProvider';
import { LivepeerProvider } from './src/providers/LivepeerProvider';
import MainScreen from './src/screens/MainScreen';

export default function App() {
  return (
    <WalletConnectProvider>
      <LivepeerProvider>
        <SafeAreaView style={styles.container}>
          <MainScreen />
        </SafeAreaView>
      </LivepeerProvider>
    </WalletConnectProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
```

### 6.3 Mengunggah Video

Livepeer SDK menyediakan hook `useCreateAsset` untuk mengunggah video. Video yang diunggah akan ditranskode dan tersedia untuk streaming.

```javascript
// src/services/LivepeerService.js
import { useCreateAsset } from "@livepeer/react-native";
import { useState, useEffect } from "react";

export function useVideoUploader() {
  const [videoFile, setVideoFile] = useState(null);
  const { mutate: createAsset, data, status, error } = useCreateAsset(
    videoFile
      ? {
          name: videoFile.name,
          file: videoFile.file, // File object atau Blob
        }
      : undefined
  );

  const uploadVideo = async (file, fileName) => {
    // `file` harus berupa File object atau Blob. Untuk React Native, Anda perlu mengonversi URI menjadi Blob.
    // Contoh: const response = await fetch(uri); const blob = await response.blob();
    setVideoFile({ name: fileName, file: file });
    createAsset();
  };

  return { uploadVideo, data, status, error };
}
```

### 6.4 Memutar Video

Anda dapat menggunakan komponen `Player` dari `@livepeer/react-native` atau `Video` dari `expo-av`.

```javascript
// Contoh penggunaan di komponen React Native
import React from 'react';
import { View, Text } from 'react-native';
import { Player } from "@livepeer/react-native";
// import { Video } from 'expo-av'; // Jika menggunakan expo-av

function VideoPlayerComponent({ playbackId }) {
  if (!playbackId) {
    return <Text>No video to play.</Text>;
  }
  return (
    <View style={{ width: '100%', height: 200 }}>
      <Player
        playbackId={playbackId} // ID pemutaran dari hasil upload Livepeer
        loop
        muted
        autoPlay
        showPipButton
        showTitle={false}
      />
    </View>
  );
}

// Contoh penggunaan Expo-AV:
/*
function ExpoVideoPlayer({ videoUri }) {
  const video = React.useRef(null);
  const [status, setStatus] = React.useState({});
  return (
    <View>
      <Video
        ref={video}
        source={{ uri: videoUri }} // URL streaming dari Livepeer
        useNativeControls
        resizeMode="contain"
        isLooping
        onPlaybackStatusUpdate={setStatus}
        style={{ width: '100%', height: 200 }}
      />
    </View>
  );
}
*/
```

### 6.5 Video NFT

Livepeer juga menyediakan modul `@livepeer/video-nft` yang dapat mempermudah proses minting NFT dari video yang diunggah. Setelah video diunggah ke Livepeer dan mendapatkan URL IPFS, URL tersebut dapat digunakan sebagai `animation_url` atau `video` di metadata NFT yang kemudian diunggah ke IPFS dan disimpan di `tokenURI` smart contract.

## 7. Pengembangan UI/UX dan Komponen Aplikasi

Setelah integrasi blockchain dan layanan dasar, Anda dapat mulai membangun antarmuka pengguna dApp EduVerse. Gunakan komponen React Native standar dan gaya untuk menciptakan pengalaman pengguna yang responsif.

### 7.1 Contoh Komponen

*   **`WalletStatus.js`**: Menampilkan status koneksi dompet dan alamat pengguna.
*   **`NetworkInfo.js`**: Menampilkan informasi jaringan yang terhubung.
*   **`CoursesScreen.js`**: Menampilkan daftar kursus yang tersedia, berinteraksi dengan `CourseFactory`.
*   **`CertificatesScreen.js`**: Menampilkan sertifikat yang dimiliki pengguna, berinteraksi dengan `CertificateManager`.

Contoh `CoursesScreen.js` (sederhana):

```javascript
// src/screens/CoursesScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Button } from 'react-native';
import { useSmartContract } from '../utils/useSmartContract';
import { ethers } from 'ethers';

function CoursesScreen() {
  const contractService = useSmartContract();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchCourses() {
      if (!contractService) return;
      setLoading(true);
      setError(null);
      try {
        // Ini adalah contoh placeholder. Anda perlu mengimplementasikan logika untuk mendapatkan semua course ID.
        // Misalnya, jika CourseFactory memiliki fungsi `getAllCourseIds()` atau event `CourseCreated`.
        // Untuk demo, kita akan membuat course dummy atau mengambil satu course yang diketahui ID-nya.
        const courseId = 1; // Ganti dengan ID course yang valid di testnet Anda
        const course = await contractService.getCourseDetails(courseId);
        setCourses([course]);
      } catch (err) {
        console.error('Failed to fetch courses:', err);
        setError('Failed to load courses. Please check console for details.');
      } finally {
        setLoading(false);
      }
    }
    fetchCourses();
  }, [contractService]);

  const renderItem = ({ item }) => (
    <View style={styles.courseItem}>
      <Text style={styles.courseTitle}>{item.name}</Text>
      <Text style={styles.courseDescription}>{item.description}</Text>
      <Text style={styles.coursePrice}>Price: {item.price} {BLOCKCHAIN_CONFIG.NATIVE_CURRENCY_SYMBOL}</Text>
      <Text style={styles.courseDuration}>Duration: {item.durationMonths} months</Text>
      <Button title="Purchase License" onPress={() => alert('Purchase functionality to be implemented!')} />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading courses...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Available Courses</Text>
      <FlatList
        data={courses}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        ListEmptyComponent={<Text style={styles.emptyText}>No courses available.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f0f0f0',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  courseItem: {
    backgroundColor: '#ffffff',
    padding: 15,
    marginVertical: 8,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  courseDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  coursePrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  courseDuration: {
    fontSize: 14,
    color: '#555',
    marginBottom: 10,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#888',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default CoursesScreen;
```

## 8. Testing dan Validasi Fungsionalitas

Setelah semua komponen diimplementasikan, lakukan pengujian menyeluruh untuk memastikan semua fungsionalitas bekerja dengan benar.

### 8.1 Menjalankan Aplikasi di Web Browser

Untuk pengujian cepat, Anda dapat menjalankan aplikasi Expo di browser:

```bash
npm run web
```

Ini akan membuka aplikasi di browser default Anda. Anda dapat menggunakan ekstensi dompet browser (seperti MetaMask) atau WalletConnect untuk menguji koneksi.

### 8.2 Menjalankan Aplikasi di Emulator/Perangkat Fisik

Untuk pengujian di perangkat seluler, gunakan Expo Go app. Pindai QR code yang muncul di terminal setelah menjalankan:

```bash
npm start
```

### 8.3 Poin-Poin Pengujian

*   **Koneksi Dompet:** Pastikan aplikasi dapat terhubung dan terputus dari dompet seluler (misalnya, Trust Wallet, Rainbow Wallet) melalui WalletConnect.
*   **Interaksi Smart Contract:** Uji semua fungsi smart contract (misalnya, membuat kursus, membeli lisensi, melacak kemajuan, menerbitkan sertifikat).
*   **Upload IPFS:** Uji fungsionalitas upload gambar/video dan metadata NFT ke layanan IPFS yang Anda pilih.
*   **Streaming Video:** Pastikan video yang diunggah melalui Livepeer dapat diputar dengan benar di aplikasi.
*   **UI/UX Responsif:** Pastikan antarmuka pengguna terlihat baik dan berfungsi di berbagai ukuran layar dan orientasi.
*   **Penanganan Error:** Verifikasi bahwa aplikasi menangani error dengan baik (misalnya, transaksi gagal, koneksi jaringan terputus).

## 9. Dokumentasi Arsitektur dan Panduan Deployment

Dokumentasi adalah kunci untuk pemeliharaan dan pengembangan di masa mendatang. Kami telah membuat dokumen `ARCHITECTURE_DOCUMENTATION.md` yang merinci arsitektur, dependensi, dan pertimbangan keamanan. Anda dapat mengkonversinya ke PDF menggunakan `manus-md-to-pdf`.

### 9.1 Panduan Deployment

*   **Deployment Aplikasi Expo:** Untuk deployment ke toko aplikasi (App Store, Google Play), Anda dapat menggunakan `expo build` atau `expo prebuild` untuk menghasilkan build native, lalu mengunggahnya secara manual. Untuk deployment web, `expo export:web` akan menghasilkan file statis yang dapat di-host di layanan seperti Netlify, Vercel, atau GitHub Pages.
*   **Deployment Smart Contract:** Pastikan smart contract Anda sudah di-deploy ke Manta Pacific Testnet (atau mainnet) dan alamatnya diperbarui di `CONTRACT_ADDRESSES` di `SmartContractService.js`.
*   **Kunci API:** Pastikan semua kunci API (WalletConnect Project ID, Livepeer API Key, kunci IPFS) disimpan dengan aman (misalnya, menggunakan variabel lingkungan atau layanan manajemen rahasia) dan tidak di-hardcode dalam kode produksi.

## Kesimpulan

Migrasi dApp EduVerse ke React Native Expo dengan integrasi langsung ke blockchain, WalletConnect, IPFS, dan Livepeer adalah langkah signifikan menuju aplikasi yang lebih mandiri, efisien, dan terdesentralisasi. Dengan mengikuti panduan ini, Anda akan memiliki fondasi yang kuat untuk mengembangkan dan menskalakan dApp EduVerse Anda. Ingatlah untuk selalu memprioritaskan keamanan, pengujian menyeluruh, dan dokumentasi yang baik dalam setiap tahap pengembangan.