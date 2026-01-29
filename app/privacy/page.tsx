import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - GetAdScore",
  description: "Privacy Policy for GetAdScore",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      <header className="border-b border-zinc-800 bg-[#0a0a0b]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <span className="font-semibold text-lg text-zinc-100">GetAdScore</span>
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-zinc-100 mb-8">Privacy Policy</h1>
        <div className="prose prose-invert prose-zinc max-w-none">
          <p className="text-zinc-400 mb-4">Last updated: January 29, 2026</p>

          <p className="text-zinc-300 mb-6">
            DMCSITE LLC, doing business as GetAdScore (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), operates the GetAdScore website and service. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.
          </p>

          <h2 className="text-xl font-semibold text-zinc-100 mt-8 mb-4">Information We Collect</h2>

          <h3 className="text-lg font-medium text-zinc-200 mt-6 mb-3">Information You Provide</h3>
          <ul className="list-disc pl-6 text-zinc-300 space-y-2 mb-4">
            <li><strong>Account Information:</strong> When you create an account, we may collect your email address and name.</li>
            <li><strong>Uploaded Content:</strong> Ad images and videos you upload for analysis. These are processed to provide our scoring service and may be temporarily stored during analysis.</li>
            <li><strong>Ad Copy:</strong> Text content you provide for analysis, including primary text, headlines, and descriptions.</li>
            <li><strong>Payment Information:</strong> If you subscribe to a paid plan, payment processing is handled by third-party providers (e.g., Stripe). We do not store your full credit card information.</li>
          </ul>

          <h3 className="text-lg font-medium text-zinc-200 mt-6 mb-3">Information Collected Automatically</h3>
          <ul className="list-disc pl-6 text-zinc-300 space-y-2 mb-4">
            <li><strong>Usage Data:</strong> Information about how you use our service, including features accessed and analysis requests made.</li>
            <li><strong>Device Information:</strong> Browser type, operating system, and device identifiers.</li>
            <li><strong>Log Data:</strong> IP addresses, access times, and pages viewed.</li>
          </ul>

          <h2 className="text-xl font-semibold text-zinc-100 mt-8 mb-4">How We Use Your Information</h2>
          <ul className="list-disc pl-6 text-zinc-300 space-y-2 mb-4">
            <li>To provide and maintain our ad scoring and analysis service</li>
            <li>To process your uploaded content through our AI analysis systems</li>
            <li>To communicate with you about your account, updates, and support</li>
            <li>To improve and optimize our service</li>
            <li>To comply with legal obligations</li>
          </ul>

          <h2 className="text-xl font-semibold text-zinc-100 mt-8 mb-4">Third-Party Services</h2>
          <p className="text-zinc-300 mb-4">
            We use the following third-party services to provide our analysis capabilities:
          </p>
          <ul className="list-disc pl-6 text-zinc-300 space-y-2 mb-4">
            <li><strong>Anthropic (Claude API):</strong> We send your uploaded images and videos to Anthropic&apos;s API for AI-powered visual analysis. Anthropic&apos;s use of this data is governed by their privacy policy.</li>
            <li><strong>OpenAI (Whisper API):</strong> For video uploads, we may send audio to OpenAI&apos;s Whisper API for transcription. OpenAI&apos;s use of this data is governed by their privacy policy.</li>
            <li><strong>Vercel:</strong> Our service is hosted on Vercel. Their infrastructure may process request data as part of providing hosting services.</li>
          </ul>

          <h2 className="text-xl font-semibold text-zinc-100 mt-8 mb-4">Data Retention</h2>
          <p className="text-zinc-300 mb-4">
            Uploaded ad content is processed in real-time and is not permanently stored on our servers. Temporary files created during processing are deleted immediately after analysis is complete. We retain account information and usage data for as long as your account is active or as needed to provide you services.
          </p>

          <h2 className="text-xl font-semibold text-zinc-100 mt-8 mb-4">Data Sharing</h2>
          <p className="text-zinc-300 mb-4">
            <strong>We do not sell your personal information or uploaded content.</strong> We only share data with third parties as described above (AI service providers) to provide our core service functionality.
          </p>

          <h2 className="text-xl font-semibold text-zinc-100 mt-8 mb-4">Cookies</h2>
          <p className="text-zinc-300 mb-4">
            We use essential cookies to maintain your session and preferences. We may use analytics cookies to understand how our service is used. You can control cookie preferences through your browser settings.
          </p>

          <h2 className="text-xl font-semibold text-zinc-100 mt-8 mb-4">Security</h2>
          <p className="text-zinc-300 mb-4">
            We implement appropriate technical and organizational measures to protect your information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
          </p>

          <h2 className="text-xl font-semibold text-zinc-100 mt-8 mb-4">Your Rights</h2>
          <p className="text-zinc-300 mb-4">
            Depending on your location, you may have rights regarding your personal information, including the right to access, correct, or delete your data. To exercise these rights, please contact us at support@getadscore.com.
          </p>

          <h2 className="text-xl font-semibold text-zinc-100 mt-8 mb-4">Children&apos;s Privacy</h2>
          <p className="text-zinc-300 mb-4">
            Our service is not directed to individuals under 18. We do not knowingly collect personal information from children.
          </p>

          <h2 className="text-xl font-semibold text-zinc-100 mt-8 mb-4">Changes to This Policy</h2>
          <p className="text-zinc-300 mb-4">
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
          </p>

          <h2 className="text-xl font-semibold text-zinc-100 mt-8 mb-4">Contact Us</h2>
          <p className="text-zinc-300 mb-4">
            If you have questions about this Privacy Policy, please contact us at:
          </p>
          <p className="text-zinc-300 mb-4">
            DMCSITE LLC (DBA GetAdScore)<br />
            Email: <a href="mailto:support@getadscore.com" className="text-indigo-400 hover:text-indigo-300">support@getadscore.com</a>
          </p>
        </div>
      </main>

      <footer className="border-t border-zinc-800 mt-20">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex justify-center gap-6 text-zinc-500 text-sm">
            <a href="/privacy" className="hover:text-zinc-300 transition-colors">Privacy Policy</a>
            <a href="/terms" className="hover:text-zinc-300 transition-colors">Terms of Service</a>
            <a href="mailto:support@getadscore.com" className="hover:text-zinc-300 transition-colors">Contact</a>
          </div>
          <div className="text-center text-zinc-700 text-xs mt-4">
            © {new Date().getFullYear()} DMCSITE LLC. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
