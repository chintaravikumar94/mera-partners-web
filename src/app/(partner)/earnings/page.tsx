'use client'

import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { format } from 'date-fns'

interface Sale {
  id: string; name: string; service: string; serviceType: string
  commission: number; revenue: number; retailUnit: number; wholesaleUnit: number; createdAt?: Date
}
interface SvcAgg { name: string; type: string; sales: number; revenue: number; commission: number; retailUnit: number; wholesaleUnit: number }
interface SvcInfo { retail: number; wholesale: number; type: string }

const SVC_COLORS = ['#1565C0','#2E7D32','#E65100','#6A1B9A','#00838F','#C2185B','#455A64']
function svcColor(name: string) { return SVC_COLORS[Math.abs([...name].reduce((h,c)=>h*31+c.charCodeAt(0),0)) % SVC_COLORS.length] }
function money(v: number) { return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 }) }

export default function EarningsPage() {
  const { profile } = useAuth()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [serviceMap, setServiceMap] = useState<Record<string, SvcInfo>>({})
  const [svcLoaded, setSvcLoaded] = useState(false)

  useEffect(() => {
    getDocs(collection(db, 'services')).then(snap => {
      const map: Record<string, SvcInfo> = {}
      snap.docs.forEach(d => {
        const key = (d.data().name ?? '').toLowerCase().trim()
        if (key) map[key] = {
          retail: Number(d.data().retail_price ?? 0),
          wholesale: Number(d.data().wholesale_price ?? 0),
          type: d.data().service_type ?? 'sku',
        }
      })
      setServiceMap(map)
      setSvcLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (!profile?.uid || !svcLoaded) return
    const q = query(collection(db, 'customers'), where('partnerId', '==', profile.uid), where('status', '==', 'approved'))
    const unsub = onSnapshot(q, snap => {
      const list: Sale[] = snap.docs.map(d => {
        const data = d.data()
        const svcKey  = (data.service ?? '').toLowerCase().trim()
        const svc     = serviceMap[svcKey]
        const svcType = (svc?.type ?? data.service_type ?? 'sku').toString()
        const price   = Number(data.price ?? 0)
        const projVal = Number(data.project_value ?? 0)
        const revenue = svcType === 'commission' && projVal > 0 ? projVal : price
        let commission: number, retailUnit = 0, wholesaleUnit = 0
        if (svcType === 'sku') {
          retailUnit    = svc?.retail ?? price
          wholesaleUnit = svc?.wholesale ?? 0
          commission    = Math.max(0, retailUnit - wholesaleUnit)
        } else {
          commission    = Number(data.commission ?? 0)
          retailUnit    = Number(data.commission_per_unit ?? data.commission_value ?? 0)
          wholesaleUnit = 0
        }
        return {
          id: d.id, name: data.name ?? '', service: data.service ?? '',
          serviceType: svcType, commission, revenue, retailUnit, wholesaleUnit,
          createdAt: (data.created_at as Timestamp)?.toDate(),
        }
      })
      list.sort((a,b)=>(b.createdAt?.getTime()??0)-(a.createdAt?.getTime()??0))
      setSales(list)
      setLoading(false)
    })
    return unsub
  }, [profile?.uid, svcLoaded, serviceMap])

  const now = new Date()
  const som = new Date(now.getFullYear(), now.getMonth(), 1)
  const sow = new Date(); sow.setDate(sow.getDate() - (sow.getDay() || 7) + 1); sow.setHours(0,0,0,0)
  const sod = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const totalComm   = sales.reduce((s,x)=>s+x.commission,0)
  const totalRev    = sales.reduce((s,x)=>s+x.revenue,0)
  const todayComm   = sales.filter(s=>s.createdAt&&s.createdAt>=sod).reduce((s,x)=>s+x.commission,0)
  const weekComm    = sales.filter(s=>s.createdAt&&s.createdAt>=sow).reduce((s,x)=>s+x.commission,0)
  const monthComm   = sales.filter(s=>s.createdAt&&s.createdAt>=som).reduce((s,x)=>s+x.commission,0)

  const byService: Record<string, SvcAgg> = {}
  sales.forEach(s => {
    if (!byService[s.service]) byService[s.service] = { name:s.service, type:s.serviceType, sales:0, revenue:0, commission:0, retailUnit:s.retailUnit, wholesaleUnit:s.wholesaleUnit }
    byService[s.service].sales++
    byService[s.service].revenue    += s.revenue
    byService[s.service].commission += s.commission
  })
  const services = Object.values(byService).sort((a,b)=>b.commission-a.commission)
  const maxComm  = services[0]?.commission || 1

  const typeLabel = (t: string) => {
    if (t==='sku') return 'Retail − Wholesale = Profit/sale'
    if (t==='per_unit') return 'Commission per unit'
    if (t==='commission') return 'Commission per deal'
    return 'Commission per project'
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-8">
      <div>
        <h1 className="text-xl font-bold text-brand-text">My Earnings</h1>
        <p className="text-brand-sub text-sm mt-1">Commission from all approved customers</p>
      </div>

      {/* Hero card */}
      <div className="rounded-2xl p-6 text-white" style={{ background:'linear-gradient(135deg,#1565C0,#42A5F5)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z"/>
            </svg>
          </div>
          <p className="text-white/80 text-xs font-bold uppercase tracking-wider">Lifetime Earnings</p>
        </div>
        {loading
          ? <div className="h-10 w-36 bg-white/20 rounded-xl animate-pulse mb-1"/>
          : <p className="text-4xl font-bold mb-1">{money(totalComm)}</p>
        }
        <p className="text-white/70 text-xs">Total commission across {sales.length} approved sales</p>
        <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-4">
          <div>
            <p className="text-white/60 text-xs">Customers</p>
            <p className="font-bold text-lg mt-0.5">{sales.length}</p>
          </div>
          <div>
            <p className="text-white/60 text-xs">Revenue Collected</p>
            <p className="font-bold text-lg mt-0.5">{money(totalRev)}</p>
          </div>
        </div>
      </div>

      {/* Today / Week / Month */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label:'Today',      value:todayComm, color:'#7B1FA2' },
          { label:'This Week',  value:weekComm,  color:'#E65100' },
          { label:'This Month', value:monthComm, color:'#2E7D32' },
        ].map(s=>(
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-brand-border shadow-card">
            <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2"
              style={{ backgroundColor:s.color+'18', border:`1px solid ${s.color}33` }}>
              <svg width="14" height="14" fill="none" stroke={s.color} strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <p className="text-brand-sub text-[10px] font-semibold uppercase tracking-wide">{s.label}</p>
            <p className="font-bold text-brand-text text-base mt-0.5">{loading ? '…' : money(s.value)}</p>
          </div>
        ))}
      </div>

      {/* Service Breakdown */}
      {services.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-brand-text text-sm">Service Breakdown</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-surf text-brand-blue">{services.length} services</span>
          </div>
          <div className="space-y-3">
            {services.map(s => {
              const color = svcColor(s.name)
              const ratio = Math.max(0.02, s.commission / maxComm)
              return (
                <div key={s.name} className="bg-white rounded-2xl p-4 border border-brand-border shadow-card">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                      style={{ background:`radial-gradient(circle,${color}40,${color}18)`, border:`1px solid ${color}40` }}>
                      <svg width="14" height="14" fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/>
                      </svg>
                    </div>
                    <p className="flex-1 font-bold text-brand-text text-sm truncate">{s.name}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor:color+'18', color }}>{s.sales} sale{s.sales===1?'':'s'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                    {[
                      { label:'Revenue',    value:money(s.revenue),    col:'#6B7280' },
                      { label:'Commission', value:money(s.commission), col:'#2E7D32' },
                      { label:'Per Unit',   value:money(s.retailUnit-s.wholesaleUnit), col:color },
                    ].map(m=>(
                      <div key={m.label}>
                        <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color:m.col }}>{m.label}</p>
                        <p className="font-bold text-brand-text text-sm">{m.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="h-1.5 bg-brand-bg rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width:`${ratio*100}%`, background:`linear-gradient(90deg,${color}90,${color})` }}/>
                  </div>
                  <p className="text-brand-sub text-[10px] mt-1">{typeLabel(s.type)}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* How you earn */}
      <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <svg width="16" height="16" fill="none" stroke="#1565C0" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <p className="font-bold text-brand-text text-sm">How you earn</p>
        </div>
        <div className="space-y-2">
          {[
            'Add a customer for any service.',
            'Once admin approves the sale, your commission moves to Lifetime Earnings.',
            'Commission = Retail − Wholesale (set on each service).',
            'Higher value services pay better — focus there for fastest growth.',
          ].map((text, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-brand-surf flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-brand-blue text-[10px] font-bold">{i+1}</span>
              </div>
              <p className="text-brand-text text-xs leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent sales */}
      <div>
        <h2 className="font-bold text-brand-text text-sm mb-3">Recent Approved Sales</h2>
        {loading
          ? <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-16 bg-white rounded-2xl border border-brand-border animate-pulse"/>)}</div>
          : sales.length===0
            ? <div className="bg-white rounded-2xl p-8 border border-brand-border text-center text-brand-sub text-sm">No approved sales yet. Keep adding customers!</div>
            : <div className="space-y-2">
                {sales.slice(0,20).map(s=>(
                  <div key={s.id} className="bg-white rounded-2xl px-4 py-3 border border-brand-border flex items-center gap-3 shadow-card">
                    <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                      <svg width="16" height="16" fill="none" stroke="#16a34a" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-brand-text text-sm truncate">{s.name}</p>
                      <p className="text-brand-sub text-xs">{s.service}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-green-600 text-sm">+{money(s.commission)}</p>
                      {s.createdAt&&<p className="text-[10px] text-brand-sub">{format(s.createdAt,'d MMM yyyy')}</p>}
                    </div>
                  </div>
                ))}
              </div>
        }
      </div>
    </div>
  )
}
