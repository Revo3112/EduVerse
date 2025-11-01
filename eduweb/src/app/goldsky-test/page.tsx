"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCreatorCourses } from "@/services/goldsky-creator.service";

export default function GoldskyTestPage() {
  const [testAddress, setTestAddress] = useState(
    "0xb5075eb5734bc8a6a9bbc1ca299fd8c0bd4cff58"
  );
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");

  const endpoint = process.env.NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT;

  const runTest = async () => {
    setTesting(true);
    setResult("");
    setError("");

    try {
      console.log("[Test] Starting Goldsky test...");
      console.log("[Test] Endpoint:", endpoint);
      console.log("[Test] Test address:", testAddress);

      const data = await getCreatorCourses(testAddress);

      console.log("[Test] Success! Data:", data);

      setResult(
        JSON.stringify(
          {
            coursesCount: data.courses.length,
            stats: data.stats,
            courses: data.courses.map((c) => ({
              id: c.id,
              title: c.title,
              creator: c.creator,
            })),
          },
          null,
          2
        )
      );
    } catch (err) {
      console.error("[Test] Error:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setTesting(false);
    }
  };

  const testDirectFetch = async () => {
    setTesting(true);
    setResult("");
    setError("");

    try {
      const response = await fetch(endpoint || "", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: "{ _meta { block { number } } }",
        }),
      });

      console.log("[Test] Direct fetch response status:", response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("[Test] Direct fetch error:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Goldsky Connection Test</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Environment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <strong>Endpoint:</strong>
              <code className="block mt-1 p-2 bg-muted rounded text-sm break-all">
                {endpoint || "❌ NOT SET"}
              </code>
            </div>
            <div>
              <strong>Runtime:</strong>{" "}
              <code>{typeof window !== "undefined" ? "CLIENT" : "SERVER"}</code>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test 1: Direct Fetch (_meta query)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tests raw fetch to Goldsky endpoint
            </p>
            <Button onClick={testDirectFetch} disabled={testing || !endpoint}>
              {testing ? "Testing..." : "Run Direct Fetch Test"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test 2: getCreatorCourses Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Test Address:</label>
              <input
                type="text"
                value={testAddress}
                onChange={(e) => setTestAddress(e.target.value)}
                className="w-full mt-1 p-2 border rounded"
                placeholder="0x..."
              />
            </div>
            <Button onClick={runTest} disabled={testing || !endpoint}>
              {testing ? "Testing..." : "Run Service Test"}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">✅ Success</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-96">
                {result}
              </pre>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">❌ Error</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-red-50 p-4 rounded text-xs overflow-auto max-h-96 text-red-900">
                {error}
              </pre>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Console Output</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Check browser DevTools console for detailed logs from the service
              layer
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
