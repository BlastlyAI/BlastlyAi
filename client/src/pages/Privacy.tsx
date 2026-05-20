import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <img src="/manus-storage/blastly-icon-512_d2809e7c.png" alt="Blastly" className="h-12 w-12 rounded-xl object-cover cursor-pointer" />
              <span className="text-2xl font-black tracking-tight">Blastly</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="container max-w-3xl mx-auto py-12 px-4">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: April 2026</p>

        <div className="prose prose-slate max-w-none space-y-8 text-foreground">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed">When you use Blastly, we collect the following information:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground">
              <li><strong>Account information:</strong> Name, email address, and profile information provided during account setup</li>
              <li><strong>Business information:</strong> Website URL, social media handles, and business details you provide for audits and campaigns</li>
              <li><strong>Usage data:</strong> How you interact with the Service, features used, and performance metrics</li>
              <li><strong>Payment information:</strong> Billing details processed securely by Stripe (we do not store card numbers)</li>
              <li><strong>Content:</strong> Posts, campaigns, and other content you create using the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">We use the information we collect to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground">
              <li>Provide, operate, and improve the Service</li>
              <li>Generate AI-powered content, audits, and recommendations personalised to your business</li>
              <li>Process payments and manage your subscription</li>
              <li>Send service-related communications and updates</li>
              <li>Provide customer support</li>
              <li>Analyse usage patterns to improve our AI models and features</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Information Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">We do not sell your personal information. We may share your information with:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground">
              <li><strong>Service providers:</strong> Third-party vendors who help us operate the Service (e.g., Stripe for payments, cloud hosting providers)</li>
              <li><strong>Legal requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business transfers:</strong> In the event of a merger, acquisition, or sale of assets</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">We implement industry-standard security measures to protect your information, including encryption in transit and at rest, secure authentication, and regular security reviews. However, no method of transmission over the internet is 100% secure.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Cookies and Tracking</h2>
            <p className="text-muted-foreground leading-relaxed">We use cookies and similar technologies to maintain your session, remember your preferences, and analyse how the Service is used. You can control cookie settings through your browser, though disabling cookies may affect Service functionality.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your personal information</li>
              <li>Object to or restrict processing of your information</li>
              <li>Data portability — receive your data in a machine-readable format</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-2">To exercise these rights, please contact us at hello@blastly.ai.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">We retain your information for as long as your account is active or as needed to provide the Service. Upon account deletion, we will delete your personal data within 30 days, except where we are required to retain it for legal purposes.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">The Service is not directed at children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. International Transfers</h2>
            <p className="text-muted-foreground leading-relaxed">Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers in accordance with applicable data protection laws.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">We may update this Privacy Policy from time to time. We will notify you of significant changes via email or through the Service. Continued use of the Service after changes constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">If you have questions or concerns about this Privacy Policy, please contact us at <Link href="/contact" className="text-blue-600 hover:underline">our contact page</Link> or email hello@blastly.ai.</p>
          </section>
        </div>
      </div>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground mt-12">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/"><img src="/manus-storage/blastly-icon-512_d2809e7c.png" alt="Blastly" className="h-8 w-auto object-contain" /></Link>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
          <p>© 2026 Blastly. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
