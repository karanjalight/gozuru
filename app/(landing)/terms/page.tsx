import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Mail } from "lucide-react";
import { Navbar } from "../components/Navbar";

export const metadata: Metadata = {
  title: "Terms and Conditions – Gozuru",
  description:
    "Read the Gozuru terms and conditions for travelers, hosts, affiliates, bookings, payments, and platform use.",
};

const lastUpdated = "18 June 2026";

const sections = [
  {
    title: "1. Introduction",
    paragraphs: [
      "Welcome to Gozuru. These Terms and Conditions (“Terms”) govern your access to and use of the Gozuru website, mobile experiences, and related services (collectively, the “Platform”).",
      "By creating an account, booking an experience, listing as a host, joining the affiliate program, or otherwise using Gozuru, you agree to these Terms. If you do not agree, please do not use the Platform.",
      "Gozuru connects curious travelers with local experts, hosts, and experience providers. We facilitate discovery, booking, communication, and payments—but hosts remain responsible for delivering the experiences they offer unless we state otherwise in writing.",
    ],
  },
  {
    title: "2. Who may use Gozuru",
    paragraphs: [
      "You must be at least 18 years old and able to enter a binding contract to use the Platform.",
      "You agree to provide accurate registration information, keep your login credentials secure, and notify us promptly if you suspect unauthorized access to your account.",
      "You may use Gozuru as a traveler (“Client”), experience host (“Host”), affiliate partner (“Affiliate”), or a combination of these roles, subject to the rules that apply to each role.",
    ],
  },
  {
    title: "3. Accounts and roles",
    paragraphs: [
      "Clients may browse experiences, book sessions, manage their profile, communicate with hosts, and view payment history through their account dashboard.",
      "Hosts may create and manage experience listings, set availability, respond to booking requests, and receive payments for confirmed bookings in accordance with our host policies.",
      "Affiliates may share referral links, track referred users, and earn commissions on qualifying paid bookings made by people they refer, as described in Section 8.",
      "We may suspend or terminate accounts that violate these Terms, misrepresent identity, abuse the Platform, or create safety or legal risk for other users.",
    ],
  },
  {
    title: "4. Bookings and experiences",
    paragraphs: [
      "When you request or confirm a booking, you enter into a direct arrangement with the host for the experience described in the listing. Gozuru provides the technology to discover, request, pay for, and manage that booking.",
      "Experience descriptions, pricing, meeting points, duration, capacity, and availability are set by hosts and may change. Always review the listing details carefully before booking.",
      "Hosts are expected to deliver experiences professionally, safely, and in line with their published description. Clients are expected to arrive on time, follow reasonable host instructions, and treat hosts and other guests respectfully.",
      "Gozuru may facilitate booking status updates, messaging, and notifications, but we do not guarantee that every experience will meet a specific personal expectation beyond what is stated in the listing.",
    ],
  },
  {
    title: "5. Payments, pricing, and fees",
    paragraphs: [
      "Prices are displayed in Kenyan Shillings (KES) unless otherwise stated. The total payable amount for a booking is shown at checkout before payment is completed.",
      "Payments are processed through approved third-party payment providers such as Paystack. By completing a payment, you authorize us and our payment partners to charge the selected payment method for the confirmed amount.",
      "A booking is considered financially confirmed only after successful payment verification. Host payouts, platform fees, taxes, and any applicable charges may be handled according to our internal payment and payout policies.",
      "You are responsible for any bank charges, mobile money fees, currency conversion costs, or other payment-provider charges imposed by your financial institution or payment method.",
    ],
  },
  {
    title: "6. Cancellations, changes, and refunds",
    paragraphs: [
      "Cancellation and rescheduling rules may vary by experience and host. Where a cancellation policy is shown on a listing or booking confirmation, that policy applies to the booking in question.",
      "If a host cancels or fails to deliver an experience, we may assist with rebooking, credit, or refund decisions in line with our support processes and the circumstances of the case.",
      "If a client cancels late, does not attend, or breaches reasonable participation requirements, refunds may be limited or unavailable.",
      "Refund requests are reviewed based on booking status, payment records, host input, and applicable policy. Gozuru’s decision in dispute resolution is intended to be fair and consistent, but does not create an obligation to issue a refund in every complaint.",
    ],
  },
  {
    title: "7. Host responsibilities",
    paragraphs: [
      "Hosts must provide accurate listings, maintain valid availability, honor confirmed bookings, and comply with applicable local laws, licensing requirements, tax obligations, and safety standards.",
      "Hosts must not discriminate unlawfully, mislead clients, request off-platform payments to avoid fees, or expose clients to unsafe, illegal, or inappropriate conduct.",
      "Hosts retain responsibility for the quality, legality, and delivery of their experiences. Gozuru may remove listings or restrict host access where standards are not met.",
    ],
  },
  {
    title: "8. Affiliate program",
    paragraphs: [
      "Users may optionally join the Gozuru affiliate program to share referral links and earn commissions on qualifying paid bookings completed by referred users.",
      "Unless otherwise stated on the Platform, affiliate commissions are calculated as 5% of the full paid booking transaction amount for eligible completed payments attributed to your referral.",
      "Referral attribution depends on valid referral links or codes, successful account creation, and qualifying booking activity. Self-referrals, fraudulent traffic, and misleading promotion are prohibited.",
      "Affiliate earnings may remain pending until bookings are confirmed and payments successfully settle. Cash-out requests are subject to review, minimum balances, payout method verification, and processing timelines.",
      "Gozuru may withhold, adjust, or cancel affiliate commissions in cases of fraud, chargebacks, cancelled bookings, policy violations, or technical errors.",
    ],
  },
  {
    title: "9. Acceptable use",
    paragraphs: [
      "You agree not to misuse the Platform. Prohibited conduct includes fraud, harassment, hate speech, impersonation, scraping or automated abuse, interference with platform security, posting unlawful content, or attempting to circumvent booking or payment systems.",
      "You may not use Gozuru to promote illegal services, exploit minors, distribute malware, send spam, or collect user data without consent.",
      "We may investigate suspected violations and cooperate with law enforcement where required.",
    ],
  },
  {
    title: "10. Content and intellectual property",
    paragraphs: [
      "You retain ownership of content you submit, including profile details, listings, photos, reviews, and messages. You grant Gozuru a non-exclusive, worldwide, royalty-free license to host, display, reproduce, and distribute that content as needed to operate the Platform.",
      "Gozuru names, logos, product design, software, and branding remain our intellectual property. You may not copy or use them without written permission.",
      "If you believe content on Gozuru infringes your rights, contact us with sufficient detail for review.",
    ],
  },
  {
    title: "11. Privacy",
    paragraphs: [
      "Your use of Gozuru is also governed by our privacy practices. We collect and process personal information such as name, email, phone number, booking history, payment references, and referral activity to provide and improve the Platform.",
      "We use reputable infrastructure and service providers for authentication, database storage, email delivery, and payments. You should only share personal information through trusted platform channels.",
      "For privacy-related questions, contact us using the details in Section 15.",
    ],
  },
  {
    title: "12. Disclaimers",
    paragraphs: [
      "Gozuru is provided on an “as is” and “as available” basis. We do not guarantee uninterrupted access, error-free operation, or that every experience will perfectly match personal preferences.",
      "We are not a travel agency, insurer, employer of hosts, or guarantor of third-party conduct. To the fullest extent permitted by law, we disclaim warranties not expressly stated in these Terms.",
      "You use experiences and interact with hosts and other users at your own judgment and risk.",
    ],
  },
  {
    title: "13. Limitation of liability",
    paragraphs: [
      "To the maximum extent permitted by applicable law, Gozuru and its founders, employees, contractors, and partners will not be liable for indirect, incidental, special, consequential, or punitive damages, or for loss of profits, data, goodwill, or business opportunity arising from your use of the Platform.",
      "Where liability cannot be excluded, our total liability for any claim relating to the Platform will be limited to the greater of the amount you paid to Gozuru for the booking giving rise to the claim in the three months before the event, or KES 10,000, unless a higher amount is required by law.",
    ],
  },
  {
    title: "14. Changes to these Terms",
    paragraphs: [
      "We may update these Terms from time to time to reflect product changes, legal requirements, or business practices. When we do, we will revise the “Last updated” date at the top of this page.",
      "Material changes may also be communicated through the Platform or by email where appropriate. Continued use of Gozuru after updated Terms take effect constitutes acceptance of the revised Terms.",
    ],
  },
  {
    title: "15. Contact",
    paragraphs: [
      "If you have questions about these Terms, bookings, affiliate participation, or account access, contact us at hello@gozuru.com or through our contact page.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="bg-background text-foreground">
      <section className="relative isolate overflow-hidden bg-slate-950 text-white">
        <Navbar />
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1800&h=1000&fit=crop)",
          }}
        />
        {/* <div className="absolute inset-0 bg-gradient-to-br from-slate-300/90 via-slate-400/80 to-slate-300/95" /> */}
        <div className="relative mx-auto max-w-4xl px-4 pb-16 pt-32 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
            <FileText className="size-4" aria-hidden />
            Legal
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
            Terms and Conditions
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
            The rules for using Gozuru as a traveler, host, or affiliate partner.
          </p>
          <p className="mt-3 text-sm text-slate-400">Last updated: {lastUpdated}</p>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border bg-card p-6 shadow-sm sm:p-10">
            <p className="text-sm leading-7 text-muted-foreground">
              Please read these Terms carefully. They explain your rights and
              responsibilities when using Gozuru to discover experiences, book
              with experts, host sessions, or participate in our referral program.
            </p>

            <div className="mt-10 space-y-10">
              {sections.map((section) => (
                <section key={section.title}>
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">
                    {section.title}
                  </h2>
                  <div className="mt-4 space-y-4">
                    {section.paragraphs.map((paragraph) => (
                      <p
                        key={paragraph}
                        className="text-sm leading-7 text-muted-foreground sm:text-base"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-12 rounded-2xl border border-orange-200 bg-orange-50 p-5 dark:border-orange-500/20 dark:bg-orange-500/10">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 size-5 shrink-0 text-orange-500" />
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    Need help with these Terms?
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Reach our team at{" "}
                    <a
                      href="mailto:hello@gozuru.com"
                      className="font-medium text-orange-600 hover:text-orange-700"
                    >
                      hello@gozuru.com
                    </a>{" "}
                    or visit the{" "}
                    <Link href="/contact" className="font-medium text-orange-600 hover:text-orange-700">
                      contact page
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
