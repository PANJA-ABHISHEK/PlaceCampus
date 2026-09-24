'use client';

import { useState, useRef } from 'react';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Upload, FileCheck, Plus, Eye, Trash2, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { evidenceApi } from '@/lib/api';
import { toast } from 'sonner';

export default function StudentEvidencePage() {
  const queryClient = useQueryClient();
  const [showUploadForm, setShowUploadForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['evidence'],
    queryFn: () => evidenceApi.getMyEvidence(),
  });

  const evidence = data?.evidence ?? [];

  const uploadMutation = useMutation({
    mutationFn: evidenceApi.upload,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
      toast.success('Evidence uploaded successfully');
      setShowUploadForm(false);
      setFile(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to upload evidence');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: evidenceApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
      toast.success('Evidence deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete evidence');
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData();
    formData.append('title', (form.elements.namedItem('title') as HTMLInputElement).value);
    formData.append('type', (form.elements.namedItem('type') as HTMLSelectElement).value);
    formData.append('description', (form.elements.namedItem('description') as HTMLTextAreaElement).value);
    formData.append('claimedSkills', (form.elements.namedItem('claimedSkills') as HTMLInputElement).value);
    formData.append('file', file);

    uploadMutation.mutate(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this evidence?')) {
      deleteMutation.mutate(id);
    }
  };

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
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="label">Title</label>
              <input
                type="text"
                name="title"
                className="input"
                placeholder="e.g., AWS Certification"
                required
              />
            </div>
            <div>
              <label className="label">Type</label>
              <select name="type" className="input" required>
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
                name="description"
                className="input"
                rows={3}
                placeholder="Brief description of this evidence..."
              />
            </div>
            <div>
              <label className="label">Claimed Skills (comma separated)</label>
              <input
                type="text"
                name="claimedSkills"
                className="input"
                placeholder="e.g., Python, Machine Learning"
              />
            </div>
            <div>
              <label className="label">File</label>
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${file ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={32} className={`mx-auto mb-3 ${file ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)]'}`} />
                <p className="text-sm font-medium">
                  {file ? file.name : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-[var(--color-muted)] mt-1">
                  {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'PDF, JPEG, PNG, WebP, DOC, DOCX (max 10MB)'}
                </p>
                <input 
                  type="file" 
                  className="hidden" 
                  ref={fileInputRef}
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" 
                  onChange={handleFileChange}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn btn-primary" disabled={uploadMutation.isPending}>
                {uploadMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {uploadMutation.isPending ? 'Uploading...' : 'Submit Evidence'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowUploadForm(false)}
                disabled={uploadMutation.isPending}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Evidence List */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin text-[var(--color-primary)]" size={32} />
        </div>
      ) : evidence.length === 0 ? (
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
                      <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" title="View">
                        <Eye size={14} />
                      </a>
                      {(item.status === 'UPLOADED' || item.status === 'REJECTED') && (
                        <button 
                          className="btn btn-ghost btn-sm text-[var(--color-danger)]" 
                          title="Delete"
                          onClick={() => handleDelete(item._id)}
                          disabled={deleteMutation.isPending}
                        >
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
