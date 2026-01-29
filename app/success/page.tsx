import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Thanks for Subscribing! - GetAdScore",
  description: "Your GetAdScore subscription is being activated",
};

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] flex flex-col">
      <header className="border-b border-zinc-800 bg-[#0a0a0b]/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <span className="font-semibold text-lg text-zinc-100">GetAdScore</span>
          </Link>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center px-6 py-12">
        <div className="max-w-lg text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-zinc-100 mb-4">Thanks for Subscribing!</h1>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-6 text-left">
            <p className="text-zinc-300 mb-4">
              Email <a href="mailto:support@getadscore.com" className="text-indigo-400 hover:text-indigo-300 font-medium">support@getadscore.com</a> from the email you used to pay, and we&apos;ll activate your unlimited access within a few hours.
            </p>
            <p className="text-zinc-500 text-sm">
              Questions? Reply to your receipt email.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to GetAdScore
          </Link>
        </div>
      </main>

      <footer className="border-t border-zinc-800">
        <div className="max-w-4xl mx-auto px-6 py-6 text-center text-zinc-600 text-sm">
          © {new Date().getFullYear()} DMCSITE LLC. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
