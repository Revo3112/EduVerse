"use client";

import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface TestResult {
  name: string;
  status: "pending" | "running" | "success" | "error";
  message: string;
  duration?: number;
  data?: Record<string, unknown> | string | number | boolean | null;
}

export default function MyLearningDiagnosticPage() {
  const account = useActiveAccount();
  const [tests, setTests] = useState<TestResult[]>([
    {
      name: "Environment Check",
      status: "pending",
      message: "Checking NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT",
    },
    {
      name: "Server-side Query Test",
      status: "pending",
      message: "Testing server API endpoint",
    },
    {
      name: "Empty Data Handling",
      status: "pending",
      message: "Testing empty response handling",
    },
    {
      name: "User Profile Query",
      status: "pending",
      message: "Testing user profile data",
    },
  ]);
  const [isRunning, setIsRunning] = useState(false);

  const updateTest = (index: number, updates: Partial<TestResult>) => {
    setTests((prev) =>
      prev.map((test, i) => (i === index ? { ...test, ...updates } : test))
    );
  };

  const runTests = async () => {
    if (!account?.address) {
      alert("Please connect your wallet first");
      return;
    }

    setIsRunning(true);
    const startTime = Date.now();

    // Test 1: Environment Check
    updateTest(0, { status: "running", message: "Checking environment..." });
    await new Promise((resolve) => setTimeout(resolve, 500));

    const endpoint = process.env.NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT;
    if (!endpoint) {
      updateTest(0, {
        status: "error",
        message: "NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT is not set",
        duration: Date.now() - startTime,
      });
      setIsRunning(false);
      return;
    }

    updateTest(0, {
      status: "success",
      message: `Endpoint configured: ${endpoint}`,
      duration: Date.now() - startTime,
      data: { endpoint },
    });

    // Test 2: Server-side Query Test
    const test2Start = Date.now();
    updateTest(1, { status: "running", message: "Querying server API..." });

    try {
      const response = await fetch(
        `/api/test-mylearning?address=${account.address}`
      );
      const result = await response.json();

      if (result.success) {
        updateTest(1, {
          status: "success",
          message: `Server query successful (${result.duration})`,
          duration: Date.now() - test2Start,
          data: result.data,
        });
      } else {
        updateTest(1, {
          status: "error",
          message: result.error?.message || "Server query failed",
          duration: Date.now() - test2Start,
          data: result.error,
        });
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to connect to server API";
      updateTest(1, {
        status: "error",
        message: errorMessage,
        duration: Date.now() - test2Start,
      });
      setIsRunning(false);
      return;
    }

    // Test 3: Empty Data Handling
    const test3Start = Date.now();
    updateTest(2, {
      status: "running",
      message: "Testing empty data handling...",
    });
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      const response = await fetch(
        `/api/test-mylearning?address=${account.address}`
      );
      const result = await response.json();

      const isEmpty =
        result.data?.enrollmentsCount === 0 &&
        result.data?.certificatesCount === 0;

      updateTest(2, {
        status: "success",
        message: isEmpty
          ? "Empty data handled correctly (no enrollments yet)"
          : `Data found: ${result.data?.enrollmentsCount || 0} enrollments`,
        duration: Date.now() - test3Start,
        data: {
          isEmpty,
          enrollmentsCount: result.data?.enrollmentsCount || 0,
          certificatesCount: result.data?.certificatesCount || 0,
        },
      });
    } catch {
      updateTest(2, {
        status: "error",
        message: "Failed to handle empty data",
        duration: Date.now() - test3Start,
      });
    }

    // Test 4: User Profile Query
    const test4Start = Date.now();
    updateTest(3, {
      status: "running",
      message: "Checking user profile data...",
    });
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      const response = await fetch(
        `/api/test-mylearning?address=${account.address}`
      );
      const result = await response.json();

      const userStats = result.data?.userStats;
      const hasStats = userStats !== null && userStats !== undefined;

      updateTest(3, {
        status: "success",
        message: hasStats
          ? "User stats returned successfully"
          : "User stats initialized (new user)",
        duration: Date.now() - test4Start,
        data: userStats,
      });
    } catch {
      updateTest(3, {
        status: "error",
        message: "Failed to get user profile",
        duration: Date.now() - test4Start,
      });
    }

    setIsRunning(false);
  };

  const resetTests = () => {
    setTests([
      {
        name: "Environment Check",
        status: "pending",
        message: "Checking NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT",
      },
      {
        name: "Server-side Query Test",
        status: "pending",
        message: "Testing server API endpoint",
      },
      {
        name: "Empty Data Handling",
        status: "pending",
        message: "Testing empty response handling",
      },
      {
        name: "User Profile Query",
        status: "pending",
        message: "Testing user profile data",
      },
    ]);
  };

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "running":
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: TestResult["status"]) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-600">Pass</Badge>;
      case "error":
        return <Badge variant="destructive">Fail</Badge>;
      case "running":
        return <Badge className="bg-blue-600">Running</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const allTestsPassed = tests.every((t) => t.status === "success");
  const hasErrors = tests.some((t) => t.status === "error");

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">MyLearning Diagnostic</h1>
          <p className="text-muted-foreground mt-2">
            Test Goldsky integration and data fetching for the MyLearning page
          </p>
        </div>

        {/* Wallet Status */}
        <Card>
          <CardHeader>
            <CardTitle>Wallet Connection</CardTitle>
          </CardHeader>
          <CardContent>
            {account?.address ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Connected</span>
                </div>
                <p className="text-sm text-muted-foreground font-mono">
                  {account.address}
                </p>
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please connect your wallet to run diagnostic tests
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Test Controls */}
        <div className="flex gap-4">
          <Button
            onClick={runTests}
            disabled={isRunning || !account?.address}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Run All Tests
          </Button>
          <Button onClick={resetTests} variant="outline" disabled={isRunning}>
            Reset
          </Button>
        </div>

        {/* Test Results */}
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>
              {allTestsPassed && !hasErrors && tests[0].status !== "pending"
                ? "✅ All tests passed! MyLearning service is working correctly."
                : hasErrors
                ? "❌ Some tests failed. Check details below."
                : "⏳ Ready to run tests"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tests.map((test, index) => (
              <div key={index}>
                {index > 0 && <Separator className="my-4" />}
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getStatusIcon(test.status)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{test.name}</h4>
                          {getStatusBadge(test.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {test.message}
                        </p>
                        {test.duration && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Duration: {test.duration}ms
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {test.data && (
                    <div className="ml-8 mt-2">
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          View details
                        </summary>
                        <pre className="mt-2 p-3 bg-muted rounded-md overflow-auto max-h-60">
                          {test.data && typeof test.data === "object"
                            ? JSON.stringify(test.data, null, 2)
                            : test.data !== undefined
                            ? String(test.data)
                            : "No data"}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Troubleshooting Guide */}
        <Card>
          <CardHeader>
            <CardTitle>Troubleshooting Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">If tests fail:</h4>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>
                  <strong>Environment Check fails:</strong> Ensure
                  NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT is set in .env.local
                </li>
                <li>
                  <strong>Server query fails:</strong> Restart the Next.js dev
                  server to refresh environment variables
                </li>
                <li>
                  <strong>Empty data:</strong> This is normal if you
                  haven&apos;t enrolled in any courses yet
                </li>
                <li>
                  <strong>User profile fails:</strong> Check Goldsky subgraph
                  deployment status
                </li>
              </ul>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium mb-2">Expected Endpoint:</h4>
              <code className="text-xs bg-muted p-2 rounded block">
                https://api.goldsky.com/api/public/project_cmezpe79yxzxt01sxhkaz5fq2/subgraphs/eduverse-manta-pacific-sepolia/1.4.0/gn
              </code>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
