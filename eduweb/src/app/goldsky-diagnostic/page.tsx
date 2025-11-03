"use client";

import { useEffect, useState } from "react";
import { ContentContainer } from "@/components/PageContainer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Terminal,
  Database,
  Network,
  Server,
} from "lucide-react";

interface DiagnosticResult {
  name: string;
  status: "success" | "error" | "warning" | "pending";
  message: string;
  details?: Record<string, unknown>;
}

interface EnvCheck {
  name: string;
  value: string | undefined;
  required: boolean;
  status: "ok" | "missing" | "invalid";
}

export default function GoldskyDiagnosticPage() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [envVars, setEnvVars] = useState<EnvCheck[]>([]);
  const [clientEndpoint, setClientEndpoint] = useState<string>("");
  const [serverEndpoint, setServerEndpoint] = useState<string>("");

  const runDiagnostics = async () => {
    setIsRunning(true);
    setDiagnostics([]);

    const results: DiagnosticResult[] = [];

    results.push({
      name: "Client-Side Environment Check",
      status: "pending",
      message: "Checking client-side environment variables...",
    });
    setDiagnostics([...results]);

    const clientEnv = process.env.NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT || "";
    setClientEndpoint(clientEnv);

    if (clientEnv) {
      results[results.length - 1] = {
        name: "Client-Side Environment Check",
        status: "success",
        message: "Client endpoint configured",
        details: { endpoint: clientEnv },
      };
    } else {
      results[results.length - 1] = {
        name: "Client-Side Environment Check",
        status: "error",
        message: "NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT not found in client",
        details: { endpoint: "NOT_CONFIGURED" },
      };
    }
    setDiagnostics([...results]);

    results.push({
      name: "Server-Side API Test",
      status: "pending",
      message: "Testing server-side endpoint...",
    });
    setDiagnostics([...results]);

    try {
      const apiResponse = await fetch("/api/test-goldsky");
      const apiData = await apiResponse.json();

      setServerEndpoint(apiData.environment?.endpoint || "");

      if (apiData.success) {
        results[results.length - 1] = {
          name: "Server-Side API Test",
          status: "success",
          message: "Server endpoint configured and reachable",
          details: apiData,
        };
      } else {
        results[results.length - 1] = {
          name: "Server-Side API Test",
          status: "error",
          message: apiData.tests?.error || "Server endpoint test failed",
          details: apiData,
        };
      }
    } catch (error) {
      results[results.length - 1] = {
        name: "Server-Side API Test",
        status: "error",
        message: `API call failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
    setDiagnostics([...results]);

    if (clientEnv) {
      results.push({
        name: "Direct GraphQL Query Test",
        status: "pending",
        message: "Testing GraphQL query from browser...",
      });
      setDiagnostics([...results]);

      try {
        const graphqlResponse = await fetch(clientEnv, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: "{ _meta { block { number timestamp } hasIndexingErrors } }",
          }),
        });

        if (graphqlResponse.ok) {
          const graphqlData = await graphqlResponse.json();

          if (graphqlData.data) {
            results[results.length - 1] = {
              name: "Direct GraphQL Query Test",
              status: "success",
              message: "GraphQL endpoint is reachable",
              details: graphqlData.data,
            };
          } else {
            results[results.length - 1] = {
              name: "Direct GraphQL Query Test",
              status: "error",
              message: "GraphQL returned invalid response",
              details: graphqlData,
            };
          }
        } else {
          results[results.length - 1] = {
            name: "Direct GraphQL Query Test",
            status: "error",
            message: `HTTP ${graphqlResponse.status}: ${graphqlResponse.statusText}`,
            details: { status: graphqlResponse.status },
          };
        }
      } catch (error) {
        results[results.length - 1] = {
          name: "Direct GraphQL Query Test",
          status: "error",
          message: `Network error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        };
      }
      setDiagnostics([...results]);

      results.push({
        name: "Courses Query Test",
        status: "pending",
        message: "Testing courses query...",
      });
      setDiagnostics([...results]);

      try {
        const coursesResponse = await fetch(clientEnv, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `
              query GetAllCourses {
                courses(first: 5, where: { isDeleted: false, isActive: true }) {
                  id
                  title
                  category
                  difficulty
                  price
                }
              }
            `,
          }),
        });

        if (coursesResponse.ok) {
          const coursesData = await coursesResponse.json();

          if (coursesData.data) {
            const courseCount = coursesData.data.courses?.length || 0;
            results[results.length - 1] = {
              name: "Courses Query Test",
              status: courseCount > 0 ? "success" : "warning",
              message:
                courseCount > 0
                  ? `Found ${courseCount} courses`
                  : "Query successful but no courses found (database empty)",
              details: { courses: coursesData.data.courses },
            };
          } else {
            results[results.length - 1] = {
              name: "Courses Query Test",
              status: "error",
              message: "Invalid GraphQL response",
              details: coursesData,
            };
          }
        } else {
          results[results.length - 1] = {
            name: "Courses Query Test",
            status: "error",
            message: `HTTP ${coursesResponse.status}: ${coursesResponse.statusText}`,
          };
        }
      } catch (error) {
        results[results.length - 1] = {
          name: "Courses Query Test",
          status: "error",
          message: `Query failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        };
      }
      setDiagnostics([...results]);
    }

    const envChecks: EnvCheck[] = [
      {
        name: "NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT",
        value: clientEnv,
        required: true,
        status: clientEnv ? "ok" : "missing",
      },
      {
        name: "NEXT_PUBLIC_COURSE_FACTORY_ADDRESS",
        value: process.env.NEXT_PUBLIC_COURSE_FACTORY_ADDRESS,
        required: true,
        status: process.env.NEXT_PUBLIC_COURSE_FACTORY_ADDRESS
          ? "ok"
          : "missing",
      },
      {
        name: "NEXT_PUBLIC_COURSE_LICENSE_ADDRESS",
        value: process.env.NEXT_PUBLIC_COURSE_LICENSE_ADDRESS,
        required: true,
        status: process.env.NEXT_PUBLIC_COURSE_LICENSE_ADDRESS
          ? "ok"
          : "missing",
      },
      {
        name: "NEXT_PUBLIC_PROGRESS_TRACKER_ADDRESS",
        value: process.env.NEXT_PUBLIC_PROGRESS_TRACKER_ADDRESS,
        required: true,
        status: process.env.NEXT_PUBLIC_PROGRESS_TRACKER_ADDRESS
          ? "ok"
          : "missing",
      },
      {
        name: "NEXT_PUBLIC_CERTIFICATE_MANAGER_ADDRESS",
        value: process.env.NEXT_PUBLIC_CERTIFICATE_MANAGER_ADDRESS,
        required: true,
        status: process.env.NEXT_PUBLIC_CERTIFICATE_MANAGER_ADDRESS
          ? "ok"
          : "missing",
      },
    ];

    setEnvVars(envChecks);
    setIsRunning(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "pending":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "destructive" | "outline" | "secondary"
    > = {
      ok: "default",
      missing: "destructive",
      invalid: "destructive",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const hasErrors = diagnostics.some((d) => d.status === "error");
  const allSuccess = diagnostics.every((d) => d.status === "success");

  return (
    <ContentContainer className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Goldsky Diagnostic Tool</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive health check for Goldsky subgraph integration
          </p>
        </div>
        <Button onClick={runDiagnostics} disabled={isRunning}>
          {isRunning ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Run Diagnostics
        </Button>
      </div>

      {diagnostics.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="h-6 w-6 text-blue-500" />
            <h2 className="text-xl font-semibold">System Status</h2>
          </div>
          <div className="flex items-center gap-2">
            {isRunning ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                <span>Running diagnostics...</span>
              </>
            ) : allSuccess ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-green-600 font-medium">
                  All systems operational
                </span>
              </>
            ) : hasErrors ? (
              <>
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-red-600 font-medium">
                  Issues detected - see details below
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <span className="text-yellow-600 font-medium">
                  Warnings detected
                </span>
              </>
            )}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Server className="h-5 w-5 text-purple-500" />
            <h3 className="text-lg font-semibold">Endpoint Configuration</h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Client-Side (Browser)
              </p>
              <div className="bg-muted p-3 rounded text-sm font-mono break-all">
                {clientEndpoint || "NOT_CONFIGURED"}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Server-Side (API)
              </p>
              <div className="bg-muted p-3 rounded text-sm font-mono break-all">
                {serverEndpoint || "NOT_CONFIGURED"}
              </div>
            </div>
            {clientEndpoint !== serverEndpoint && (
              <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <p className="text-sm text-yellow-600">
                  Client and server endpoints do not match. This may cause
                  issues.
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Terminal className="h-5 w-5 text-green-500" />
            <h3 className="text-lg font-semibold">Environment Variables</h3>
          </div>
          <div className="space-y-2">
            {envVars.map((env, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-muted/50 rounded"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">{env.name}</p>
                  {env.value && (
                    <p className="text-xs text-muted-foreground font-mono truncate max-w-xs">
                      {env.value}
                    </p>
                  )}
                </div>
                {getStatusBadge(env.status)}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Network className="h-5 w-5 text-blue-500" />
          <h2 className="text-xl font-semibold">Diagnostic Tests</h2>
        </div>
        <div className="space-y-4">
          {diagnostics.map((diagnostic, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                diagnostic.status === "success"
                  ? "bg-green-500/5 border-green-500/20"
                  : diagnostic.status === "error"
                  ? "bg-red-500/5 border-red-500/20"
                  : diagnostic.status === "warning"
                  ? "bg-yellow-500/5 border-yellow-500/20"
                  : "bg-blue-500/5 border-blue-500/20"
              }`}
            >
              <div className="flex items-start gap-3">
                {getStatusIcon(diagnostic.status)}
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">{diagnostic.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {diagnostic.message}
                  </p>
                  {diagnostic.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-blue-600 cursor-pointer hover:underline">
                        Show details
                      </summary>
                      <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-x-auto">
                        {JSON.stringify(diagnostic.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {hasErrors && (
        <Card className="p-6 bg-red-500/5 border-red-500/20">
          <h3 className="text-lg font-semibold text-red-600 mb-3">
            Fix Instructions
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium mb-1">1. Get correct endpoint:</p>
              <code className="block bg-muted p-2 rounded">
                cd goldsky-indexer/subgraph-custom && goldsky subgraph list
              </code>
            </div>
            <div>
              <p className="font-medium mb-1">2. Update .env.local:</p>
              <code className="block bg-muted p-2 rounded">
                NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT=https://api.goldsky.com/...
              </code>
            </div>
            <div>
              <p className="font-medium mb-1">3. Restart dev server:</p>
              <code className="block bg-muted p-2 rounded">
                rm -rf .next && npm run dev
              </code>
            </div>
            <div>
              <p className="font-medium mb-1">4. Clear browser cache:</p>
              <p className="text-muted-foreground">
                DevTools → Right-click Reload → Empty Cache and Hard Reload
              </p>
            </div>
          </div>
        </Card>
      )}
    </ContentContainer>
  );
}
