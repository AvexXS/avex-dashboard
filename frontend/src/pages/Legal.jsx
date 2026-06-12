import React from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const docs = {
  terms: {
    title: "Terms of Service",
    sections: [
      ["1. Acceptance", "By accessing or using Avex Cloud services, you agree to be bound by these Terms. If you don't agree, don't use the service."],
      ["2. Accounts", "You're responsible for your account credentials and any activity on it. One person per account. No automated signups."],
      ["3. Acceptable Use", "Don't use Avex for anything illegal, abusive, or to host malicious content. We reserve the right to suspend or terminate services that violate our Fair Use Policy."],
      ["4. Service Availability", "We target 99.9% uptime. Scheduled maintenance is announced in advance via the dashboard."],
      ["5. Modifications", "We may modify these Terms at any time. We'll notify you of material changes. Continued use means acceptance."],
      ["6. Liability", "Avex is provided as-is. Liability is capped at the amount paid in the last 3 months."],
      ["7. Termination", "You may close your account at any time from the dashboard. We may suspend accounts that violate these Terms."],
    ],
  },
  privacy: {
    title: "Privacy Policy",
    sections: [
      ["1. What we collect", "Email, name, encrypted password, payment metadata (not card numbers — held by Stripe). Server logs and IPs for abuse prevention."],
      ["2. How we use data", "To provide the service, process payments, prevent fraud, and respond to support requests."],
      ["3. Sharing", "We don't sell your data. We share minimal data with sub-processors: Stripe (payments), Brevo (email), and our hosting providers."],
      ["4. Your rights", "You can request export or deletion of your account data via support."],
      ["5. Cookies", "We use httpOnly cookies for authentication. We do not run third-party analytics or marketing trackers by default."],
      ["6. Contact", "Privacy questions: privacy@avex.click"],
    ],
  },
  "fair-use": {
    title: "Fair Use Policy",
    sections: [
      ["1. Spirit", "Free plans are for personal projects, learning, and small communities. Premium plans are for production workloads."],
      ["2. What's banned", "Cryptocurrency mining, proxy/VPN exit nodes, botnets, DDoS attacks, illegal content, mass spam, brute-forcing other services."],
      ["3. CPU caps", "Sustained 100% CPU on Free or Starter for >30 minutes may result in throttling. Performance and Enterprise have no such caps."],
      ["4. Bandwidth", "Free: 500 GB/mo. Premium plans have no metered cap but are subject to fair use."],
      ["5. Enforcement", "Warnings first. Repeated violations result in suspension."],
    ],
  },
  "payment-terms": {
    title: "Payment Terms",
    sections: [
      ["1. Billing cycle", "Monthly subscriptions renew automatically. One-time services (design, video edits) are charged upfront."],
      ["2. Payment methods", "Stripe (cards, Apple/Google Pay). Razorpay and PayPal coming soon via your admin's configuration."],
      ["3. Refunds", "Hosting is pro-rated on cancellation. Custom design and video work is non-refundable once work has commenced."],
      ["4. Failed payments", "If a renewal fails, we retry up to 3 times across 7 days. Services may be suspended thereafter."],
      ["5. Taxes", "Prices are exclusive of applicable taxes."],
      ["6. Invoices", "Every payment generates an invoice viewable in your dashboard."],
    ],
  },
};

export default function Legal() {
  const { doc } = useParams();
  const data = docs[doc] || docs.terms;

  return (
    <div className="min-h-screen bg-black text-white grain">
      <Navbar />
      <section className="pt-36 pb-24">
        <div className="max-w-3xl mx-auto px-6 md:px-12">
          <div className="text-xs uppercase tracking-[0.3em] text-white/40 mb-4">/ Legal</div>
          <h1 className="font-display text-5xl md:text-6xl font-light tracking-tighter">{data.title}</h1>
          <p className="mt-6 text-white/40 text-sm font-mono">Last updated: 12 Feb 2026</p>

          <div className="mt-16 space-y-12">
            {data.sections.map(([heading, body]) => (
              <div key={heading} data-testid={`legal-section-${heading.toLowerCase().replace(/\s+/g, '-')}`}>
                <h2 className="font-display text-xl uppercase tracking-widest text-white">{heading}</h2>
                <p className="mt-4 text-white/70 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 border-t border-white/10 pt-8 flex flex-wrap gap-4 text-sm">
            {Object.keys(docs).map((k) => (
              <Link key={k} to={`/legal/${k}`} className={`uppercase tracking-wider ${k === doc ? "text-white" : "text-white/40 hover:text-white"}`}>
                {docs[k].title}
              </Link>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
