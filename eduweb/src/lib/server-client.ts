// Server-Side Thirdweb Client Configuration
// IMPORTANT: This file should ONLY be imported in server-side code
// - API routes (app/api/route.ts files)
// - Server Components
// - Server Actions
// NEVER import this in client components or client-side code
// For client-side operations, use @/app/client instead

import { createThirdwebClient } from "thirdweb";

// Validate that we're in a server environment
if (typeof window !== 'undefined') {
  throw new Error(
    'SECURITY ERROR: server-client.ts should NEVER be imported in client-side code! ' +
    'Use @/app/client for client-side operations instead.'
  );
}

// Validate secret key is available
const secretKey = process.env.THIRDWEB_SECRET_KEY;

if (!secretKey) {
  throw new Error(
    "Missing THIRDWEB_SECRET_KEY environment variable. " +
    "This is required for server-side operations. " +
    "Check your .env.local file."
  );
}

// Create server-side client with secret key for elevated permissions
export const serverClient = createThirdwebClient({
  secretKey: secretKey,
});
