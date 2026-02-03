"use client";

import { useState, useEffect, useCallback } from "react";

type LeadStatus = "new" | "contacted" | "replied" | "converted" | "not_interested";

interface Lead {
  id: string;
  domain: string;
  brand_name: string | null;
  report_url: string | null;
  score: number | null;
  verdict: string | null;
  top_fix: string | null;
  contact_name: string | null;
  contact_title: string | null;
  contact_email: string | null;
  contact_linkedin: string | null;
  status: LeadStatus;
  notes: string | null;
  created_at: string;
  contacted_at: string | null;
}

interface ProspectContact {
  name: string;
  firstName: string | null;
  title: string | null;
  email: string;
  linkedin: string | null;
}

interface Prospect {
  brandId: string;
  brandName: string;
  domain: string;
  avatar?: string;
  alreadyLead: boolean;
  contact?: ProspectContact;
  qualified: boolean;
  disqualifyReason?: string;
}

interface BatchResult {
  domain: string;
  success: boolean;
  brand?: string;
  score?: number;
  reportUrl?: string;
  contactEmail?: string;
  leadId?: string;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

// Valid Foreplay niches
const NICHES = [
  { value: "beauty", label: "Beauty" },
  { value: "health/wellness", label: "Health & Wellness" },
  { value: "fashion", label: "Fashion" },
  { value: "food/drink", label: "Food & Drink" },
  { value: "home/garden", label: "Home & Garden" },
  { value: "pets", label: "Pets" },
  { value: "jewelry/watches", label: "Jewelry & Watches" },
  { value: "parenting", label: "Parenting" },
  { value: "accessories", label: "Accessories" },
  { value: "app/software", label: "App & Software" },
  { value: "entertainment", label: "Entertainment" },
  { value: "education", label: "Education" },
  { value: "business/professional", label: "Business" },
  { value: "service business", label: "Service Business" },
  { value: "real estate", label: "Real Estate" },
  { value: "other", label: "Other" },
];

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-blue-900/50 text-blue-300",
  contacted: "bg-yellow-900/50 text-yellow-300",
  replied: "bg-purple-900/50 text-purple-300",
  converted: "bg-green-900/50 text-green-300",
  not_interested: "bg-gray-700 text-gray-400",
};

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  replied: "Replied",
  converted: "Converted",
  not_interested: "Not Interested",
};

export default function LeadsPage() {
  // Leads state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    status: "" as LeadStatus | "",
    minScore: "",
    maxScore: "",
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Delete state
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  // Discover state
  const [showDiscover, setShowDiscover] = useState(false);
  const [discoverNiche, setDiscoverNiche] = useState("beauty");
  const [discoverLimit, setDiscoverLimit] = useState(5);
  const [usUkOnly, setUsUkOnly] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [qualifiedProspects, setQualifiedProspects] = useState<Prospect[]>([]);
  const [disqualifiedProspects, setDisqualifiedProspects] = useState<Prospect[]>([]);
  const [showDisqualified, setShowDisqualified] = useState(false);
  const [selectedProspects, setSelectedProspects] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [batchResults, setBatchResults] = useState<BatchResult[] | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.minScore) params.set("minScore", filters.minScore);
      if (filters.maxScore) params.set("maxScore", filters.maxScore);
      params.set("limit", "50");
      params.set("offset", String((page - 1) * 50));

      const response = await fetch(`/api/leads?${params}`);
      const data = await response.json();

      if (data.success) {
        setLeads(data.leads);
        setTotal(data.total);
      }
    } catch (error) {
      console.error("Failed to fetch leads:", error);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const discoverProspects = async () => {
    setDiscovering(true);
    setQualifiedProspects([]);
    setDisqualifiedProspects([]);
    setBatchResults(null);

    try {
      const response = await fetch("/api/prospect/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: discoverNiche,
          limit: discoverLimit,
          usUkOnly,
          includeContact: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setQualifiedProspects(data.qualified || []);
        setDisqualifiedProspects(data.disqualified || []);
        // Pre-select all qualified prospects
        setSelectedProspects(new Set(data.qualified?.map((p: Prospect) => p.domain) || []));
      }
    } catch (error) {
      console.error("Failed to discover prospects:", error);
    } finally {
      setDiscovering(false);
    }
  };

  const runBatch = async () => {
    if (selectedProspects.size === 0) return;

    setProcessing(true);
    setBatchResults(null);

    try {
      const response = await fetch("/api/prospect/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domains: Array.from(selectedProspects),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setBatchResults(data.results);
        // Refresh leads list
        fetchLeads();
      }
    } catch (error) {
      console.error("Failed to process batch:", error);
    } finally {
      setProcessing(false);
    }
  };

  const toggleProspect = (domain: string) => {
    const newSelected = new Set(selectedProspects);
    if (newSelected.has(domain)) {
      newSelected.delete(domain);
    } else {
      newSelected.add(domain);
    }
    setSelectedProspects(newSelected);
  };

  const selectAllQualified = () => {
    setSelectedProspects(new Set(qualifiedProspects.map((p) => p.domain)));
  };

  const deselectAllProspects = () => {
    setSelectedProspects(new Set());
  };

  const updateStatus = async (leadId: string, status: LeadStatus) => {
    try {
      const response = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, status }),
      });

      if (response.ok) {
        setLeads((prev) =>
          prev.map((lead) =>
            lead.id === leadId ? { ...lead, status } : lead
          )
        );
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const deleteSingleLead = async (leadId: string, brandName: string) => {
    if (!confirm(`Delete lead "${brandName}"?`)) return;

    try {
      const response = await fetch("/api/leads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });

      if (response.ok) {
        setLeads((prev) => prev.filter((lead) => lead.id !== leadId));
        setTotal((prev) => prev - 1);
        setSelectedLeads((prev) => {
          const newSet = new Set(prev);
          newSet.delete(leadId);
          return newSet;
        });
      }
    } catch (error) {
      console.error("Failed to delete lead:", error);
    }
  };

  const deleteSelectedLeads = async () => {
    if (selectedLeads.size === 0) return;
    if (!confirm(`Delete ${selectedLeads.size} selected lead${selectedLeads.size > 1 ? "s" : ""}?`)) return;

    setDeleting(true);
    try {
      const response = await fetch("/api/leads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: Array.from(selectedLeads) }),
      });

      if (response.ok) {
        setLeads((prev) => prev.filter((lead) => !selectedLeads.has(lead.id)));
        setTotal((prev) => prev - selectedLeads.size);
        setSelectedLeads(new Set());
      }
    } catch (error) {
      console.error("Failed to delete leads:", error);
    } finally {
      setDeleting(false);
    }
  };

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(leadId)) {
        newSet.delete(leadId);
      } else {
        newSet.add(leadId);
      }
      return newSet;
    });
  };

  const selectAllLeads = () => {
    setSelectedLeads(new Set(leads.map((l) => l.id)));
  };

  const deselectAllLeads = () => {
    setSelectedLeads(new Set());
  };

  const copyEmail = (lead: Lead) => {
    const firstName = lead.contact_name?.split(" ")[0] || "there";
    const brandName = lead.brand_name || lead.domain;

    const template = `Subject: ${brandName}'s ad scored ${lead.score}/100 — quick wins inside

Hi ${firstName},

Found your ad in Meta's Ad Library and ran it through our creative analyzer:

${lead.report_url}

Score: ${lead.score}/100 — ${lead.top_fix || "See report for details"}

I've spent $2.5M+ on Meta ads for DTC brands and built this to catch issues before they burn budget. Happy to score 2-3 more free if useful.

Geoff
GetAdScore

PS - Reply "stop" if you'd rather not hear from me.`;

    navigator.clipboard.writeText(template);
    setCopiedId(lead.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportCSV = () => {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.minScore) params.set("minScore", filters.minScore);
    if (filters.maxScore) params.set("maxScore", filters.maxScore);

    window.location.href = `/api/leads/export?${params}`;
  };

  const totalPages = Math.ceil(total / 50);

  const ProspectCard = ({ prospect, isQualified }: { prospect: Prospect; isQualified: boolean }) => (
    <div
      onClick={() => isQualified && !prospect.alreadyLead && toggleProspect(prospect.domain)}
      className={`p-4 rounded-lg border transition-colors ${
        prospect.alreadyLead
          ? "bg-gray-800/50 border-gray-700 opacity-50 cursor-not-allowed"
          : isQualified
          ? selectedProspects.has(prospect.domain)
            ? "bg-green-900/30 border-green-600 cursor-pointer"
            : "bg-gray-800 border-gray-700 hover:border-gray-600 cursor-pointer"
          : "bg-gray-800/50 border-gray-700"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        {prospect.avatar && (
          <img
            src={prospect.avatar}
            alt=""
            className="w-8 h-8 rounded-full"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{prospect.brandName}</div>
          <div className="text-xs text-gray-500 truncate">{prospect.domain}</div>
        </div>
        {isQualified && (
          <div className="flex-shrink-0">
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
              selectedProspects.has(prospect.domain)
                ? "bg-green-600 border-green-600"
                : "border-gray-600"
            }`}>
              {selectedProspects.has(prospect.domain) && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Contact Info */}
      {prospect.contact ? (
        <div className="mt-2 pt-2 border-t border-gray-700">
          <div className="text-sm font-medium text-white">{prospect.contact.name}</div>
          <div className="text-xs text-purple-400">{prospect.contact.title || "No title"}</div>
          <div className="text-xs text-gray-500 truncate mt-1">{prospect.contact.email}</div>
        </div>
      ) : (
        <div className="mt-2 pt-2 border-t border-gray-700">
          <div className="text-xs text-gray-500">No contact info</div>
        </div>
      )}

      {/* Status badges */}
      {prospect.alreadyLead && (
        <div className="mt-2">
          <span className="text-xs bg-yellow-900/50 text-yellow-400 px-2 py-0.5 rounded">
            Already a lead
          </span>
        </div>
      )}
      {!isQualified && prospect.disqualifyReason && (
        <div className="mt-2">
          <span className="text-xs bg-red-900/50 text-red-400 px-2 py-0.5 rounded">
            {prospect.disqualifyReason}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Leads</h1>
            <p className="text-gray-400">{total} total leads</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowDiscover(!showDiscover)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                showDiscover
                  ? "bg-purple-600 hover:bg-purple-700"
                  : "bg-purple-600/20 text-purple-400 hover:bg-purple-600/30"
              }`}
            >
              {showDiscover ? "Hide Discovery" : "Discover Leads"}
            </button>
            <a
              href="/admin/pipeline"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              Single Pipeline
            </a>
            <button
              onClick={exportCSV}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Discover Section */}
        {showDiscover && (
          <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-800/50 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Discover Pre-Qualified Leads</h2>
            <p className="text-sm text-gray-400 mb-4">
              Finds brands running image ads, looks up decision-makers via Hunter.io, and filters for relevant titles.
            </p>

            {/* Discovery Form */}
            <div className="flex gap-4 items-end flex-wrap mb-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Niche</label>
                <select
                  value={discoverNiche}
                  onChange={(e) => setDiscoverNiche(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                >
                  {NICHES.map((niche) => (
                    <option key={niche.value} value={niche.value}>
                      {niche.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Find</label>
                <input
                  type="number"
                  value={discoverLimit}
                  onChange={(e) => setDiscoverLimit(Math.min(10, Math.max(1, parseInt(e.target.value) || 5)))}
                  className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  min={1}
                  max={10}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="usUkOnly"
                  checked={usUkOnly}
                  onChange={(e) => setUsUkOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="usUkOnly" className="text-sm text-gray-300">
                  US/UK only
                </label>
              </div>
              <button
                onClick={discoverProspects}
                disabled={discovering}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 rounded-lg font-medium transition-colors"
              >
                {discovering ? "Searching..." : "Find Prospects"}
              </button>
            </div>

            {discovering && (
              <div className="flex items-center gap-3 text-gray-400">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500"></div>
                <span>Searching Foreplay + Hunter.io (this may take a moment)...</span>
              </div>
            )}

            {/* Qualified Prospects */}
            {qualifiedProspects.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-medium text-green-400">
                      {qualifiedProspects.length} Qualified
                    </span>
                    <span className="text-sm text-gray-500">
                      ({selectedProspects.size} selected)
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllQualified}
                      className="text-sm text-purple-400 hover:text-purple-300"
                    >
                      Select All
                    </button>
                    <span className="text-gray-600">|</span>
                    <button
                      onClick={deselectAllProspects}
                      className="text-sm text-gray-400 hover:text-gray-300"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-4">
                  {qualifiedProspects.map((prospect) => (
                    <ProspectCard key={prospect.domain} prospect={prospect} isQualified={true} />
                  ))}
                </div>

                <button
                  onClick={runBatch}
                  disabled={processing || selectedProspects.size === 0}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                >
                  {processing
                    ? "Processing..."
                    : `Run Pipeline on ${selectedProspects.size} Prospects`}
                </button>
              </div>
            )}

            {/* Disqualified Prospects (collapsible) */}
            {disqualifiedProspects.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={() => setShowDisqualified(!showDisqualified)}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300"
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${showDisqualified ? "rotate-90" : ""}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  {disqualifiedProspects.length} Disqualified (click to {showDisqualified ? "hide" : "show"})
                </button>

                {showDisqualified && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mt-3">
                    {disqualifiedProspects.map((prospect) => (
                      <ProspectCard key={prospect.domain} prospect={prospect} isQualified={false} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* No results message */}
            {!discovering && qualifiedProspects.length === 0 && disqualifiedProspects.length === 0 && (
              <div className="text-gray-500 text-sm mt-4">
                Click &quot;Find Prospects&quot; to discover brands in this niche.
              </div>
            )}

            {/* Batch Results */}
            {batchResults && (
              <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
                <h3 className="font-medium mb-2">Batch Results</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  <div>
                    <div className="text-2xl font-bold text-green-400">
                      {batchResults.filter((r) => r.success && !r.skipped).length}
                    </div>
                    <div className="text-xs text-gray-500">New Leads</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-400">
                      {batchResults.filter((r) => r.skipped).length}
                    </div>
                    <div className="text-xs text-gray-500">Skipped</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-400">
                      {batchResults.filter((r) => !r.success).length}
                    </div>
                    <div className="text-xs text-gray-500">Failed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-400">
                      {batchResults.filter((r) => r.contactEmail).length}
                    </div>
                    <div className="text-xs text-gray-500">With Contact</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {batchResults.map((r) => (
                    <span
                      key={r.domain}
                      className={`inline-block mr-2 mb-1 px-2 py-0.5 rounded ${
                        r.success
                          ? r.skipped
                            ? "bg-yellow-900/50 text-yellow-400"
                            : "bg-green-900/50 text-green-400"
                          : "bg-red-900/50 text-red-400"
                      }`}
                    >
                      {r.domain}: {r.success ? (r.skipped ? "skipped" : `${r.score}`) : "failed"}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="bg-gray-900 rounded-lg p-4 mb-6 flex gap-4 items-end flex-wrap">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters({ ...filters, status: e.target.value as LeadStatus | "" });
                setPage(1);
              }}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
            >
              <option value="">All</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="replied">Replied</option>
              <option value="converted">Converted</option>
              <option value="not_interested">Not Interested</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Min Score</label>
            <input
              type="number"
              value={filters.minScore}
              onChange={(e) => {
                setFilters({ ...filters, minScore: e.target.value });
                setPage(1);
              }}
              placeholder="0"
              className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Max Score</label>
            <input
              type="number"
              value={filters.maxScore}
              onChange={(e) => {
                setFilters({ ...filters, maxScore: e.target.value });
                setPage(1);
              }}
              placeholder="100"
              className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <button
            onClick={() => {
              setFilters({ status: "", minScore: "", maxScore: "" });
              setPage(1);
            }}
            className="px-3 py-2 text-gray-400 hover:text-white text-sm"
          >
            Clear filters
          </button>
        </div>

        {/* Bulk Actions Bar */}
        {selectedLeads.size > 0 && (
          <div className="bg-red-900/30 border border-red-800/50 rounded-lg p-4 mb-4 flex items-center justify-between">
            <div className="text-sm">
              <span className="font-medium">{selectedLeads.size}</span> lead{selectedLeads.size > 1 ? "s" : ""} selected
            </div>
            <div className="flex gap-3">
              <button
                onClick={deselectAllLeads}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-white"
              >
                Deselect All
              </button>
              <button
                onClick={deleteSelectedLeads}
                disabled={deleting}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {deleting ? "Deleting..." : "Delete Selected"}
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={leads.length > 0 && selectedLeads.size === leads.length}
                      onChange={(e) => e.target.checked ? selectAllLeads() : deselectAllLeads()}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-red-600 focus:ring-red-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-400">Brand</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-400">Score</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-400">Contact</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-400">Status</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-400">Created</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No leads found. Use Discover Leads to find prospects.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} className={`border-b border-gray-800 hover:bg-gray-800/50 ${selectedLeads.has(lead.id) ? "bg-red-900/10" : ""}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedLeads.has(lead.id)}
                          onChange={() => toggleLeadSelection(lead.id)}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-red-600 focus:ring-red-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium">{lead.brand_name || lead.domain}</div>
                          <div className="text-sm text-gray-500">{lead.domain}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {lead.score !== null ? (
                          <div>
                            <span
                              className={`font-bold ${
                                lead.score >= 80
                                  ? "text-green-400"
                                  : lead.score >= 60
                                  ? "text-yellow-400"
                                  : "text-red-400"
                              }`}
                            >
                              {lead.score}
                            </span>
                            <span className="text-gray-500 text-sm ml-1">
                              {lead.verdict}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {lead.contact_name ? (
                          <div>
                            <div className="font-medium">{lead.contact_name}</div>
                            <div className="text-sm text-gray-500">{lead.contact_title}</div>
                            <a
                              href={`mailto:${lead.contact_email}`}
                              className="text-sm text-blue-400 hover:text-blue-300"
                            >
                              {lead.contact_email}
                            </a>
                          </div>
                        ) : (
                          <span className="text-gray-500">No contact</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={lead.status}
                          onChange={(e) => updateStatus(lead.id, e.target.value as LeadStatus)}
                          className={`px-2 py-1 rounded text-sm ${STATUS_COLORS[lead.status]} border-0 cursor-pointer`}
                        >
                          {Object.entries(STATUS_LABELS).map(([value, label]) => (
                            <option key={value} value={value} className="bg-gray-800 text-white">
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {lead.report_url && (
                            <a
                              href={lead.report_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs"
                            >
                              Report
                            </a>
                          )}
                          {lead.contact_email && lead.report_url && (
                            <button
                              onClick={() => copyEmail(lead)}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                            >
                              {copiedId === lead.id ? "Copied!" : "Copy Email"}
                            </button>
                          )}
                          {lead.contact_linkedin && (
                            <a
                              href={lead.contact_linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs"
                            >
                              LinkedIn
                            </a>
                          )}
                          <button
                            onClick={() => deleteSingleLead(lead.id, lead.brand_name || lead.domain)}
                            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/30 rounded transition-colors"
                            title="Delete lead"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
              <div className="text-sm text-gray-400">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
