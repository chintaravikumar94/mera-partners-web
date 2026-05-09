'use client'

import { useEffect, useState, useRef } from 'react'
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

/* ── Types ─────────────────────────────────────────── */
interface Banner   { id: string; imageUrl: string; type?: string; targetUrl?: string; phone?: string }
interface InfoItem { id: string; text: string; bgColor: string; textColor: string; targetScreen?: string; startDate?: Date; endDate?: Date }
interface Service  { id: string; name: string; category: string; image_url: string; service_type: string }

const CAT_PALETTE = ['#1565C0','#00838F','#6A1B9A','#E65100','#00A86B','#F9A825','#AD1457','#4527A0','#2E7D32','#C62828']
function catColor(cat: string) {
  return CAT_PALETTE[Math.abs([...cat].reduce((h,c)=>h*31+c.charCodeAt(0),0)) % CAT_PALETTE.length]
}
function svcTypeLabel(t: string) {
  if (t==='sku') return 'SKU Based'; if (t==='per_unit') return 'Per Unit'
  if (t==='commission') return 'Commission'; if (t==='per_project') return 'Per Project'; return t
}

/* ── Component ─────────────────────────────────────── */
export default function HomePage() {
  const { profile } = useAuth()
  const [banners,   setBanners]   = useState<Banner[]>([])
  const [infoItems, setInfoItems] = useState<InfoItem[]>([])
  const [services,  setServices]  = useState<Service[]>([])
  const [bannerIdx, setBannerIdx] = useState(0)
  const [infoIdx,   setInfoIdx]   = useState(0)
  const bannerRef = useRef<ReturnType<typeof setInterval>>()
  const infoRef   = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    const now = new Date()
    Promise.all([
      getDocs(query(collection(db, 'banners'), where('isActive', '==', true))).catch(()=>null),
      getDocs(collection(db, 'info_strip')).catch(()=>null),
      getDocs(query(collection(db, 'services'), where('is_active', '==', true))).catch(()=>null),
    ]).then(([bSnap, iSnap, sSnap]) => {
      if (bSnap) setBanners(bSnap.docs.map(d=>({
        id:d.id, imageUrl:d.data().imageUrl??d.data().image_url??'',
        type:d.data().type, targetUrl:d.data().target_url??d.data().targetUrl, phone:d.data().phone,
      })).filter(b=>b.imageUrl))

      if (iSnap) setInfoItems(iSnap.docs.map(d=>({
        id:d.id, text:d.data().text??'', bgColor:d.data().bgColor??d.data().bg_color??'#1565C0',
        textColor:d.data().textColor??d.data().text_color??'#ffffff',
        targetScreen:d.data().target_screen,
        startDate: d.data().start_date?(d.data().start_date as Timestamp).toDate():undefined,
        endDate:   d.data().end_date  ?(d.data().end_date   as Timestamp).toDate():undefined,
      })).filter(i=>{
        if (!i.text) return false
        if (i.targetScreen && i.targetScreen!=='home') return false
        if (i.startDate && now<i.startDate) return false
        if (i.endDate && now>i.endDate) return false
        return true
      }))

      if (sSnap) {
        const list: Service[] = sSnap.docs.map(d=>({
          id:d.id, name:d.data().name??'', category:d.data().category??'Other',
          image_url:d.data().images?.[0]||d.data().image_url||'', service_type:d.data().service_type??'',
        }))
        list.sort((a,b)=>a.name.localeCompare(b.name))
        setServices(list)
      }
    })
  }, [])

  /* auto-slide */
  useEffect(() => {
    bannerRef.current = setInterval(()=>{ if(banners.length>1) setBannerIdx(i=>(i+1)%banners.length) },3000)
    infoRef.current   = setInterval(()=>{ if(infoItems.length>1) setInfoIdx(i=>(i+1)%infoItems.length) },4000)
    return ()=>{ clearInterval(bannerRef.current); clearInterval(infoRef.current) }
  }, [banners.length, infoItems.length])

  const hour = new Date().getHours()
  const greeting = hour<12?'Good Morning':hour<17?'Good Afternoon':'Good Evening'

  /* group services */
  const grouped: Record<string,Service[]> = {}
  services.forEach(s=>{ const c=s.category||'Other'; (grouped[c]=grouped[c]??[]).push(s) })

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">

      {/* Info Strip */}
      {infoItems.length>0 && (
        <div className="rounded-xl px-4 py-2.5 text-center text-sm font-semibold"
          style={{ backgroundColor:infoItems[infoIdx]?.bgColor, color:infoItems[infoIdx]?.textColor }}>
          📢 {infoItems[infoIdx]?.text}
        </div>
      )}

      {/* Welcome */}
      <div className="rounded-2xl p-5 text-white relative overflow-hidden"
        style={{ background:'linear-gradient(135deg,#1565C0,#0D47A1)' }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage:'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }}/>
        <p className="text-white/70 text-sm">{greeting},</p>
        <h1 className="text-2xl font-bold mt-0.5">{profile?.name||'Partner'} 👋</h1>
        <p className="text-white/60 text-xs mt-1">{profile?.email}</p>
      </div>

      {/* Banner carousel */}
      {banners.length>0 && (
        <div className="relative rounded-2xl overflow-hidden bg-brand-bg" style={{ height:160 }}>
          {banners.map((b,i)=>(
            <div key={b.id} className="absolute inset-0 transition-opacity duration-500" style={{ opacity:i===bannerIdx?1:0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.imageUrl} alt="" className="w-full h-full object-cover cursor-pointer"
                onClick={()=>{
                  if (b.type==='url'&&b.targetUrl) window.open(b.targetUrl,'_blank')
                  if (b.type==='whatsapp'&&b.phone) window.open(`https://wa.me/${b.phone}`,'_blank')
                  if (b.type==='call'&&b.phone) window.open(`tel:${b.phone}`)
                }}/>
            </div>
          ))}
          {banners.length>1&&(
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
              {banners.map((_,i)=>(
                <button key={i} onClick={()=>setBannerIdx(i)}
                  className={`rounded-full transition-all ${i===bannerIdx?'w-4 h-2 bg-white':'w-2 h-2 bg-white/50'}`}/>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dashboard Quick Actions */}
      <section>
        <SectionLabel label="Dashboard" />
        <div className="grid grid-cols-4 gap-3 mt-3">
          <QuickCard href="/add-customer" label="Add Customer" color="#1565C0"
            icon={<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="17" y1="11" x2="23" y2="11"/></svg>}/>
          <QuickCard href="/customers" label="Customers" color="#00838F"
            icon={<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}/>
          <QuickCard href="/sales" label="My Sales" color="#6A1B9A"
            icon={<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}/>
          <QuickCard href="/earnings" label="Earnings" color="#E65100"
            icon={<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}/>
        </div>
      </section>

      {/* Our Services */}
      {services.length>0&&(
        <section>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-1 h-5 rounded-sm bg-brand-blue"/>
            <h2 className="text-brand-text font-bold text-base">Our Services</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-surf text-brand-blue border border-brand-blue/20">{services.length} services</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ backgroundColor:'#00A86B18',color:'#00A86B',borderColor:'#00A86B40' }}>{Object.keys(grouped).length} categories</span>
          </div>
          <div className="space-y-5 mt-3">
            {Object.entries(grouped).map(([cat,items])=>{
              const color = catColor(cat)
              return (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ backgroundColor:color }}>{cat[0]?.toUpperCase()}</div>
                    <span className="text-sm font-bold" style={{ color }}>{cat}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor:color+'18',color }}>{items.length}</span>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth:'none' }}>
                    {items.map(s=>(
                      <Link key={s.id} href={`/services/${s.id}`}
                        className="shrink-0 w-24 bg-white rounded-2xl border border-brand-border shadow-card overflow-hidden hover:shadow-md transition-shadow">
                        <div className="w-full h-14" style={{ backgroundColor:color+'15' }}>
                          {s.image_url
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={s.image_url} alt={s.name} className="w-full h-full object-cover"/>
                            : <div className="w-full h-full flex items-center justify-center text-2xl font-bold opacity-30" style={{ color }}>{s.name[0]}</div>
                          }
                        </div>
                        <div className="p-1.5">
                          <p className="text-brand-text text-[10px] font-bold leading-tight line-clamp-2">{s.name}</p>
                          {s.service_type&&<p className="text-[9px] mt-0.5 font-medium" style={{ color }}>{svcTypeLabel(s.service_type)}</p>}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Growth */}
      <section>
        <SectionLabel label="Growth" />
        <div className="grid grid-cols-4 gap-3 mt-3">
          <QuickCard href="/marketing" label="Marketing" color="#00A86B"
            icon={<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>}/>
          <QuickCard href="/training" label="Training" color="#E65100"
            icon={<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>}/>
          <QuickCard href="/support" label="Support" color="#2979FF"
            icon={<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}/>
          <QuickCard href="/referral" label="Referral" color="#AD1457"
            icon={<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>}/>
        </div>
      </section>

      {/* Contact Us */}
      <section>
        <SectionLabel label="Contact Us" />
        <div className="grid grid-cols-4 gap-3 mt-3">
          <a href="https://wa.me/919949499177" target="_blank" rel="noreferrer">
            <QuickBox label="WhatsApp" color="#25D366"
              icon={<svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>}/>
          </a>
          <a href="tel:919949499177">
            <QuickBox label="Call Us" color="#1565C0"
              icon={<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.09 6.09l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.6 16.92z"/></svg>}/>
          </a>
          <a href="https://merapartners.com" target="_blank" rel="noreferrer">
            <QuickBox label="Website" color="#6A1B9A"
              icon={<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>}/>
          </a>
          <a href="https://instagram.com" target="_blank" rel="noreferrer">
            <QuickBox label="Instagram" color="#E1306C"
              icon={<svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>}/>
          </a>
        </div>
      </section>
    </div>
  )
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-1 h-4 rounded-sm bg-brand-blue"/>
      <h2 className="text-brand-text font-bold text-sm">{label}</h2>
    </div>
  )
}

function QuickCard({ href, label, color, icon }: { href: string; label: string; color: string; icon: React.ReactNode }) {
  return (
    <Link href={href}
      className="bg-white rounded-2xl border border-brand-border shadow-card p-3 flex flex-col items-center gap-2 hover:shadow-md transition-shadow">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: color+'18', color }}>
        {icon}
      </div>
      <p className="text-brand-text text-[11px] font-semibold text-center leading-tight">{label}</p>
    </Link>
  )
}

function QuickBox({ label, color, icon }: { label: string; color: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-brand-border shadow-card p-3 flex flex-col items-center gap-2 hover:shadow-md transition-shadow cursor-pointer">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: color+'18', color }}>
        {icon}
      </div>
      <p className="text-brand-text text-[11px] font-semibold text-center leading-tight">{label}</p>
    </div>
  )
}
