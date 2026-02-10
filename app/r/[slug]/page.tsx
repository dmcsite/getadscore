import { notFound } from "next/navigation";
import { getPublicReportBySlug } from "@/lib/db";
import Link from "next/link";
import ViewTracker from "./ViewTracker";

// Category display names and order
const CATEGORY_ORDER = [
  { key: "thumb_stop", name: "Thumb-Stop Power" },
  { key: "hook_clarity", name: "Hook Clarity" },
  { key: "text_legibility", name: "Text Legibility" },
  { key: "social_proof", name: "Social Proof" },
  { key: "product_visibility", name: "Product Visibility" },
  { key: "cta_strength", name: "CTA Strength" },
  { key: "emotional_trigger", name: "Emotional Trigger" },
  { key: "platform_nativity", name: "Platform Nativity" },
];

function getScoreColor(score: number): string {
  if (score >= 8) return "text-green-400";
  if (score >= 6) return "text-yellow-400";
  if (score >= 4) return "text-orange-400";
  return "text-red-400";
}

function getScoreBgColor(score: number): string {
  if (score >= 8) return "bg-green-500/20";
  if (score >= 6) return "bg-yellow-500/20";
  if (score >= 4) return "bg-orange-500/20";
  return "bg-red-500/20";
}

function getVerdictColor(verdict: string): string {
  switch (verdict) {
    case "READY TO TEST":
      return "text-green-400 bg-green-500/20 border-green-500/30";
    case "NEEDS WORK":
      return "text-yellow-400 bg-yellow-500/20 border-yellow-500/30";
    case "MAJOR ISSUES":
      return "text-red-400 bg-red-500/20 border-red-500/30";
    default:
      return "text-zinc-400 bg-zinc-500/20 border-zinc-500/30";
  }
}

export default async function PublicReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const report = await getPublicReportBySlug(slug);

  if (!report) {
    notFound();
  }

  const { report_data } = report;

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100">
      {/* Track view */}
      <ViewTracker slug={slug} />

      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-zinc-100">
            GetAdScore
          </Link>
          <Link
            href="/"
            className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            Score Your Own Ad
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Report Header */}
        <div className="text-center mb-8">
          <p className="text-zinc-500 text-sm mb-2">Ad Analysis Report</p>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">{report.ad_name}</h1>
          <p className="text-zinc-500 text-sm">
            Generated {new Date(report.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Creative + Score Section */}
        <div className={`mb-12 ${report.creative_url ? "grid md:grid-cols-2 gap-8 items-start" : ""}`}>
          {/* Ad Creative Preview */}
          {report.creative_url && (
            <div className="flex justify-center">
              <div className="w-full max-w-sm">
                {/* Facebook Feed Mockup */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                  {/* Header */}
                  <div className="p-3 flex items-center gap-3 border-b border-zinc-800">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-700 flex items-center justify-center text-white font-bold text-sm">
                      {report.ad_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-zinc-200">{report.ad_name}</p>
                      <p className="text-xs text-zinc-500 flex items-center gap-1">
                        Sponsored ·
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                        </svg>
                      </p>
                    </div>
                  </div>
                  {/* Creative */}
                  <div className="relative bg-zinc-800">
                    {report_data.media_type === "video" ? (
                      // For videos: show thumbnail image with play overlay, or video player
                      report.thumbnail_url ? (
                        <div className="relative">
                          <img
                            src={report.thumbnail_url}
                            alt={report.ad_name}
                            className="w-full h-auto"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-16 h-16 rounded-full bg-black/60 flex items-center justify-center">
                              <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // No thumbnail - show video player
                        <video
                          src={report.creative_url}
                          className="w-full h-auto"
                          controls
                          muted
                          playsInline
                          preload="metadata"
                        />
                      )
                    ) : (
                      // For images: display directly, preserving aspect ratio
                      <img
                        src={report.creative_url}
                        alt={report.ad_name}
                        className="w-full h-auto"
                      />
                    )}
                  </div>
                  {/* Ad Copy Text - shown inside the feed mockup */}
                  {report_data.ad_copy && (
                    <div className="p-3 border-t border-zinc-800">
                      <p className="text-sm text-zinc-300 whitespace-pre-wrap line-clamp-4">
                        {report_data.ad_copy}
                      </p>
                      {report_data.ad_copy.length > 200 && (
                        <p className="text-xs text-zinc-500 mt-1">See more</p>
                      )}
                    </div>
                  )}
                  {/* Engagement Bar */}
                  <div className="p-3 flex items-center justify-between text-zinc-500 text-xs border-t border-zinc-800">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                        </svg>
                        Like
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Comment
                      </span>
                    </div>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      Share
                    </span>
                  </div>
                </div>
                <p className="text-center text-zinc-600 text-xs mt-2">Facebook Feed Preview</p>
              </div>
            </div>
          )}

          {/* Score Circle */}
          <div className="flex flex-col items-center">
            <div className="relative w-40 h-40 mb-4">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke="#27272a"
                strokeWidth="12"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke={report.overall_score >= 70 ? "#22c55e" : report.overall_score >= 50 ? "#eab308" : "#ef4444"}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${(report.overall_score / 100) * 440} 440`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-bold">{report.overall_score}</span>
              <span className="text-zinc-500 text-sm">out of 100</span>
            </div>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getVerdictColor(report.verdict)}`}>
            {report.verdict}
          </span>
          </div>
        </div>

        {/* Ad Copy Section - Full text for when there's no creative or for expanded view */}
        {report_data.ad_copy && !report.creative_url && (
          <div className="mb-12 p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h2 className="text-lg font-semibold">Ad Copy Analyzed</h2>
            </div>
            <p className="text-zinc-300 whitespace-pre-wrap leading-relaxed">{report_data.ad_copy}</p>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <h3 className="font-semibold text-green-400">Strength</h3>
            </div>
            <p className="text-zinc-300 text-sm">{report_data.summary.strength}</p>
          </div>
          <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="font-semibold text-red-400">Risk</h3>
            </div>
            <p className="text-zinc-300 text-sm">{report_data.summary.risk}</p>
          </div>
          <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 className="font-semibold text-blue-400">Quick Win</h3>
            </div>
            <p className="text-zinc-300 text-sm">{report_data.summary.quick_win}</p>
          </div>
        </div>

        {/* Category Scores */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-6">Category Scores</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {CATEGORY_ORDER.map(({ key, name }) => {
              const categoryData = report_data.scores[key];
              if (!categoryData) return null;
              return (
                <div
                  key={key}
                  className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{name}</span>
                    <span className={`text-2xl font-bold ${getScoreColor(categoryData.score)}`}>
                      {categoryData.score}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full mb-3">
                    <div
                      className={`h-full rounded-full ${getScoreBgColor(categoryData.score).replace('/20', '')}`}
                      style={{ width: `${categoryData.score * 10}%` }}
                    />
                  </div>
                  <p className="text-zinc-400 text-sm">{categoryData.reason}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Fixes */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-6">Top Fixes</h2>
          <div className="space-y-3">
            {report_data.top_fixes.map((fix, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800"
              >
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-semibold">
                  {index + 1}
                </span>
                <p className="text-zinc-300 pt-1">{fix}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Download PDF */}
        {report.pdf_url && (
          <div className="text-center mb-12">
            <a
              href={report.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-zinc-100 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download PDF Report
            </a>
          </div>
        )}

        {/* CTA */}
        <div className="text-center p-8 rounded-2xl bg-zinc-900/80 border border-zinc-700/50">
          <h2 className="text-2xl font-bold mb-3">Want to score more ads?</h2>
          <p className="text-zinc-400 mb-6">
            Get instant feedback on your creatives before you spend.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors text-white font-medium"
          >
            Try GetAdScore Free
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 mt-12 py-8">
        <div className="max-w-5xl mx-auto px-6 text-center text-zinc-500 text-sm">
          <p>Powered by <Link href="/" className="text-zinc-400 hover:text-zinc-100">GetAdScore</Link></p>
        </div>
      </footer>
    </div>
  );
}
