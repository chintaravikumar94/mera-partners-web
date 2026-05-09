'use client'

import { useRouter } from 'next/navigation'

const TERMS = [
  {
    icon: '✅',
    title: 'Accurate Information',
    body: 'You agree to provide accurate, current, and complete information when registering and using the Mera Partners platform. Providing false information may result in account suspension.',
  },
  {
    icon: '💰',
    title: 'Earnings Policy',
    body: 'Earnings are calculated based on approved customer submissions. Commission and SKU units are credited only after admin verification and approval of each customer request.',
  },
  {
    icon: '🔐',
    title: 'Account Safety',
    body: 'You are responsible for maintaining the confidentiality of your account credentials. Do not share your login details with anyone. Report any unauthorized access immediately.',
  },
  {
    icon: '👁️',
    title: 'Monitoring & Compliance',
    body: 'Mera Partners reserves the right to monitor activity on the platform to ensure compliance with these terms. Violations may result in warnings, suspension, or permanent account termination.',
  },
  {
    icon: '📝',
    title: 'Policy Updates',
    body: 'These terms may be updated periodically. Continued use of the platform after changes constitutes acceptance of the updated terms. We will notify you of significant changes.',
  },
  {
    icon: '🤝',
    title: 'Fair Use',
    body: 'Partners must use the platform ethically and in good faith. Attempting to manipulate the referral system, earnings, or customer records is strictly prohibited.',
  },
]

export default function TermsPage() {
  const router = useRouter()
  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-brand-surf flex items-center justify-center text-brand-blue hover:bg-blue-100">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h1 className="text-xl font-bold text-brand-text">Terms & Conditions</h1>
      </div>

      {/* Header card */}
      <div className="rounded-2xl p-5 text-white"
        style={{ background: 'linear-gradient(135deg, #1565C0, #0D47A1)' }}>
        <p className="text-2xl mb-2">📋</p>
        <p className="font-bold text-lg">Platform Terms</p>
        <p className="text-white/70 text-sm mt-1">Last updated: May 2026 · Please read carefully</p>
      </div>

      {/* Terms list */}
      <div className="space-y-3">
        {TERMS.map((term, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-brand-border shadow-card">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{term.icon}</span>
              <div>
                <p className="font-bold text-brand-text text-sm mb-1">{term.title}</p>
                <p className="text-brand-sub text-sm leading-relaxed">{term.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-brand-surf rounded-2xl p-4 text-center">
        <p className="text-brand-blue text-xs font-medium">
          By using Mera Partners, you agree to all terms above. For questions, contact support.
        </p>
      </div>
    </div>
  )
}
