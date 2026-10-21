'use client'

import { useState, useEffect, FormEvent } from 'react'
import { X, UserPlus, Users, Search, ShieldCheck, GraduationCap, CheckCircle2, AlertCircle, Loader2, Upload } from 'lucide-react'
import { getStudentDomain, getLibrarianDomain } from '@/lib/auth-utils'
import { BulkImportModal } from './BulkImportModal'

interface UserManagementModalProps {
  isOpen: boolean
  onClose: () => void
}

interface UserItem {
  student_id: string
  reg_no: string
  name: string
  email: string
  role: 'student' | 'librarian'
  created_at?: string
}

export function UserManagementModal({ isOpen, onClose }: UserManagementModalProps) {
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'librarian'>('all')

  // Single User Form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [regNo, setRegNo] = useState('')
  const [role, setRole] = useState<'student' | 'librarian'>('student')
  const [branch, setBranch] = useState('CSE')
  const [batchYear, setBatchYear] = useState('2024')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formFeedback, setFormFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const studentDomain = getStudentDomain()
  const librarianDomain = getLibrarianDomain()

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } catch (err: any) {
      console.error('Failed to load users:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchUsers()
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleRoleToggle = (selectedRole: 'student' | 'librarian') => {
    setRole(selectedRole)
    if (selectedRole === 'librarian') {
      setEmail((prev) => prev.split('@')[0] + librarianDomain)
    } else {
      setEmail((prev) => prev.split('@')[0] + studentDomain)
    }
  }

  const handleCreateSingleUser = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFormFeedback(null)

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          regNo: regNo || undefined,
          role,
          branch,
          batchYear: parseInt(batchYear, 10) || 2024,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setFormFeedback({ text: `User ${name} successfully created/updated!`, type: 'success' })
        setName('')
        setEmail('')
        setRegNo('')
        fetchUsers()
        setTimeout(() => setShowAddForm(false), 1200)
      } else {
        setFormFeedback({ text: data.error || 'Failed to create user', type: 'error' })
      }
    } catch (err: any) {
      setFormFeedback({ text: err.message || 'Network error', type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.reg_no.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === 'all' || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  return (
    <>
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-40 p-4">
        <div className="bg-[var(--surface)] border border-[var(--border-custom)] rounded-[16px] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
          {/* Top Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-custom)]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#FF6B1A]/10 border border-[#FF6B1A]/30 rounded-[10px]">
                <Users className="w-5 h-5 text-[#FF6B1A]" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-[var(--text-primary)]">User Directory & Enrollment</h3>
                <p className="text-xs text-[var(--text-muted)]">Register students, grant librarian privileges & bulk import</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBulkModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-dark)] border border-[var(--border-custom)] rounded-[8px]"
              >
                <Upload className="w-3.5 h-3.5 text-[#FF6B1A]" /> Bulk Import
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold text-black bg-[#FF6B1A] hover:bg-[#e05a10] rounded-[8px]"
              >
                <UserPlus className="w-3.5 h-3.5" /> {showAddForm ? 'View List' : 'Add Single User'}
              </button>
              <button onClick={onClose} className="p-1 rounded-full hover:bg-[var(--elevated)] text-[var(--text-secondary)]">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Form or Table view */}
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            {showAddForm ? (
              <form onSubmit={handleCreateSingleUser} className="max-w-xl mx-auto space-y-4 py-2">
                <div className="flex items-center justify-between border-b border-[var(--border-custom)] pb-3">
                  <h4 className="font-display font-bold text-sm text-[var(--text-primary)]">Create Individual User</h4>
                  <div className="flex bg-[var(--bg-dark)] p-0.5 rounded-[8px] border border-[var(--border-custom)] text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => handleRoleToggle('student')}
                      className={`px-3 py-1 rounded-[6px] transition-all ${
                        role === 'student' ? 'bg-[#FF6B1A] text-black font-bold' : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      Student
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRoleToggle('librarian')}
                      className={`px-3 py-1 rounded-[6px] transition-all ${
                        role === 'librarian' ? 'bg-[#FF6B1A] text-black font-bold' : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      Librarian
                    </button>
                  </div>
                </div>

                {formFeedback && (
                  <div
                    className={`p-3 rounded-[10px] text-xs flex items-center gap-2 ${
                      formFeedback.type === 'error'
                        ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                        : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    }`}
                  >
                    {formFeedback.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                    <span>{formFeedback.text}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-[var(--text-secondary)]">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Vikram Sharma"
                      className="w-full px-3 py-2 text-xs font-sans bg-[var(--bg-dark)] border border-[var(--border-custom)] rounded-[8px] text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B1A]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-[var(--text-secondary)]">Registration Number</label>
                    <input
                      type="text"
                      value={regNo}
                      onChange={(e) => setRegNo(e.target.value)}
                      placeholder={role === 'student' ? 'e.g. MUJ2024CSE0155' : 'e.g. LIB-003'}
                      className="w-full px-3 py-2 text-xs font-mono bg-[var(--bg-dark)] border border-[var(--border-custom)] rounded-[8px] text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B1A]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-[var(--text-secondary)]">
                    Institutional Email * (Domain: {role === 'student' ? studentDomain : librarianDomain})
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={role === 'student' ? `vikram.2024cse155${studentDomain}` : `vikram.sharma${librarianDomain}`}
                    className="w-full px-3 py-2 text-xs font-mono bg-[var(--bg-dark)] border border-[var(--border-custom)] rounded-[8px] text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B1A]"
                  />
                </div>

                {role === 'student' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-[var(--text-secondary)]">Branch</label>
                      <input
                        type="text"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        placeholder="CSE, ECE, IT..."
                        className="w-full px-3 py-2 text-xs font-mono bg-[var(--bg-dark)] border border-[var(--border-custom)] rounded-[8px] text-[var(--text-primary)]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-[var(--text-secondary)]">Batch Year</label>
                      <input
                        type="number"
                        value={batchYear}
                        onChange={(e) => setBatchYear(e.target.value)}
                        placeholder="2024"
                        className="w-full px-3 py-2 text-xs font-mono bg-[var(--bg-dark)] border border-[var(--border-custom)] rounded-[8px] text-[var(--text-primary)]"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 text-xs font-mono text-[var(--text-secondary)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-5 py-2 text-xs font-mono font-bold text-black bg-[#FF6B1A] hover:bg-[#e05a10] disabled:opacity-50 rounded-[8px]"
                  >
                    {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                    <span>Save User</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:w-72">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search name, email, reg no..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs font-mono bg-[var(--bg-dark)] border border-[var(--border-custom)] rounded-[8px] text-[var(--text-primary)] focus:outline-none focus:border-[#FF6B1A]"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-[var(--bg-dark)] p-0.5 rounded-[8px] border border-[var(--border-custom)] text-xs font-mono self-end">
                    {(['all', 'student', 'librarian'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRoleFilter(r)}
                        className={`px-2.5 py-1 rounded-[6px] capitalize ${
                          roleFilter === r ? 'bg-[#FF6B1A] text-black font-bold' : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table */}
                <div className="border border-[var(--border-custom)] rounded-[12px] overflow-hidden">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[var(--bg-dark)] text-[var(--text-muted)] border-b border-[var(--border-custom)]">
                      <tr>
                        <th className="p-3">User</th>
                        <th className="p-3">Reg No</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-custom)]/50">
                      {loading ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-[var(--text-muted)]">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#FF6B1A]" />
                            Loading users...
                          </td>
                        </tr>
                      ) : filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-[var(--text-muted)]">
                            No users found matching your filters.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => (
                          <tr key={u.student_id} className="hover:bg-[var(--elevated)]/40 transition-colors">
                            <td className="p-3 font-medium text-[var(--text-primary)]">{u.name}</td>
                            <td className="p-3 text-[var(--text-secondary)]">{u.reg_no}</td>
                            <td className="p-3 text-[var(--text-secondary)]">{u.email}</td>
                            <td className="p-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  u.role === 'librarian'
                                    ? 'bg-[#FF6B1A]/10 text-[#FF6B1A] border border-[#FF6B1A]/30'
                                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                }`}
                              >
                                {u.role === 'librarian' ? <ShieldCheck className="w-3 h-3" /> : <GraduationCap className="w-3 h-3" />}
                                <span className="capitalize">{u.role}</span>
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Import Sub-Modal */}
      <BulkImportModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onSuccess={(count) => {
          fetchUsers()
        }}
      />
    </>
  )
}
