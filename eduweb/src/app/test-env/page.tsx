"use client";

import { useEffect, useState } from "react";

export default function TestEnvPage() {
  const [clientEnv, setClientEnv] = useState<Record<string, string>>({});
  const [serverEnv, setServerEnv] = useState<Record<string, string>>({});
  const [endpointTest, setEndpointTest] = useState<{
    status: string;
    message: string;
    data?: Record<string, unknown> | null;
  }>({ status: "pending", message: "Testing...", data: null });

  useEffect(() => {
    // Get client-side environment variables
    const clientVars: Record<string, string> = {};

    // Test direct access
    clientVars["Direct Access"] =
      process.env.NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT || "(NOT FOUND)";

    // Test from typeof window
    if (typeof window !== "undefined") {
      clientVars["Window Check"] = "Browser context confirmed";
    }

    setClientEnv(clientVars);

    // Fetch server-side env
    fetch("/api/test-goldsky")
      .then((res) => res.json())
      .then((data) => {
        setServerEnv({
          hasEndpoint: data.environment?.hasEndpoint?.toString() || "false",
          endpoint: data.environment?.endpoint || "(NOT FOUND)",
          nodeEnv: data.environment?.nodeEnv || "unknown",
        });
        setEndpointTest({
          status: data.status || "unknown",
          message: data.message || "No message",
          data: data.tests || {},
        });
      })
      .catch((err) => {
        setEndpointTest({
          status: "error",
          message: err.message,
        });
      });
  }, []);

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Environment Variables Test</h1>
        <p className="text-muted-foreground">
          Debugging Goldsky endpoint configuration
        </p>
      </div>

      {/* Client-Side Environment */}
      <div className="border rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold">Client-Side Environment</h2>
        <div className="space-y-2 font-mono text-sm">
          {Object.entries(clientEnv).map(([key, value]) => (
            <div key={key} className="grid grid-cols-[200px_1fr] gap-4">
              <span className="text-muted-foreground">{key}:</span>
              <span className="break-all">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Server-Side Environment */}
      <div className="border rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold">
          Server-Side Environment (from API)
        </h2>
        <div className="space-y-2 font-mono text-sm">
          {Object.entries(serverEnv).map(([key, value]) => (
            <div key={key} className="grid grid-cols-[200px_1fr] gap-4">
              <span className="text-muted-foreground">{key}:</span>
              <span className="break-all">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Endpoint Test Results */}
      <div className="border rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold">Endpoint Test Results</h2>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Status:</span>
            <span
              className={`px-2 py-1 rounded text-sm ${
                endpointTest.status.includes("✅")
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {endpointTest.status}
            </span>
          </div>
          <div>
            <span className="font-semibold">Message:</span>
            <p className="text-sm text-muted-foreground mt-1">
              {endpointTest.message}
            </p>
          </div>
          {endpointTest.data && (
            <div className="mt-4">
              <span className="font-semibold">Test Data:</span>
              <pre className="mt-2 p-4 bg-muted rounded text-xs overflow-x-auto">
                {JSON.stringify(endpointTest.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="border rounded-lg p-6 space-y-4 bg-blue-50 dark:bg-blue-950">
        <h2 className="text-xl font-semibold">Expected Results</h2>
        <div className="space-y-2 text-sm">
          <p>
            ✅ <strong>Client-Side Direct Access:</strong> Should show the full
            Goldsky URL
          </p>
          <p>
            ✅ <strong>Server-Side hasEndpoint:</strong> Should be
            &quot;true&quot;
          </p>
          <p>
            ✅ <strong>Server-Side endpoint:</strong> Should show the full
            Goldsky URL
          </p>
          <p>
            ✅ <strong>Endpoint Test Status:</strong> Should be &quot;✅ ALL
            TESTS PASSED&quot;
          </p>
          <p>
            ✅ <strong>Test Data blockNumber:</strong> Should show a number
            (e.g., 5384780)
          </p>
        </div>
      </div>

      {/* Troubleshooting */}
      <div className="border rounded-lg p-6 space-y-4 bg-yellow-50 dark:bg-yellow-950">
        <h2 className="text-xl font-semibold">If Tests Fail</h2>
        <div className="space-y-2 text-sm">
          <p>
            <strong>1. If &quot;NOT FOUND&quot; appears:</strong>
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Stop dev server (Ctrl+C)</li>
            <li>
              Run:{" "}
              <code className="px-2 py-1 bg-white dark:bg-gray-800 rounded">
                rm -rf .next
              </code>
            </li>
            <li>
              Run:{" "}
              <code className="px-2 py-1 bg-white dark:bg-gray-800 rounded">
                npm run dev
              </code>
            </li>
            <li>Hard refresh browser (Ctrl+Shift+R)</li>
          </ul>

          <p className="mt-4">
            <strong>2. If endpoint returns 404:</strong>
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Check .env.local file has correct URL</li>
            <li>
              Run:{" "}
              <code className="px-2 py-1 bg-white dark:bg-gray-800 rounded">
                cd ../goldsky-indexer/subgraph-custom && goldsky subgraph list
              </code>
            </li>
            <li>Verify version matches (should be 1.4.0)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
