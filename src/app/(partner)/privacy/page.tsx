'use client'

import { useRouter } from 'next/navigation'

const SECTIONS = [
  { icon: '📊', title: 'Data We Collect', body: 'We collect your name, mobile number, email address, and profile photo when you register. We also collect data about your activity on the platform such as customers added, services used, and training completed.' },
  { icon: '🎯', title: 'How We Use Your Data', body: 'Your data is used to provide and improve our services, calculate your earnings, send important notifications, and verify your identity. We do not sell your data to third parties.' },
  { icon: '🔒', title: 'Data Security', body: 'All data is stored securely on Firebase (Google Cloud). We use industry-standard encryption for data in transit and at rest. Only authorized personnel can access your information.' },
  { icon: '📱', title: 'Notifications', body: 'We may send push notifications for important updates like customer approvals, payment confirmations, and new service additions. You can manage notification preferences in your device settings.' },
  { icon: '🍪', title: 'Cookies & Local Storage', body: 'We use browser local storage to maintain your session and remember your preferences. No tracking cookies are used for advertising purposes.' },
  { icon: '👤', title: 'Your Rights', body: 'You have the right to access, update, or delete your personal information. Contact our support team to request data deletion or export. Account deletion removes all your personal data within 30 days.' },
  { icon: '📞', title: 'Contact Us', body: 'For any privacy concerns or data requests, contact our support team through the Support page in the app. We respond to all privacy inquiries within 48 hours.' },
]

export default function PrivacyPage() {
  const router = useRouter()
  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-brand-surf flex items-center justify-center text-brand-blue hover:bg-blue-100">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h1 className="text-xl font-bold text-brand-text">Privacy Policy</h1>
      </div>

      <div className="rounded-2xl p-5 text-white"
        style={{ background: 'linear-gradient(135deg, #1565C0, #0D47A1)' }}>
        <p className="text-2xl mb-2">🔒</p>
        <p className="font-bold text-lg">Your Privacy Matters</p>
        <p className="text-white/70 text-sm mt-1">Last updated: May 2026 · We take privacy seriously</p>
      </div>

      <div className="space-y-3">
        {SECTIONS.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-brand-border shadow-card">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{s.icon}</span>
              <div>
                <p className="font-bold text-brand-text text-sm mb-1">{s.title}</p>
                <p className="text-brand-sub text-sm leading-relaxed">{s.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
