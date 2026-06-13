'use client'

import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, AlertTriangle, Info, X, Zap } from 'lucide-react'
import { useToast } from '@/components/providers/toast-provider'
import type { Toast } from '@/lib/types'

const ICONS: Record<Toast['type'], React.ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 shrink-0 text-[#22C55E]" />,
  error:   <AlertTriangle className="w-4 h-4 shrink-0 text-[#EF4444]" />,
  warning: <Zap          className="w-4 h-4 shrink-0 text-[#F59E0B]" />,
  info:    <Info         className="w-4 h-4 shrink-0 text-[#4F8EF7]" />,
}

const BORDERS: Record<Toast['type'], string> = {
  success: 'border-[#22C55E]/30 bg-[#22C55E]/10',
  error:   'border-[#EF4444]/30 bg-[#EF4444]/10',
  warning: 'border-[#F59E0B]/30 bg-[#F59E0B]/10',
  info:    'border-[#4F8EF7]/30 bg-[#4F8EF7]/10',
}

const TEXT: Record<Toast['type'], string> = {
  success: 'text-[#22C55E]',
  error:   'text-[#EF4444]',
  warning: 'text-[#F59E0B]',
  info:    'text-[#4F8EF7]',
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-[12px] border shadow-xl ${BORDERS[toast.type]} backdrop-blur-sm`}
          >
            {ICONS[toast.type]}
            <p className={`font-sans text-xs flex-1 leading-relaxed ${TEXT[toast.type]}`}>
              {toast.message}
            </p>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-gray-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
