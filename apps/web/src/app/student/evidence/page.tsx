'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Upload, FileCheck, Plus, Eye, Trash2 } from 'lucide-react';

interface EvidenceItem {
  _id: string;
  title: string;
  type: string;
  status: string;
  createdAt: string;
  originalFileName?: string;
}

export default function StudentEvidencePage() {
  const { user } = useAuth();
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [evidence] = useState<EvidenceItem[]>([]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Evidence</h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            Upload certificates, projects, and achievements for verification.
          </p>
        </div>
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="btn btn-primary"
        >
          <Plus size={16} />
          Upload Evidence
        </button>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold">Upload New Evidence</h3>
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="label">Title</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., AWS Certification"
                required
              />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input">
                <option value="CERTIFICATE">Certificate</option>
                <option value="PROJECT">Project</option>
                <option value="INTERNSHIP">Internship</option>
                <option value="HACKATHON">Hackathon</option>
                <option value="CODING_PROFILE">Coding Profile</option>
                <option value="ACADEMIC">Academic Achievement</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Description (optional)</label>
              <textarea
                className="input"
                rows={3}
                placeholder="Brief description of this evidence..."
              />
            </div>
            <div>
              <label className="label">Claimed Skills (comma separated)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., Python, Machine Learning"
              />
            </div>
            <div>
              <label className="label">File</label>
              <div className="border-2 border-dashed border-[var(--color-border)] rounded-lg p-8 text-center hover:border-[var(--color-primary)] transition-colors cursor-pointer">
                <Upload size={32} className="mx-auto text-[var(--color-muted)] mb-3" />
                <p className="text-sm font-medium">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-[var(--color-muted)] mt-1">
                  PDF, JPEG, PNG, WebP, DOC, DOCX (max 10MB)
                </p>
                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn btn-primary">
                <Upload size={16} />
                Submit Evidence
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowUploadForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Evidence List */}
      {evidence.length === 0 ? (
        <EmptyState
          title="No evidence uploaded"
          description="Upload your certificates, projects, and achievements. They'll be verified through our AI-assisted system."
          icon={<FileCheck size={28} className="text-[var(--color-muted)]" />}
          action={
            <button
              onClick={() => setShowUploadForm(true)}
              className="btn btn-primary"
            >
              <Plus size={16} />
              Upload Your First Evidence
            </button>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                <th className="text-left px-4 py-3 text-sm font-medium text-[var(--color-muted)]">
                  Title
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-[var(--color-muted)]">
                  Type
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-[var(--color-muted)]">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-[var(--color-muted)]">
                  Date
                </th>
                <th className="text-right px-4 py-3 text-sm font-medium text-[var(--color-muted)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {evidence.map((item) => (
                <tr key={item._id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface)]">
                  <td className="px-4 py-3 text-sm font-medium">{item.title}</td>
                  <td className="px-4 py-3 text-sm text-[var(--color-muted)]">
                    {item.type.replace('_', ' ')}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--color-muted)]">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="btn btn-ghost btn-sm" title="View">
                        <Eye size={14} />
                      </button>
                      {(item.status === 'UPLOADED' || item.status === 'REJECTED') && (
                        <button className="btn btn-ghost btn-sm text-[var(--color-danger)]" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
