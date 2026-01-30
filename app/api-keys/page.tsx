"use client";

import { useState } from "react";
import Link from "next/link";

interface ApiKeyRecord {
  id: string;
  key_prefix: string;
  name: string | null;
  tier: string;
  requests_today: number;
  last_request_date: string | null;
  created_at: string;
  revoked_at: string | null;
  is_active: boolean;
}

const RATE_LIMITS: Record<string, number> = {
  free: 10,
  individual: 100,
  agency: 500,
};

export default function ApiKeysPage() {
  const [email, setEmail] = useState("");
  const [keyName, setKeyName] = useState("");
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keysLoaded, setKeysLoaded] = useState(false);

  const loadKeys = async () => {
    if (!email) {
      setError("Please enter your email");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/keys?email=${encodeURIComponent(email)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load keys");
      }

      setKeys(data.keys);
      setKeysLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load keys");
    } finally {
      setLoading(false);
    }
  };

  const createKey = async () => {
    if (!email) {
      setError("Please enter your email");
      return;
    }

    setLoading(true);
    setError(null);
    setNewKey(null);

    try {
      const response = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: keyName || undefined,
          tier: "free",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create key");
      }

      setNewKey(data.api_key);
      setKeyName("");
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setLoading(false);
    }
  };

  const revokeKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to revoke this API key? This cannot be undone.")) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key_id: keyId, email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to revoke key");
      }

      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke key");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const activeKeys = keys.filter((k) => k.is_active);
  const revokedKeys = keys.filter((k) => !k.is_active);

  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      <header className="border-b border-zinc-800 bg-[#0a0a0b]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <span className="font-semibold text-lg text-zinc-100">GetAdScore</span>
          </Link>
          <Link
            href="/"
            className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Back to Analyzer
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">API Keys</h1>
          <p className="text-zinc-400">
            Manage your GetAdScore API keys for programmatic access.
          </p>
        </div>

        {/* Email Input Section */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-8">
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Your Email
          </label>
          <div className="flex gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setKeysLoaded(false);
                setNewKey(null);
              }}
              placeholder="you@example.com"
              className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              onClick={loadKeys}
              disabled={loading || !email}
              className="px-6 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Loading..." : "Load Keys"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* New Key Display */}
        {newKey && (
          <div className="mb-8 bg-green-500/10 border border-green-500/30 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-400 mb-2">
                  API Key Created Successfully
                </h3>
                <p className="text-sm text-zinc-400 mb-3">
                  Save this key securely - it will not be shown again!
                </p>
                <div className="flex items-center gap-2 bg-zinc-900 rounded-lg p-3 font-mono text-sm">
                  <code className="flex-1 text-green-300 break-all">{newKey}</code>
                  <button
                    onClick={() => copyToClipboard(newKey)}
                    className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs rounded transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Key Section */}
        {keysLoaded && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">Create New API Key</h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="Key name (optional, e.g., 'Production')"
                className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                onClick={createKey}
                disabled={loading}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creating..." : "Create Key"}
              </button>
            </div>
            <p className="mt-3 text-sm text-zinc-500">
              Free tier: {RATE_LIMITS.free} requests/day
            </p>
          </div>
        )}

        {/* Active Keys List */}
        {keysLoaded && activeKeys.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">Active Keys</h2>
            <div className="space-y-3">
              {activeKeys.map((key) => (
                <div
                  key={key.id}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm font-mono text-zinc-300">
                          {key.key_prefix}...
                        </code>
                        {key.name && (
                          <span className="text-sm text-zinc-400">
                            ({key.name})
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-xs rounded">
                          {key.tier}
                        </span>
                      </div>
                      <div className="text-sm text-zinc-500">
                        Created {new Date(key.created_at).toLocaleDateString()}
                        {key.last_request_date && (
                          <span className="ml-3">
                            Last used: {new Date(key.last_request_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-sm">
                        <span className="text-zinc-400">Today: </span>
                        <span className="text-zinc-200">
                          {key.requests_today} / {RATE_LIMITS[key.tier] || RATE_LIMITS.free} requests
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => revokeKey(key.id)}
                      disabled={loading}
                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm rounded-lg transition-colors disabled:opacity-50"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Revoked Keys List */}
        {keysLoaded && revokedKeys.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-zinc-400 mb-4">Revoked Keys</h2>
            <div className="space-y-3 opacity-60">
              {revokedKeys.map((key) => (
                <div
                  key={key.id}
                  className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4"
                >
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-zinc-500 line-through">
                      {key.key_prefix}...
                    </code>
                    {key.name && (
                      <span className="text-sm text-zinc-500">
                        ({key.name})
                      </span>
                    )}
                    <span className="px-2 py-0.5 bg-zinc-700/50 text-zinc-500 text-xs rounded">
                      revoked
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {keysLoaded && keys.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <p>No API keys found for this email.</p>
            <p className="text-sm mt-1">Create your first key above to get started.</p>
          </div>
        )}

        {/* API Documentation */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mt-8">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">Quick Start</h2>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="text-zinc-300 font-medium mb-2">Analyze an ad:</h3>
              <pre className="bg-zinc-800 rounded-lg p-4 overflow-x-auto text-zinc-300">
{`curl -X POST https://getadscore.com/api/analyze \\
  -H "Authorization: Bearer gads_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "media_url": "https://example.com/ad-image.jpg",
    "brand_name": "Your Brand"
  }'`}
              </pre>
            </div>
            <div>
              <h3 className="text-zinc-300 font-medium mb-2">Retrieve a report:</h3>
              <pre className="bg-zinc-800 rounded-lg p-4 overflow-x-auto text-zinc-300">
{`curl https://getadscore.com/api/reports/{report_id} \\
  -H "Authorization: Bearer gads_your_api_key"`}
              </pre>
            </div>
            <div className="pt-2 border-t border-zinc-700">
              <h3 className="text-zinc-300 font-medium mb-2">Rate Limits:</h3>
              <ul className="text-zinc-400 space-y-1">
                <li>Free: 10 requests/day</li>
                <li>Individual: 100 requests/day</li>
                <li>Agency: 500 requests/day</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-800 mt-12">
        <div className="max-w-4xl mx-auto px-6 py-6 text-center text-zinc-600 text-sm">
          &copy; {new Date().getFullYear()} DMCSITE LLC. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
