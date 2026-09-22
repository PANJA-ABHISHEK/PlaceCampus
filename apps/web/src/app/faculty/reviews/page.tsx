'use client';

import { useState } from 'react';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Eye,
  FileText,
} from 'lucide-react';

interface ReviewItem {
  _id: string;
  studentName: string;
  evidenceTitle: string;
  evidenceType: string;
  status: string;
  aiReasons: string[];
  createdAt: string;
}

export default function FacultyReviewsPage() {
  const [reviews] = useState<ReviewItem[]>([]);
  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [resubmissionComment, setResubmissionComment] = useState('');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Evidence Reviews</h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">
          Review student-submitted evidence flagged by the AI verification system.
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select className="input" style={{ width: 'auto' }}>
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {reviews.length === 0 ? (
        <EmptyState
          title="No reviews pending"
          description="When student evidence needs manual review, it will appear here."
          icon={<ClipboardList size={28} className="text-[var(--color-muted)]" />}
        />
      ) : (
        <div className="grid gap-4">
          {reviews.map((review) => (
            <div
              key={review._id}
              className="card p-5 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[var(--color-surface)] flex items-center justify-center">
                  <FileText size={20} className="text-[var(--color-muted)]" />
                </div>
                <div>
                  <p className="font-medium text-sm">{review.evidenceTitle}</p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {review.studentName} · {review.evidenceType.replace('_', ' ')}
                  </p>
                  {review.aiReasons.length > 0 && (
                    <p className="text-xs text-[var(--color-warning)] mt-1">
                      AI: {review.aiReasons[0]}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={review.status} />
                {review.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <button
                      className="btn btn-sm"
                      style={{ backgroundColor: 'var(--color-success)', color: 'white' }}
                      title="Approve"
                    >
                      <CheckCircle2 size={14} />
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      title="Reject"
                    >
                      <XCircle size={14} />
                    </button>
                    <button
                      className="btn btn-sm btn-secondary"
                      title="Request Resubmission"
                    >
                      <RotateCcw size={14} />
                    </button>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => setSelectedReview(review)}
                      title="View Details"
                    >
                      <Eye size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Detail Modal */}
      {selectedReview && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Review Details</h3>
              <button
                onClick={() => setSelectedReview(null)}
                className="btn btn-ghost btn-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-sm text-[var(--color-muted)]">Student:</span>
                <p className="font-medium">{selectedReview.studentName}</p>
              </div>
              <div>
                <span className="text-sm text-[var(--color-muted)]">Evidence:</span>
                <p className="font-medium">{selectedReview.evidenceTitle}</p>
              </div>
              <div>
                <span className="text-sm text-[var(--color-muted)]">AI Analysis Reasons:</span>
                <ul className="mt-1 space-y-1">
                  {selectedReview.aiReasons.map((reason, i) => (
                    <li key={i} className="text-sm text-[var(--color-warning)] flex items-start gap-2">
                      <span>•</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="border-t border-[var(--color-border)] pt-4 space-y-3">
              <div>
                <label className="label">Rejection Reason (required for reject)</label>
                <textarea
                  className="input"
                  rows={2}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Reason for rejection..."
                />
              </div>
              <div>
                <label className="label">Resubmission Comment</label>
                <textarea
                  className="input"
                  rows={2}
                  value={resubmissionComment}
                  onChange={(e) => setResubmissionComment(e.target.value)}
                  placeholder="Instructions for the student..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  className="btn"
                  style={{ backgroundColor: 'var(--color-success)', color: 'white' }}
                >
                  <CheckCircle2 size={16} />
                  Approve
                </button>
                <button className="btn btn-danger">
                  <XCircle size={16} />
                  Reject
                </button>
                <button className="btn btn-secondary">
                  <RotateCcw size={16} />
                  Request Resubmission
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
