"use client";

import { useState } from "react";

interface PipelineResult {
  success: boolean;
  domain: string;
  brand: string | null;
  reportUrl: string | null;
  score: number | null;
  verdict: string | null;
  topFix: string | null;
  cached: boolean;
  contact: {
    name: string;
    firstName: string | null;
    lastName: string | null;
    title: string | null;
    email: string;
    linkedin: string | null;
  } | null;
  pipeline: Array<{
    step: string;
    status: "success" | "error" | "skipped";
    data?: unknown;
    error?: string;
  }>;
}

export default function PipelinePage() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(false);

  const runPipeline = async () => {
    if (!domain.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim(), forceRefresh }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Pipeline failed");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const generateEmailTemplate = () => {
    if (!result?.contact || !result?.reportUrl) return "";

    const firstName = result.contact.firstName || result.contact.name.split(" ")[0];
    const brandName = result.brand || result.domain;

    return `Subject: ${brandName}'s ad scored ${result.score}/100 - quick wins inside

Hi ${firstName},

I ran ${brandName}'s latest ad through our AI creative analyzer and thought you'd find the results interesting.

${result.reportUrl}

Score: ${result.score}/100 (${result.verdict})
${result.topFix ? `\nQuick win: ${result.topFix}` : ""}

The full report has specific fixes that could improve performance. Happy to walk through it if useful.

Best,
Geoff`;
  };

  const copyEmailTemplate = () => {
    const template = generateEmailTemplate();
    navigator.clipboard.writeText(template);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Pipeline Test</h1>
        <p className="text-gray-400 mb-8">
          Test the full outreach pipeline: Foreplay → GetAdScore → Apollo
        </p>

        {/* Input Form */}
        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <label className="block text-sm font-medium mb-2">Domain</label>
          <div className="flex gap-3 mb-3">
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g., glossier.com"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              onKeyDown={(e) => e.key === "Enter" && runPipeline()}
            />
            <button
              onClick={runPipeline}
              disabled={loading || !domain.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              {loading ? "Running..." : "Run Pipeline"}
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={forceRefresh}
              onChange={(e) => setForceRefresh(e.target.checked)}
              className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
            />
            Force fresh analysis (skip 14-day cache)
          </label>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="bg-gray-900 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">
                  {result.brand || result.domain}
                </h2>
                {result.cached && (
                  <span className="px-2 py-1 bg-yellow-900/50 text-yellow-400 text-xs rounded-full">
                    Cached Report
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-gray-400 text-sm">Score</p>
                  <p className="text-2xl font-bold">
                    {result.score !== null ? (
                      <span
                        className={
                          result.score >= 80
                            ? "text-green-400"
                            : result.score >= 60
                            ? "text-yellow-400"
                            : "text-red-400"
                        }
                      >
                        {result.score}/100
                      </span>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Verdict</p>
                  <p className="text-lg font-medium">
                    {result.verdict || (
                      <span className="text-gray-500">-</span>
                    )}
                  </p>
                </div>
              </div>

              {result.reportUrl && (
                <div className="mb-4">
                  <p className="text-gray-400 text-sm mb-1">Report URL</p>
                  <a
                    href={result.reportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 break-all"
                  >
                    {result.reportUrl}
                  </a>
                </div>
              )}

              {result.topFix && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">Top Fix</p>
                  <p className="text-white">{result.topFix}</p>
                </div>
              )}
            </div>

            {/* Contact Card */}
            {result.contact && (
              <div className="bg-gray-900 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Contact</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-gray-400">Name: </span>
                    <span className="text-white">{result.contact.name}</span>
                  </div>
                  {result.contact.title && (
                    <div>
                      <span className="text-gray-400">Title: </span>
                      <span className="text-white">{result.contact.title}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-400">Email: </span>
                    <a
                      href={`mailto:${result.contact.email}`}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      {result.contact.email}
                    </a>
                  </div>
                  {result.contact.linkedin && (
                    <div>
                      <span className="text-gray-400">LinkedIn: </span>
                      <a
                        href={result.contact.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300"
                      >
                        {result.contact.linkedin}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Email Template */}
            {result.contact && result.reportUrl && (
              <div className="bg-gray-900 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Email Template</h3>
                  <button
                    onClick={copyEmailTemplate}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    {copied ? "Copied!" : "Copy Template"}
                  </button>
                </div>
                <pre className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300 whitespace-pre-wrap font-mono">
                  {generateEmailTemplate()}
                </pre>
              </div>
            )}

            {/* Pipeline Steps */}
            <div className="bg-gray-900 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Pipeline Steps</h3>
              <div className="space-y-3">
                {result.pipeline.map((step, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg"
                  >
                    <span
                      className={`mt-0.5 w-2 h-2 rounded-full ${
                        step.status === "success"
                          ? "bg-green-400"
                          : step.status === "error"
                          ? "bg-red-400"
                          : "bg-yellow-400"
                      }`}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{step.step}</p>
                      {step.error && (
                        <p className="text-red-400 text-sm mt-1">{step.error}</p>
                      )}
                      {step.data !== undefined && (
                        <p className="text-gray-400 text-sm mt-1">
                          {JSON.stringify(step.data)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
