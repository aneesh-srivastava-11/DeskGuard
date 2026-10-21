'use client'

import { useState, ChangeEvent } from 'react'
import { X, Upload, FileText, CheckCircle2, AlertCircle, Download, Loader2 } from 'lucide-react'

interface BulkImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (count: number) => void
}

interface ParsedRow {
  name: string
  email: string
  regNo: string
  role: 'student' | 'librarian'
  branch?: string
  batchYear?: number
  valid: boolean
  error?: string
}

export function BulkImportModal({ isOpen, onClose, onSuccess }: BulkImportModalProps) {
  const [csvText, setCsvText] = useState('')
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  if (!isOpen) return null

  // Lightweight native CSV parser
  const parseCSV = (content: string) => {
    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    if (lines.length < 2) {
      setStatusMessage({ text: 'CSV must contain at least a header row and one data row.', type: 'error' })
      setParsedRows([])
      return
    }

    // Header mapping
    const header = lines[0].toLowerCase().split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''))
    const nameIdx = header.indexOf('name')
    const emailIdx = header.indexOf('email')
    const regIdx = header.findIndex((h) => h === 'reg_no' || h === 'regno' || h === 'registration_number')
    const roleIdx = header.indexOf('role')
    const branchIdx = header.indexOf('branch')
    const batchIdx = header.findIndex((h) => h === 'batch' || h === 'batch_year' || h === 'batchyear')

    if (nameIdx === -1 || emailIdx === -1) {
      setStatusMessage({
        text: 'CSV header must include at least "name" and "email" columns.',
        type: 'error',
      })
      setParsedRows([])
      return
    }

    const rows: ParsedRow[] = []
    for (let i = 1; i < lines.length; i++) {
      // Split preserving standard commas
      const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''))
      const name = cols[nameIdx] || ''
      const email = (cols[emailIdx] || '').toLowerCase()
      const regNo = regIdx !== -1 ? cols[regIdx] : ''
      const rawRole = roleIdx !== -1 ? (cols[roleIdx] || '').toLowerCase() : ''
      const role: 'student' | 'librarian' = rawRole === 'librarian' || email.includes('jaipur.manipal.edu') ? 'librarian' : 'student'
      const branch = branchIdx !== -1 ? cols[branchIdx] : undefined
      const batchYear = batchIdx !== -1 && cols[batchIdx] ? parseInt(cols[batchIdx], 10) : undefined

      const isValid = Boolean(name && email && email.includes('@'))
      rows.push({
        name,
        email,
        regNo: regNo || (name ? `REG-${Math.floor(100000 + Math.random() * 900000)}` : ''),
        role,
        branch,
        batchYear,
        valid: isValid,
        error: !isValid ? 'Missing name or valid email' : undefined,
      })
    }

    setParsedRows(rows)
    setStatusMessage(null)
  }

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setCsvText(text)
      parseCSV(text)
    }
    reader.readAsText(file)
  }

  const handleDownloadSample = () => {
    const sample = `name,email,reg_no,role,branch,batch_year
Aarav Gupta,aarav.2024cse101@muj.manipal.edu,MUJ2024CSE0101,student,CSE,2024
Sneha Rao,sneha.2024ece055@muj.manipal.edu,MUJ2024ECE0055,student,ECE,2024
Anand Joshi,anand.joshi@jaipur.manipal.edu,LIB-002,librarian,Library Staff,2023`
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'deskguard_users_template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleImport = async () => {
    const validRows = parsedRows.filter((r) => r.valid)
    if (validRows.length === 0) {
      setStatusMessage({ text: 'No valid rows to import.', type: 'error' })
      return
    }

    setIsSubmitting(true)
    setStatusMessage(null)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: validRows }),
      })
      const data = await res.json()
      if (res.ok) {
        onSuccess(data.imported + data.updated)
        onClose()
      } else {
        setStatusMessage({ text: data.error || 'Bulk import failed.', type: 'error' })
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Network error during import', type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const validCount = parsedRows.filter((r) => r.valid).length
  const invalidCount = parsedRows.length - validCount

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--surface)] border border-[var(--border-custom)] rounded-[16px] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-custom)]">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-[#FF6B1A]" />
            <h3 className="font-display font-bold text-lg text-[var(--text-primary)]">Bulk Import Users</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-[var(--elevated)] text-[var(--text-secondary)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* File Upload Zone */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-2 border-dashed border-[var(--border-custom)] rounded-[12px] bg-[var(--bg-dark)]/50">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-[#FF6B1A] shrink-0" />
              <div>
                <p className="font-medium text-xs text-[var(--text-primary)]">
                  {fileName ? fileName : 'Upload CSV file containing user records'}
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">Columns: name, email, reg_no, role, branch, batch_year</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownloadSample}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface)] border border-[var(--border-custom)] rounded-[8px]"
              >
                <Download className="w-3.5 h-3.5" /> Template
              </button>
              <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold text-black bg-[#FF6B1A] hover:bg-[#e05a10] rounded-[8px] cursor-pointer">
                <span>Select File</span>
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>

          <div className="bg-[#FF6B1A]/10 border border-[#FF6B1A]/30 rounded-[8px] p-2.5 text-[11px] text-[var(--text-secondary)] leading-relaxed">
            <span className="font-bold text-[#FF6B1A]">Default Password:</span> All imported accounts will be provisioned in Firebase Auth with default password <span className="font-mono font-bold text-[var(--text-primary)]">DeskGuard@2026</span>. Users can change this anytime from their profile.
          </div>

          {/* Or Paste CSV */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Or Paste CSV Content
            </label>
            <textarea
              rows={4}
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value)
                parseCSV(e.target.value)
              }}
              placeholder="name,email,reg_no,role,branch,batch_year&#10;Aarav Gupta,aarav.2024cse101@muj.manipal.edu,MUJ2024CSE0101,student,CSE,2024"
              className="w-full p-3 font-mono text-xs bg-[var(--bg-dark)] border border-[var(--border-custom)] rounded-[10px] text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B1A]"
            />
          </div>

          {/* Status Alert */}
          {statusMessage && (
            <div
              className={`p-3 rounded-[10px] text-xs flex items-center gap-2 ${
                statusMessage.type === 'error'
                  ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                  : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[var(--text-secondary)]">Parsed Preview: {parsedRows.length} rows</span>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {validCount} valid
                  </span>
                  {invalidCount > 0 && (
                    <span className="text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {invalidCount} invalid
                    </span>
                  )}
                </div>
              </div>

              <div className="border border-[var(--border-custom)] rounded-[10px] max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[var(--bg-dark)] text-[var(--text-muted)] border-b border-[var(--border-custom)] sticky top-0">
                    <tr>
                      <th className="p-2">Name</th>
                      <th className="p-2">Email</th>
                      <th className="p-2">Reg No</th>
                      <th className="p-2">Role</th>
                      <th className="p-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-custom)]/50">
                    {parsedRows.map((r, i) => (
                      <tr key={i} className={r.valid ? 'hover:bg-[var(--elevated)]/50' : 'bg-red-500/5'}>
                        <td className="p-2 text-[var(--text-primary)] font-medium">{r.name}</td>
                        <td className="p-2 text-[var(--text-secondary)]">{r.email}</td>
                        <td className="p-2 text-[var(--text-secondary)]">{r.regNo}</td>
                        <td className="p-2 capitalize">{r.role}</td>
                        <td className="p-2 text-right">
                          {r.valid ? (
                            <span className="text-emerald-400">Ready</span>
                          ) : (
                            <span className="text-red-400">{r.error}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border-custom)] flex items-center justify-between bg-[var(--bg-dark)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={isSubmitting || validCount === 0}
            className="flex items-center gap-2 px-5 py-2 text-xs font-mono font-bold text-black bg-[#FF6B1A] hover:bg-[#e05a10] disabled:opacity-40 rounded-[8px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <span>Confirm Import ({validCount} Users)</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
