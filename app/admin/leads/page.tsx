"use client";

import { useState, useEffect, useCallback } from "react";

type LeadStatus = "new" | "contacted" | "replied" | "converted" | "not_interested";

interface Lead {
  id: string;
  domain: string;
  brand_name: string | null;
  report_url: string | null;
  report_slug: string | null;
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

interface Prospect {
  domain: string;
  brandName: string | null;
  hasAds: boolean;
  score: number | null;
  verdict: string | null;
  reportUrl: string | null;
  contact: {
    name: string;
    title: string | null;
    email: string | null;
    linkedin: string | null;
  } | null;
  alreadyLead: boolean;
  qualified: boolean;
  disqualifyReason: string | null;
}

interface ApolloContact {
  name: string;
  email: string;
  title?: string;
  company?: string;
  domain: string;
}

interface ApolloResult {
  domain: string;
  name: string;
  email: string;
  status: "qualified" | "no_ads" | "ads_found" | "exists" | "error";
  brand?: string;
  score?: number;
  verdict?: string;
  reportUrl?: string;
  leadId?: string;
  error?: string;
}

// Available niches from curated domain lists
const NICHES = [
  { value: "supplements", label: "Supplements" },
  { value: "skincare", label: "Skincare" },
  { value: "beauty", label: "Beauty" },
  { value: "health/wellness", label: "Health & Wellness" },
  { value: "food/drink", label: "Food & Drink" },
  { value: "pet", label: "Pet" },
  { value: "fashion", label: "Fashion" },
  { value: "home/kitchen", label: "Home & Kitchen" },
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
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});

  // Delete state
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  // Discover state
  const [showDiscover, setShowDiscover] = useState(false);
  const [discoverNiche, setDiscoverNiche] = useState("supplements");
  const [discoverLimit, setDiscoverLimit] = useState(5);
  const [discovering, setDiscovering] = useState(false);
  const [qualifiedProspects, setQualifiedProspects] = useState<Prospect[]>([]);
  const [disqualifiedProspects, setDisqualifiedProspects] = useState<Prospect[]>([]);
  const [showDisqualified, setShowDisqualified] = useState(false);

  // Apollo import state
  const [showApolloImport, setShowApolloImport] = useState(false);
  const [apolloContacts, setApolloContacts] = useState<ApolloContact[]>([]);
  const [apolloProcessing, setApolloProcessing] = useState(false);
  const [apolloProgress, setApolloProgress] = useState({ current: 0, total: 0 });
  const [apolloResults, setApolloResults] = useState<ApolloResult[] | null>(null);

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

  // Fetch view counts when leads change
  useEffect(() => {
    const fetchViewCounts = async () => {
      try {
        const response = await fetch("/api/analytics/views?forLeads=true");
        const data = await response.json();
        if (data.success) {
          setViewCounts(data.counts);
        }
      } catch (error) {
        console.error("Failed to fetch view counts:", error);
      }
    };

    if (leads.length > 0) {
      fetchViewCounts();
    }
  }, [leads]);

  const discoverProspects = async () => {
    setDiscovering(true);
    setQualifiedProspects([]);
    setDisqualifiedProspects([]);

    try {
      const response = await fetch("/api/prospect/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: discoverNiche,
          limit: discoverLimit,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setQualifiedProspects(data.qualified || []);
        setDisqualifiedProspects(data.disqualified || []);
        // Refresh leads list since qualified prospects are auto-saved
        if (data.qualified && data.qualified.length > 0) {
          fetchLeads();
        }
      } else if (data.error) {
        alert(data.error);
      }
    } catch (error) {
      console.error("Failed to discover prospects:", error);
    } finally {
      setDiscovering(false);
    }
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

  const exportForInstantly = () => {
    window.location.href = `/api/leads/export-instantly`;
  };

  // Parse Apollo CSV file
  const handleApolloCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim());

      if (lines.length < 2) {
        alert("CSV file is empty or has no data rows");
        return;
      }

      // Parse header row
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));

      // Find column indices
      const nameIdx = headers.findIndex((h) => h === "name" || h === "full name" || h === "contact name");
      const emailIdx = headers.findIndex((h) => h === "email" || h === "contact email" || h === "work email");
      const titleIdx = headers.findIndex((h) => h === "title" || h === "job title" || h === "position");
      const companyIdx = headers.findIndex((h) => h === "company" || h === "company name" || h === "organization");
      const domainIdx = headers.findIndex((h) => h === "domain" || h === "website" || h === "company domain");

      if (emailIdx === -1) {
        alert("CSV must have an 'email' column");
        return;
      }

      // Parse data rows
      const contacts: ApolloContact[] = [];
      for (let i = 1; i < lines.length; i++) {
        // Handle quoted CSV values
        const values: string[] = [];
        let current = "";
        let inQuotes = false;
        for (const char of lines[i]) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            values.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        values.push(current.trim());

        const email = values[emailIdx]?.replace(/"/g, "");
        if (!email || !email.includes("@")) continue;

        // Extract domain from email if no domain column
        let domain = domainIdx >= 0 ? values[domainIdx]?.replace(/"/g, "") : "";
        if (!domain) {
          domain = email.split("@")[1];
        }
        domain = domain?.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];

        if (!domain) continue;

        contacts.push({
          name: nameIdx >= 0 ? values[nameIdx]?.replace(/"/g, "") || email.split("@")[0] : email.split("@")[0],
          email,
          title: titleIdx >= 0 ? values[titleIdx]?.replace(/"/g, "") : undefined,
          company: companyIdx >= 0 ? values[companyIdx]?.replace(/"/g, "") : undefined,
          domain,
        });
      }

      if (contacts.length === 0) {
        alert("No valid contacts found in CSV");
        return;
      }

      setApolloContacts(contacts);
      setApolloResults(null);
    };

    reader.readAsText(file);
  };

  // Process Apollo contacts
  const processApolloContacts = async () => {
    if (apolloContacts.length === 0) return;

    setApolloProcessing(true);
    setApolloProgress({ current: 0, total: apolloContacts.length });
    setApolloResults(null);

    try {
      const response = await fetch("/api/prospect/from-apollo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts: apolloContacts }),
      });

      const data = await response.json();

      if (data.success) {
        setApolloResults(data.results);
        fetchLeads(); // Refresh leads list
      } else {
        alert(data.error || "Failed to process contacts");
      }
    } catch (error) {
      console.error("Apollo import error:", error);
      alert("Failed to process contacts");
    } finally {
      setApolloProcessing(false);
    }
  };

  const clearApolloImport = () => {
    setApolloContacts([]);
    setApolloResults(null);
  };

  const totalPages = Math.ceil(total / 50);

  const ProspectCard = ({ prospect, isQualified }: { prospect: Prospect; isQualified: boolean }) => (
    <div
      className={`p-4 rounded-lg border transition-colors ${
        prospect.alreadyLead
          ? "bg-gray-800/50 border-gray-700 opacity-50"
          : isQualified
          ? "bg-green-900/30 border-green-600"
          : "bg-gray-800/50 border-gray-700"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{prospect.brandName || prospect.domain}</div>
          <div className="text-xs text-gray-500 truncate">{prospect.domain}</div>
        </div>
        {/* Score badge */}
        {prospect.score !== null && (
          <div className={`text-lg font-bold ${
            prospect.score >= 80 ? "text-green-400" :
            prospect.score >= 60 ? "text-yellow-400" : "text-red-400"
          }`}>
            {prospect.score}
          </div>
        )}
      </div>

      {/* Verdict & Report */}
      {prospect.verdict && (
        <div className="mb-2">
          <span className={`text-xs px-2 py-0.5 rounded ${
            prospect.verdict === "READY TO TEST" ? "bg-green-900/50 text-green-400" :
            prospect.verdict === "NEEDS WORK" ? "bg-yellow-900/50 text-yellow-400" :
            "bg-red-900/50 text-red-400"
          }`}>
            {prospect.verdict}
          </span>
          {prospect.reportUrl && (
            <a
              href={prospect.reportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-xs text-blue-400 hover:text-blue-300"
            >
              View Report
            </a>
          )}
        </div>
      )}

      {/* Contact Info */}
      {prospect.contact ? (
        <div className="mt-2 pt-2 border-t border-gray-700">
          <div className="text-sm font-medium text-white">{prospect.contact.name}</div>
          <div className="text-xs text-purple-400">{prospect.contact.title || "No title"}</div>
          <div className="text-xs text-gray-500 truncate mt-1">{prospect.contact.email || "No email"}</div>
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
      {prospect.hasAds && !prospect.alreadyLead && isQualified && (
        <div className="mt-2">
          <span className="text-xs bg-green-900/50 text-green-400 px-2 py-0.5 rounded">
            Saved as lead
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
          <div className="flex gap-3 flex-wrap">
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
            <button
              onClick={() => setShowApolloImport(!showApolloImport)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                showApolloImport
                  ? "bg-orange-600 hover:bg-orange-700"
                  : "bg-orange-600/20 text-orange-400 hover:bg-orange-600/30"
              }`}
            >
              {showApolloImport ? "Hide Apollo Import" : "Import from Apollo"}
            </button>
            <a
              href="/admin/pipeline"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              Single Pipeline
            </a>
            <button
              onClick={exportForInstantly}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
            >
              Export for Instantly
            </button>
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
              Processes curated DTC brand domains: checks for active ads, scores their creatives, and finds decision-maker contacts via Apollo. Leads are automatically saved.
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
                <label className="block text-sm text-gray-400 mb-1">Find (qualified)</label>
                <input
                  type="number"
                  value={discoverLimit}
                  onChange={(e) => setDiscoverLimit(Math.min(20, Math.max(1, parseInt(e.target.value) || 5)))}
                  className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  min={1}
                  max={20}
                />
              </div>
              <button
                onClick={discoverProspects}
                disabled={discovering}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 rounded-lg font-medium transition-colors"
              >
                {discovering ? "Processing..." : "Find Prospects"}
              </button>
            </div>

            {discovering && (
              <div className="flex items-center gap-3 text-gray-400">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500"></div>
                <span>Processing domains: checking ads, scoring, finding contacts... This may take a few minutes.</span>
              </div>
            )}

            {/* Qualified Prospects - Already saved as leads */}
            {qualifiedProspects.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-medium text-green-400">
                      {qualifiedProspects.length} New Leads Created
                    </span>
                    <span className="text-sm text-gray-500">
                      (scored + contact found)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {qualifiedProspects.map((prospect) => (
                    <ProspectCard key={prospect.domain} prospect={prospect} isQualified={true} />
                  ))}
                </div>
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
                Select a niche and click &quot;Find Prospects&quot; to process curated brand domains.
              </div>
            )}

            {/* Discovery Summary */}
            {(qualifiedProspects.length > 0 || disqualifiedProspects.length > 0) && (
              <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
                <h3 className="font-medium mb-2">Discovery Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-green-400">
                      {qualifiedProspects.length}
                    </div>
                    <div className="text-xs text-gray-500">New Leads</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-400">
                      {disqualifiedProspects.filter((p) => p.disqualifyReason === "No active ads found").length}
                    </div>
                    <div className="text-xs text-gray-500">No Ads</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-400">
                      {qualifiedProspects.filter((p) => p.contact?.email).length}
                    </div>
                    <div className="text-xs text-gray-500">With Email</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-400">
                      {disqualifiedProspects.filter((p) => p.alreadyLead).length}
                    </div>
                    <div className="text-xs text-gray-500">Already Leads</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Apollo Import Section */}
        {showApolloImport && (
          <div className="bg-gradient-to-r from-orange-900/30 to-yellow-900/30 border border-orange-800/50 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-2">Import from Apollo</h2>
            <p className="text-sm text-gray-400 mb-4">
              Upload a CSV of contacts from Apollo. We&apos;ll check if they run ads and score their creatives.
            </p>

            {/* CSV Upload */}
            {apolloContacts.length === 0 && !apolloResults && (
              <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleApolloCSV}
                  className="hidden"
                  id="apollo-csv-input"
                />
                <label
                  htmlFor="apollo-csv-input"
                  className="cursor-pointer flex flex-col items-center gap-3"
                >
                  <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-gray-400">
                    <span className="text-orange-400 hover:text-orange-300">Click to upload</span> Apollo CSV
                  </span>
                  <span className="text-xs text-gray-500">
                    Required columns: email, domain (or will extract from email)
                  </span>
                </label>
              </div>
            )}

            {/* Preview Contacts */}
            {apolloContacts.length > 0 && !apolloResults && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-medium">
                    {apolloContacts.length} contacts ready to process
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={clearApolloImport}
                      className="px-3 py-1.5 text-sm text-gray-400 hover:text-white"
                    >
                      Clear
                    </button>
                    <button
                      onClick={processApolloContacts}
                      disabled={apolloProcessing}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 rounded-lg font-medium transition-colors"
                    >
                      {apolloProcessing
                        ? `Processing ${apolloProgress.current}/${apolloProgress.total}...`
                        : "Process All"}
                    </button>
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-800 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-400">Name</th>
                        <th className="px-3 py-2 text-left text-gray-400">Email</th>
                        <th className="px-3 py-2 text-left text-gray-400">Title</th>
                        <th className="px-3 py-2 text-left text-gray-400">Company</th>
                        <th className="px-3 py-2 text-left text-gray-400">Domain</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apolloContacts.slice(0, 20).map((contact, idx) => (
                        <tr key={idx} className="border-t border-gray-700">
                          <td className="px-3 py-2">{contact.name}</td>
                          <td className="px-3 py-2 text-gray-400">{contact.email}</td>
                          <td className="px-3 py-2 text-gray-500">{contact.title || "-"}</td>
                          <td className="px-3 py-2 text-gray-500">{contact.company || "-"}</td>
                          <td className="px-3 py-2 text-gray-500">{contact.domain}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {apolloContacts.length > 20 && (
                    <div className="px-3 py-2 text-center text-gray-500 text-sm bg-gray-800">
                      ... and {apolloContacts.length - 20} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Processing Progress */}
            {apolloProcessing && (
              <div className="flex items-center gap-3 text-gray-400 mt-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500"></div>
                <span>Processing contacts (this may take a few minutes)...</span>
              </div>
            )}

            {/* Results */}
            {apolloResults && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">Import Results</h3>
                  <button
                    onClick={clearApolloImport}
                    className="text-sm text-gray-400 hover:text-white"
                  >
                    Clear & Import More
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-400">
                      {apolloResults.filter((r) => r.status === "qualified").length}
                    </div>
                    <div className="text-xs text-gray-500">Scored</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-orange-400">
                      {apolloResults.filter((r) => r.status === "ads_found").length}
                    </div>
                    <div className="text-xs text-gray-500">Ads Found (pending)</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-yellow-400">
                      {apolloResults.filter((r) => r.status === "no_ads").length}
                    </div>
                    <div className="text-xs text-gray-500">No Ads Found</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-400">
                      {apolloResults.filter((r) => r.status === "exists").length}
                    </div>
                    <div className="text-xs text-gray-500">Already Exists</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-red-400">
                      {apolloResults.filter((r) => r.status === "error").length}
                    </div>
                    <div className="text-xs text-gray-500">Errors</div>
                  </div>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {apolloResults.map((result, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-2 rounded text-sm ${
                        result.status === "qualified"
                          ? "bg-green-900/30"
                          : result.status === "ads_found"
                          ? "bg-orange-900/30"
                          : result.status === "no_ads"
                          ? "bg-yellow-900/30"
                          : result.status === "exists"
                          ? "bg-blue-900/30"
                          : "bg-red-900/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{result.name}</span>
                        <span className="text-gray-500">{result.domain}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {result.score && (
                          <span className="text-green-400 font-medium">{result.score}/100</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          result.status === "qualified"
                            ? "bg-green-800 text-green-300"
                            : result.status === "ads_found"
                            ? "bg-orange-800 text-orange-300"
                            : result.status === "no_ads"
                            ? "bg-yellow-800 text-yellow-300"
                            : result.status === "exists"
                            ? "bg-blue-800 text-blue-300"
                            : "bg-red-800 text-red-300"
                        }`}>
                          {result.status === "qualified" ? "Scored" :
                           result.status === "ads_found" ? "Ads Found" :
                           result.status === "no_ads" ? "No Ads" :
                           result.status === "exists" ? "Exists" : "Error"}
                        </span>
                      </div>
                    </div>
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
                  <th className="px-4 py-3 text-sm font-medium text-gray-400">Views</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-400">Contact</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-400">Status</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-400">Created</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
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
                        {lead.report_slug && viewCounts[lead.report_slug] ? (
                          <div className="flex items-center gap-1 text-sm">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span className="text-purple-400 font-medium">{viewCounts[lead.report_slug]}</span>
                          </div>
                        ) : (
                          <span className="text-gray-600">0</span>
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
