import { createThirdwebClient, getContract, prepareContractCall, sendTransaction } from "thirdweb";
import { defineChain } from "thirdweb/chains";
import { privateKeyToAccount } from "thirdweb/wallets";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const THIRDWEB_CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!;
const CERTIFICATE_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_CERTIFICATE_MANAGER_ADDRESS!;
const COURSE_LICENSE_ADDRESS = process.env.NEXT_PUBLIC_COURSE_LICENSE_ADDRESS!;
const COURSE_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_COURSE_FACTORY_ADDRESS!;
const PROGRESS_TRACKER_ADDRESS = process.env.NEXT_PUBLIC_PROGRESS_TRACKER_ADDRESS!;
const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "3441006");
const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY!;

if (!PRIVATE_KEY) {
  console.error("❌ WALLET_PRIVATE_KEY not found in .env.local");
  process.exit(1);
}

const client = createThirdwebClient({ clientId: THIRDWEB_CLIENT_ID });
const chain = defineChain(CHAIN_ID);
const account = privateKeyToAccount({ client, privateKey: PRIVATE_KEY });

const certificateManager = getContract({
  client,
  address: CERTIFICATE_MANAGER_ADDRESS,
  chain,
});

const courseLicense = getContract({
  client,
  address: COURSE_LICENSE_ADDRESS,
  chain,
});

const courseFactory = getContract({
  client,
  address: COURSE_FACTORY_ADDRESS,
  chain,
});

const progressTracker = getContract({
  client,
  address: PROGRESS_TRACKER_ADDRESS,
  chain,
});

interface TestResult {
  function: string;
  contract: string;
  status: "✅" | "❌" | "⏭️";
  txHash?: string;
  error?: string;
  note?: string;
}

const results: TestResult[] = [];

async function testTransaction(
  contractName: string,
  functionName: string,
  contract: any,
  method: string,
  params: any[],
  skip: boolean = false
): Promise<void> {
  if (skip) {
    results.push({
      contract: contractName,
      function: functionName,
      status: "⏭️",
      note: "Skipped (destructive action)",
    });
    return;
  }

  try {
    const tx = prepareContractCall({
      contract,
      method,
      params,
    });

    const result = await sendTransaction({ transaction: tx, account });
    results.push({
      contract: contractName,
      function: functionName,
      status: "✅",
      txHash: result.transactionHash,
    });
    console.log(`   ✅ ${functionName} - TX: ${result.transactionHash.substring(0, 10)}...`);
  } catch (error) {
    results.push({
      contract: contractName,
      function: functionName,
      status: "❌",
      error: (error as Error).message.substring(0, 100),
    });
    console.log(`   ❌ ${functionName} - ${(error as Error).message.substring(0, 50)}...`);
  }
}

async function main() {
  console.log("\n🧪 EDUVERSE ADMIN FUNCTION TRANSACTION TESTS\n");
  console.log("========================================\n");
  console.log("⚠️  WARNING: This will execute REAL transactions!");
  console.log("   Make sure you have test funds and are on testnet.\n");
  console.log("📋 Account:", account.address);
  console.log("📋 Chain ID:", CHAIN_ID);
  console.log("\nStarting tests in 3 seconds...\n");

  await new Promise((resolve) => setTimeout(resolve, 3000));

  console.log("🔄 Testing CertificateManager Admin Functions...\n");

  await testTransaction(
    "CertificateManager",
    "setDefaultCertificateFee",
    certificateManager,
    "function setDefaultCertificateFee(uint256 fee)",
    [BigInt("1000000000000000")],
    false
  );

  await testTransaction(
    "CertificateManager",
    "setDefaultCourseAdditionFee",
    certificateManager,
    "function setDefaultCourseAdditionFee(uint256 fee)",
    [BigInt("100000000000000")],
    false
  );

  await testTransaction(
    "CertificateManager",
    "setPlatformWallet",
    certificateManager,
    "function setPlatformWallet(address wallet)",
    [account.address],
    false
  );

  await testTransaction(
    "CertificateManager",
    "setDefaultPlatformName",
    certificateManager,
    "function setDefaultPlatformName(string name)",
    ["EduVerse Academy Test"],
    false
  );

  await testTransaction(
    "CertificateManager",
    "updateDefaultBaseRoute",
    certificateManager,
    "function updateDefaultBaseRoute(string route)",
    ["https://edu-verse-blond.vercel.app/certificates"],
    false
  );

  await testTransaction(
    "CertificateManager",
    "updateDefaultMetadataBaseURI",
    certificateManager,
    "function updateDefaultMetadataBaseURI(string uri)",
    ["https://edu-verse-blond.vercel.app/api/metadata"],
    false
  );

  await testTransaction(
    "CertificateManager",
    "setCourseCertificatePrice",
    certificateManager,
    "function setCourseCertificatePrice(uint256 courseId, uint256 price)",
    [BigInt(1), BigInt("500000000000000")],
    true
  );

  await testTransaction(
    "CertificateManager",
    "setTokenURI",
    certificateManager,
    "function setTokenURI(uint256 tokenId, string tokenURI)",
    [BigInt(1), "https://example.com/metadata/1"],
    true
  );

  await testTransaction(
    "CertificateManager",
    "revokeCertificate",
    certificateManager,
    "function revokeCertificate(uint256 tokenId, string reason)",
    [BigInt(1), "Test revocation"],
    true
  );

  console.log("\n🔄 Testing CourseLicense Admin Functions...\n");

  await testTransaction(
    "CourseLicense",
    "setPlatformFeePercentage",
    courseLicense,
    "function setPlatformFeePercentage(uint256 percentage)",
    [BigInt(200)],
    false
  );

  await testTransaction(
    "CourseLicense",
    "setPlatformWallet",
    courseLicense,
    "function setPlatformWallet(address wallet)",
    [account.address],
    false
  );

  await testTransaction(
    "CourseLicense",
    "setURI",
    courseLicense,
    "function setURI(string uri)",
    ["https://edu-verse-blond.vercel.app/api/license/"],
    false
  );

  await testTransaction(
    "CourseLicense",
    "setCourseMetadataURI",
    courseLicense,
    "function setCourseMetadataURI(uint256 courseId, string uri)",
    [BigInt(1), "https://example.com/course/1"],
    true
  );

  await testTransaction(
    "CourseLicense",
    "emergencyDeactivateLicense",
    courseLicense,
    "function emergencyDeactivateLicense(uint256 tokenId)",
    [BigInt(1)],
    true
  );

  console.log("\n🔄 Testing CourseFactory Admin Functions...\n");

  await testTransaction(
    "CourseFactory",
    "blacklistUser",
    courseFactory,
    "function blacklistUser(address user)",
    ["0x0000000000000000000000000000000000000001"],
    true
  );

  await testTransaction(
    "CourseFactory",
    "unblacklistUser",
    courseFactory,
    "function unblacklistUser(address user)",
    ["0x0000000000000000000000000000000000000001"],
    true
  );

  await testTransaction(
    "CourseFactory",
    "removeRating",
    courseFactory,
    "function removeRating(uint256 courseId, address user)",
    [BigInt(1), "0x0000000000000000000000000000000000000001"],
    true
  );

  await testTransaction(
    "CourseFactory",
    "pauseCourseRatings",
    courseFactory,
    "function pauseCourseRatings(uint256 courseId)",
    [BigInt(1)],
    true
  );

  await testTransaction(
    "CourseFactory",
    "unpauseCourseRatings",
    courseFactory,
    "function unpauseCourseRatings(uint256 courseId)",
    [BigInt(1)],
    true
  );

  await testTransaction(
    "CourseFactory",
    "emergencyDeactivateCourse",
    courseFactory,
    "function emergencyDeactivateCourse(uint256 courseId)",
    [BigInt(1)],
    true
  );

  console.log("\n🔄 Testing ProgressTracker Admin Functions...\n");

  await testTransaction(
    "ProgressTracker",
    "emergencyResetProgress",
    progressTracker,
    "function emergencyResetProgress(address student, uint256 courseId)",
    ["0x0000000000000000000000000000000000000001", BigInt(1)],
    true
  );

  console.log("\n========================================\n");
  console.log("📊 TEST RESULTS\n");
  console.log("========================================\n");

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.contract]) {
      acc[result.contract] = [];
    }
    acc[result.contract].push(result);
    return acc;
  }, {} as Record<string, TestResult[]>);

  for (const [contractName, functions] of Object.entries(groupedResults)) {
    console.log(`\n${contractName}:`);
    console.log("─".repeat(70));

    for (const func of functions) {
      const statusIcon = func.status;
      const txStr = func.txHash ? ` → TX: ${func.txHash.substring(0, 20)}...` : "";
      const errorStr = func.error ? ` (${func.error})` : "";
      const noteStr = func.note ? ` (${func.note})` : "";
      console.log(`  ${statusIcon} ${func.function}${txStr}${errorStr}${noteStr}`);
    }
  }

  const successCount = results.filter((r) => r.status === "✅").length;
  const failCount = results.filter((r) => r.status === "❌").length;
  const skipCount = results.filter((r) => r.status === "⏭️").length;

  console.log("\n" + "=".repeat(70));
  console.log("\n📈 SUMMARY:");
  console.log(`   ✅ Successful:  ${successCount}/${results.length}`);
  console.log(`   ❌ Failed:      ${failCount}/${results.length}`);
  console.log(`   ⏭️  Skipped:     ${skipCount}/${results.length}`);

  if (failCount === 0 && successCount > 0) {
    console.log("\n✨ All tested admin transactions executed successfully!\n");
  } else if (successCount === 0) {
    console.log("\n⚠️  All transactions were skipped (destructive actions).\n");
    console.log("💡 To test destructive functions, modify skip flags in code.\n");
  } else {
    console.log("\n⚠️  Some transactions failed. Check errors above.\n");
  }

  console.log("\n📝 NOTES:");
  console.log("   • Destructive functions are skipped by default");
  console.log("   • Modify skip=true flags to test destructive actions");
  console.log("   • All transactions are on testnet");
  console.log("   • Verify Goldsky indexing after successful transactions\n");

  console.log("🔗 Verify transactions on block explorer:");
  console.log(`   https://manta-pacific.socialscan.io/address/${account.address}\n`);
}

main().catch((error) => {
  console.error("\n❌ Test execution failed:", error);
  process.exit(1);
});
