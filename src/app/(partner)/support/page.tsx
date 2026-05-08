'use client'

import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface SupportConfig {
  whatsapp: string; phone: string; email: string; address: string; hours: string
}

export default function SupportPage() {
  const [config, setConfig] = useState<SupportConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDoc(doc(db, 'config', 'support')).then(snap => {
      if (snap.exists()) {
        const d = snap.data()
        setConfig({
          whatsapp: d.whatsapp ?? '',
          phone: d.phone ?? '',
          email: d.email ?? '',
          address: d.address ?? '',
          hours: d.hours ?? 'Mon–Sat, 9am–6pm',
        })
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const contacts = config ? [
    { label: 'WhatsApp', value: config.whatsapp, href: `https://wa.me/${config.whatsapp.replace(/\D/g,'')}`, icon: 'whatsapp', color: 'bg-green-50 border-green-200', btn: 'bg-green-500 hover:bg-green-600' },
    { label: 'Phone',    value: config.phone,    href: `tel:${config.phone}`,       icon: 'phone',    color: 'bg-brand-surf border-blue-200',  btn: 'bg-brand-blue hover:bg-brand-blueDark' },
    { label: 'Email',    value: config.email,    href: `mailto:${config.email}`,    icon: 'email',    color: 'bg-orange-50 border-orange-200', btn: 'bg-orange-500 hover:bg-orange-600' },
  ].filter(c => c.value) : []

  const faqs = [
    { q: 'How do I request SKU units?', a: 'Go to Request SKU from the sidebar, choose your plan, upload payment proof and submit. Admin will approve within 24 hours.' },
    { q: 'How do I add a customer?', a: 'Go to Add Customer, select the service, fill in the customer details and submit required documents.' },
    { q: 'When will I get my commission?', a: 'Commission is credited once your customer status is updated to Approved by the admin.' },
    { q: 'How does the referral program work?', a: 'Share your referral code with other partners. When they sign up and join, both of you earn SKU units as configured by admin.' },
    { q: 'How do I track my earnings?', a: 'Go to Earnings from the sidebar to see your total commission and breakdown by service.' },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Hero */}
      <div className="bg-brand-blue rounded-2xl p-6 text-white text-center">
        <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
          <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <h1 className="text-xl font-bold">We're Here to Help</h1>
        <p className="text-white/70 text-sm mt-1">Reach us through any channel below</p>
        {config?.hours && <p className="text-white/60 text-xs mt-2">🕐 {config.hours}</p>}
      </div>

      {/* Contact cards */}
      {loading
        ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-2xl border border-brand-border animate-pulse"/>)}</div>
        : contacts.length > 0
          ? <div className="space-y-3">
              {contacts.map(c => (
                <div key={c.label} className={`rounded-2xl p-4 border ${c.color} flex items-center gap-4`}>
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                    {c.icon === 'whatsapp'
                      ? <svg width="22" height="22" fill="#25D366" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                      : c.icon === 'phone'
                      ? <svg width="22" height="22" fill="none" stroke="#1565C0" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.08 6.08l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.6 16.92z"/></svg>
                      : <svg width="22" height="22" fill="none" stroke="#F97316" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    }
                  </div>
                  <div className="flex-1">
                    <p className="text-brand-sub text-xs font-semibold">{c.label}</p>
                    <p className="text-brand-text font-semibold text-sm">{c.value}</p>
                  </div>
                  <a href={c.href} target={c.icon !== 'phone' ? '_blank' : undefined} rel="noreferrer"
                    className={`px-3 py-2 rounded-xl text-white text-xs font-bold transition-colors ${c.btn}`}>
                    {c.icon === 'whatsapp' ? 'Chat' : c.icon === 'phone' ? 'Call' : 'Email'}
                  </a>
                </div>
              ))}
              {config?.address && (
                <div className="bg-white rounded-2xl p-4 border border-brand-border flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-surf flex items-center justify-center shrink-0">
                    <svg width="18" height="18" fill="none" stroke="#1565C0" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  </div>
                  <div>
                    <p className="text-brand-sub text-xs font-semibold">Address</p>
                    <p className="text-brand-text text-sm">{config.address}</p>
                  </div>
                </div>
              )}
            </div>
          : <div className="bg-white rounded-2xl p-8 border border-brand-border text-center text-brand-sub text-sm">
              Contact info not configured yet.
            </div>
      }

      {/* FAQ */}
      <div className="bg-white rounded-2xl border border-brand-border overflow-hidden shadow-card">
        <div className="px-5 py-4 border-b border-brand-border">
          <h2 className="font-bold text-brand-text">Frequently Asked Questions</h2>
        </div>
        <div className="divide-y divide-brand-border">
          {faqs.map((faq, i) => (
            <details key={i} className="group px-5 py-4">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <p className="font-medium text-brand-text text-sm">{faq.q}</p>
                <svg className="w-4 h-4 text-brand-sub shrink-0 ml-2 group-open:rotate-180 transition-transform"
                  fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </summary>
              <p className="text-brand-sub text-sm mt-2 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}
