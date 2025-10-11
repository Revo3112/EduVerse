// Thirdweb Configuration Exports - Client Side Only
export { client } from "../app/client";

// NOTE: serverClient is NOT exported here to prevent client-side imports
// Import it directly from "@/lib/server-client" in API routes only

export { chain, mantaPacificTestnet } from "./chains";
export {
  certificateManager, CONTRACT_ADDRESSES, courseFactory,
  courseLicense, getEduVerseContract, progressTracker
} from "./contracts";
