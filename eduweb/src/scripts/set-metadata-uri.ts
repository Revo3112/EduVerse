import { prepareContractCall, sendTransaction } from "thirdweb";
import { createThirdwebClient, getContract } from "thirdweb";
import { privateKeyToAccount } from "thirdweb/wallets";
import { mantaPacificTestnet } from "thirdweb/chains";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const CERTIFICATE_MANAGER_ADDRESS =
  process.env.NEXT_PUBLIC_CERTIFICATE_MANAGER_ADDRESS!;
const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
const CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!;

async function setMetadataURI() {
  console.log("[Set Metadata URI] Starting configuration...");

  const client = createThirdwebClient({
    clientId: CLIENT_ID,
  });

  const account = privateKeyToAccount({
    client,
    privateKey: PRIVATE_KEY,
  });

  const contract = getContract({
    client,
    chain: mantaPacificTestnet,
    address: CERTIFICATE_MANAGER_ADDRESS,
  });

  const metadataBaseURI = `${APP_URL}/api/metadata`;

  console.log(`[Set Metadata URI] Setting to: ${metadataBaseURI}`);

  const transaction = prepareContractCall({
    contract,
    method:
      "function updateDefaultMetadataBaseURI(string memory newMetadataBaseURI)",
    params: [metadataBaseURI],
  });

  const { transactionHash } = await sendTransaction({
    transaction,
    account,
  });

  console.log(`[Set Metadata URI] Transaction sent: ${transactionHash}`);
  console.log(
    `[Set Metadata URI] Contract uri() will now return: ${metadataBaseURI}/{tokenId}`
  );
  console.log("[Set Metadata URI] Configuration complete!");
}

setMetadataURI().catch((error) => {
  console.error("[Set Metadata URI] Error:", error);
  process.exit(1);
});
