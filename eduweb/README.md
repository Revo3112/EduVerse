# EduVerse Web3 Frontend - Thirdweb v5 Integration

This is the Next.js frontend for EduVerse, integrated with Thirdweb v5 SDK for Web3 functionality on Manta Pacific Testnet.

## ✅ Setup Complete

Your EduVerse eduweb project is now fully configured with:

- **Thirdweb v5 SDK** - Latest Web3 development framework
- **Manta Pacific Testnet** - Chain ID: 3441006
- **Auto-Synced Contracts** - Integrated with EduVerse portal system
- **Next.js 15 + React 19** - Latest React features
- **Tailwind CSS v4** - Modern styling

## 🔧 Next Steps

### 1. Get Your Thirdweb Client ID (Required)

1. Visit [https://thirdweb.com/create-api-key](https://thirdweb.com/create-api-key)
2. Create a free account or sign in
3. Create a new project
4. Add `localhost:3000` to allowed domains
5. Copy your Client ID
6. Update `.env` file:

```env
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_actual_client_id_here
```

### 2. Start the Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your EduVerse Web3 app!

## 📖 10 Thirdweb Documentation Resources (2025)

Here are the essential Thirdweb documentation links for your reference:

1. **[Portal Thirdweb](https://portal.thirdweb.com/)** - Main documentation hub
2. **[React SDK v5](https://portal.thirdweb.com/react/v5)** - React integration guide
3. **[TypeScript SDK v5](https://portal.thirdweb.com/typescript/v5)** - Core TypeScript SDK
4. **[Getting Started Guide](https://portal.thirdweb.com/react/v5/getting-started)** - Setup tutorial
5. **[Client Configuration](https://portal.thirdweb.com/typescript/v5/client)** - Client setup
6. **[Wallets & Connect](https://portal.thirdweb.com/connect)** - Wallet integration
7. **[Smart Contracts](https://portal.thirdweb.com/contracts)** - Contract operations
8. **[CLI Documentation](https://portal.thirdweb.com/cli)** - Command line tools
9. **[Extensions System](https://portal.thirdweb.com/react/v5/extensions)** - Advanced features
10. **[Live Playground](https://playground.thirdweb.com/)** - Interactive testing

## 🏗️ Project Structure

```
eduweb/
├── src/
│   ├── lib/
│   │   ├── client.ts          # Thirdweb client configuration
│   │   ├── chains.ts          # Manta Pacific chain setup
│   │   ├── contracts.ts       # EduVerse contract instances
│   │   └── index.ts           # Exports
│   └── components/
│       ├── ConnectWallet.tsx  # Wallet connection component
│       ├── Web3Status.tsx     # Wallet status display
│       ├── CourseInteraction.tsx # Contract interaction example
│       └── index.ts           # Component exports
├── app/
│   ├── layout.tsx             # Root layout with ThirdwebProvider
│   └── page.tsx               # Main page with Web3 demo
└── .env                       # Environment variables
```

## 🎯 Available Components

### ConnectWallet
Pre-built wallet connection with support for 500+ wallets:
```tsx
import { ConnectWallet } from "../src/components/ConnectWallet";

<ConnectWallet />
```

### Web3Status
Display connected wallet information:
```tsx
import { Web3Status } from "../src/components/Web3Status";

<Web3Status />
```

### CourseInteraction
Example contract interaction with EduVerse contracts:
```tsx
import { CourseInteraction } from "../src/components/CourseInteraction";

<CourseInteraction />
```

## 🔗 EduVerse Contract Integration

Your contracts are auto-configured and ready to use:

```tsx
import {
  courseFactory,
  courseLicense,
  progressTracker,
  certificateManager
} from "../src/lib/contracts";
import { useReadContract, useSendTransaction } from "thirdweb/react";

// Read from contract
const { data } = useReadContract({
  contract: courseFactory,
  method: "function getAllCourses() view returns (tuple[])",
});

// Write to contract
const { mutate: sendTransaction } = useSendTransaction();
const createCourse = () => {
  const transaction = prepareContractCall({
    contract: courseFactory,
    method: "function createCourse(string memory title, string memory description)",
    params: ["Course Title", "Course Description"],
  });
  sendTransaction(transaction);
};
```

## ⚙️ Environment Variables

Your `.env` file includes:
- ✅ Contract addresses (auto-synced by EduVerse portal)
- ✅ Chain configuration (Manta Pacific Testnet)
- ✅ RPC URL
- ⚠️ Thirdweb Client ID (you need to add this)

## 🚀 Features Ready to Use

- **Wallet Connection** - Connect to 500+ wallets (MetaMask, WalletConnect, etc.)
- **Chain Support** - Manta Pacific Testnet configured
- **Contract Interaction** - Read/write to your deployed EduVerse contracts
- **Type Safety** - Full TypeScript support with type-safe contract calls
- **Modern UI** - Tailwind CSS v4 with beautiful components
- **Portal Integration** - Works with EduVerse portal system for ABI syncing

## 🔄 Portal System Integration

This setup maintains compatibility with your EduVerse portal system:
- Contract addresses are auto-synced from `deployed-contracts.json`
- ABI files are auto-updated in `eduweb/abis/`
- Use `npm run portal` for deployment and contract management

## 🎨 Customization

All components are fully customizable. Modify:
- Styling in component files
- Contract interaction patterns in `contracts.ts`
- Chain configuration in `chains.ts`
- Add new components as needed

## 💡 Tips

1. **Development**: Use `npm run dev` for hot reload
2. **Building**: Use `npm run build` for production
3. **Portal**: Use `npm run portal` for EduVerse operations
4. **Testing**: Connect with different wallets to test functionality
5. **Debugging**: Check browser console for Web3 errors

Enjoy building with EduVerse + Thirdweb v5! 🎉
