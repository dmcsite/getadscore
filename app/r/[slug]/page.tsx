import { notFound } from "next/navigation";
import { getPublicReportBySlug } from "@/lib/db";
import Link from "next/link";

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
        <div className="text-center mb-12">
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

        {/* Score Circle */}
        <div className="flex flex-col items-center mb-12">
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
