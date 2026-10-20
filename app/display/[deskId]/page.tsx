'use client'

import { useState, useEffect, use } from 'react'
import { QrCode, RefreshCw, Sparkles, ExternalLink } from 'lucide-react'

export default function VirtualDeskDisplayPage({ params }: { params: Promise<{ deskId: string }> }) {
  const { deskId } = use(params)
  const normalizedId = deskId.toUpperCase()

  const [qrData, setQrData] = useState<{ dataUrl: string; url: string; token: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [secondsLeft, setSecondsLeft] = useState(60)

  const fetchQr = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/qr?deskId=${encodeURIComponent(normalizedId)}`)
      const data = await res.json()
      if (data.success) {
        setQrData(data)
        setSecondsLeft(60)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQr()
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          fetchQr()
          return 60
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [normalizedId])

  return (
    <div className="min-h-screen bg-[#0F0F17] text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-[#181824] border border-[#2A2A3C] rounded-[24px] p-8 shadow-2xl flex flex-col items-center text-center space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between w-full border-b border-[#2A2A3C] pb-4">
          <div className="text-left">
            <span className="text-[10px] font-mono tracking-widest text-[#94A3B8] uppercase block">Virtual Hardware Screen</span>
            <h1 className="text-2xl font-bold font-mono text-white tracking-tight">Study Node {normalizedId}</h1>
          </div>
          <div className="px-3 py-1 bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
            <span className="text-[11px] font-mono font-bold text-[#22C55E]">Active Feed</span>
          </div>
        </div>

        {/* QR Code Container */}
        <div className="relative p-4 bg-white rounded-[20px] shadow-lg flex items-center justify-center min-h-[260px] min-w-[260px]">
          {loading && !qrData ? (
            <RefreshCw className="w-10 h-10 text-[#FF6B1A] animate-spin" />
          ) : qrData ? (
            <img src={qrData.dataUrl} alt={`QR for ${normalizedId}`} className="w-[240px] h-[240px] object-contain rounded-[12px]" />
          ) : (
            <p className="text-xs text-red-500 font-mono">Failed to load QR token</p>
          )}
        </div>

        {/* Rotation Countdown */}
        <div className="w-full space-y-2">
          <div className="flex justify-between text-xs font-mono text-[#94A3B8]">
            <span>HMAC-SHA256 Rotation</span>
            <span className="text-[#FF6B1A] font-bold">{secondsLeft}s left</span>
          </div>
          <div className="w-full bg-[#252538] h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#FF6B1A] h-full transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${(secondsLeft / 60) * 100}%` }}
            />
          </div>
        </div>

        {/* Simulation / Direct Scan Option */}
        <div className="pt-2 w-full space-y-2">
          <p className="text-[11px] text-[#94A3B8]">
            Scan with your phone camera, or click below to simulate scanning on this device:
          </p>
          {qrData && (
            <a
              href={qrData.url}
              className="w-full h-11 bg-[#FF6B1A] hover:bg-[#FF6B1A]/90 text-white rounded-[12px] font-mono font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <ExternalLink className="w-4 h-4" /> Simulate Scan In Browser
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
