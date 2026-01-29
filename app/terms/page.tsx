import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - GetAdScore",
  description: "Terms of Service for GetAdScore",
};

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold text-zinc-100 mb-8">Terms of Service</h1>
        <div className="prose prose-invert prose-zinc max-w-none">
          <p className="text-zinc-400 mb-4">Last updated: January 29, 2026</p>

          <p className="text-zinc-300 mb-6">
            These Terms of Service (&quot;Terms&quot;) govern your use of the GetAdScore website and service operated by DMCSITE LLC, doing business as GetAdScore (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By accessing or using our service, you agree to be bound by these Terms.
          </p>

          <h2 className="text-xl font-semibold text-zinc-100 mt-8 mb-4">1. Service Description</h2>
          <p className="text-zinc-300 mb-4">
            GetAdScore is an AI-powered ad creative analysis tool that helps media buyers and advertisers evaluate their ad creatives before spending money on testing. Our service analyzes uploaded images and videos to provide scores, feedback, and recommendations based on advertising best practices.
          </p>
          <p className="text-zinc-300 mb-4">
            <strong>Important:</strong> GetAdScore provides analysis and recommendations based on general advertising principles. We do not guarantee ad performance, return on ad spend (ROAS), or approval by any advertising platform. Results may vary based on numerous factors outside our control.
          </p>

          <h2 className="text-xl font-semibold text-zinc-100 mt-8 mb-4">2. Account Registration</h2>
          <p className="text-zinc-300 mb-4">
            To access certain features, you may need to create an account. You agree to provide accurate, current, and complete information and to update this information as necessary. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.
          </p>

          <h2 className="text-xl font-semibold text-zinc-100 mt-8 mb-4">3. Acceptable Use</h2>
          <p className="text-zinc-300 mb-4">You agree not to:</p>
          <ul className="list-disc pl-6 text-zinc-300 space-y-2 mb-4">
            <li>Upload content that is illegal, harmful, threatening, abusive, defamatory, or otherwise objectionable</li>
            <li>Upload content that infringes on any intellectual property rights</li>
            <li>Use the service to analyze content that violates advertising platform policies</li>
            <li>Attempt to reverse engineer, decompile, or extract our algorithms or scoring methodology</li>
            <li>Use automated scripts or bots to access the service without our permission</li>
            <li>Resell or redistribute our service without authorization</li>
            <li>Interfere with or disrupt the service or servers</li>
          </ul>

          <h2 className="text-xl font-semibold text-zinc-100 mt-8 mb-4">4. Subscription and Payment Terms</h2>

          <h3 className="text-lg font-medium text-zinc-200 mt-6 mb-3">Billing</h3>
          <p className="text-zinc-300 mb-4">
            Paid subscriptions are billed in advance on a monthly or annual basis, depending on the plan selected. Your subscription will automatically renew unless cancelled before the renewal date.
          </p>

          <h3 className="text-lg font-medium text-zinc-200 mt-6 mb-3">Cancellation</h3>
          <p className="text-zinc-300 mb-4">
            You may cancel your subscription at any time through your account settings or by contacting us. Cancellation will take effect at the end of your current billing period, and you will retain access to paid features until then.
          </p>

          <h3 className="text-lg font-medium text-zinc-200 mt-6 mb-3">Refund Policy</h3>
          <p className="text-zinc-300 mb-4">
            <strong>No refunds are provided for partial months or unused portions of your subscription.</strong> If you cancel your subscription, you will not receive a refund for any remaining time in your current billing period. We encourage you to make full use of the service during your subscription period.
          </p>
          <p className="text-zinc-300 mb-4">
            In exceptional circumstances, refunds may be considered at our sole discretion. Contact us at support@getadscore.com for any billing concerns.
          </p>

          <h3 className="text-lg font-medium text-zinc-200 mt-6 mb-3">Price Changes</h3>
          <p className="text-zinc-300 mb-4">
            We reserve the right to modify pricing at any time. Price changes will be communicated in advance and will apply to subsequent billing periods.
          </p>

          <h2 className="text-xl font-semibold text-zinc-100 mt-8 mb-4">5. Intellectual Property</h2>

          <h3 className="text-lg font-medium text-zinc-200 mt-6 mb-3">Our Content</h3>
          <p className="text-zinc-300 mb-4">
            The service, including its design, features, algorithms, and scoring methodology, is owned by DMCSITE LLC and protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works based on our service without permission.
          </p>

          <h3 className="text-lg font-medium text-zinc-200 mt-6 mb-3">Your Content</h3>
          <p className="text-zinc-300 mb-4">
            You retain ownership of content you upload. By uploading content, you grant us a limited license to process and analyze that content solely to provide our service. We do not claim ownership of your uploaded content.
          </p>

          <h2 className="text-xl font-semibold text-zinc-100 mt-8 mb-4">6. Disclaimer of Warranties</h2>
          <p className="text-zinc-300 mb-4">
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>
          <p className="text-zinc-300 mb-4">
            We do not warrant that:
          </p>
          <ul className="list-disc pl-6 text-zinc-300 space-y-2 mb-4">
            <li>The service will meet your specific requirements</li>
            <li>The service will be uninterrupted, timely, secure, or error-free</li>
            <li>Analysis results will be accurate or reliable</li>
            <li>Following our recommendations will result in successful ad performance</li>
          </ul>

          <h2 className="text-xl font-semibold text-zinc-100 mt-8 mb-4">7. Limitation of Liability</h2>
          <p className="text-zinc-300 mb-4">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, DMCSITE LLC AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM:
          </p>
          <ul className="list-disc pl-6 text-zinc-300 space-y-2 mb-4">
            <li>Your use or inability to use the service</li>
            <li>Any unauthorized access to or use of our servers or any personal information stored therein</li>
            <li>Any interruption or cessation of transmission to or from the service</li>
            <li>Any bugs, viruses, or similar issues transmitted through the service</li>
            <li>Any errors or omissions in any content or analysis</li>
            <li>Ad performance or business outcomes based on our recommendations</li>
          </ul>
          <p className="text-zinc-300 mb-4">
            IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
          </p>

          <h2 className="text-xl font-semibold text-zinc-100 mt-8 mb-4">8. Indemnification</h2>
          <p className="text-zinc-300 mb-4">
            You agree to indemnify and hold harmless DMCSITE LLC from any claims, damages, losses, liabilities, and expenses (including reasonable attorneys&apos; fees) arising from your use of the service, your violation of these Terms, or your violation of any rights of a third party.
          </p>

          <h2 className="text-xl font-semibold text-zinc-100 mt-8 mb-4">9. Third-Party Services</h2>
          <p className="text-zinc-300 mb-4">
            Our service integrates with third-party services (including Anthropic and OpenAI) to provide AI analysis capabilities. Your use of these integrated services is subject to their respective terms and privacy policies. We are not responsible for the actions or policies of third-party service providers.
          </p>

          <h2 className="text-xl font-semibold text-zinc-100 mt-8 mb-4">10. Modifications to Service and Terms</h2>
          <p className="text-zinc-300 mb-4">
            We reserve the right to modify, suspend, or discontinue the service at any time without notice. We may also update these Terms from time to time. Continued use of the service after changes constitutes acceptance of the modified Terms.
          </p>

          <h2 className="text-xl font-semibold text-zinc-100 mt-8 mb-4">11. Termination</h2>
          <p className="text-zinc-300 mb-4">
            We may terminate or suspend your account and access to the service immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties, or for any other reason at our sole discretion.
          </p>

          <h2 className="text-xl font-semibold text-zinc-100 mt-8 mb-4">12. Governing Law</h2>
          <p className="text-zinc-300 mb-4">
            These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of law provisions.
          </p>

          <h2 className="text-xl font-semibold text-zinc-100 mt-8 mb-4">13. Dispute Resolution</h2>
          <p className="text-zinc-300 mb-4">
            Any disputes arising from these Terms or your use of the service shall first be attempted to be resolved through good-faith negotiation. If negotiation fails, disputes shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.
          </p>

          <h2 className="text-xl font-semibold text-zinc-100 mt-8 mb-4">14. Severability</h2>
          <p className="text-zinc-300 mb-4">
            If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect.
          </p>

          <h2 className="text-xl font-semibold text-zinc-100 mt-8 mb-4">15. Contact Information</h2>
          <p className="text-zinc-300 mb-4">
            For questions about these Terms, please contact us at:
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
