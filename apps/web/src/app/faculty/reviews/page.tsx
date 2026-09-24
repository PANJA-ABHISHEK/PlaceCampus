'use client';

import { useState } from 'react';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Eye,
  FileText,
  Loader2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { facultyApi, ReviewItem } from '@/lib/api';
import { toast } from 'sonner';

export default function FacultyReviewsPage() {
  const queryClient = useQueryClient();
  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null);
  const [comments, setComments] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['faculty', 'reviews', 'pending'],
    queryFn: () => facultyApi.getPendingReviews(),
  });

  const reviews = data?.reviews ?? [];

  const decisionMutation = useMutation({
    mutationFn: facultyApi.submitReviewDecision,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty'] });
      toast.success('Review decision submitted successfully');
      setSelectedReview(null);
      setComments('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit decision');
    },
  });

  const handleDecision = (reviewId: string, decision: 'APPROVED' | 'REJECTED') => {
    if (decision === 'REJECTED' && !comments.trim()) {
      toast.error('Comments are required for rejection');
      return;
    }
    decisionMutation.mutate({ reviewId, decision, comments });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Evidence Reviews</h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">
          Review student-submitted evidence flagged by the AI verification system.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin text-[var(--color-primary)]" size={32} />
        </div>
      ) : reviews.length === 0 ? (
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
                  <p className="font-medium text-sm">{review.evidenceId?.title}</p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {review.evidenceId?.studentId?.firstName} {review.evidenceId?.studentId?.lastName} · {review.evidenceId?.type?.replace('_', ' ')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={review.status} />
                {review.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => {
                        setSelectedReview(review);
                        setComments('');
                      }}
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
                <p className="font-medium">{selectedReview.evidenceId?.studentId?.firstName} {selectedReview.evidenceId?.studentId?.lastName}</p>
                <p className="text-sm text-[var(--color-muted)]">{selectedReview.evidenceId?.studentId?.email}</p>
              </div>
              <div>
                <span className="text-sm text-[var(--color-muted)]">Evidence:</span>
                <p className="font-medium">{selectedReview.evidenceId?.title}</p>
                <p className="text-sm text-[var(--color-muted)]">{selectedReview.evidenceId?.type?.replace('_', ' ')}</p>
              </div>
              {selectedReview.evidenceId?.fileUrl && (
                <div>
                  <a href={selectedReview.evidenceId.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--color-primary)] hover:underline">
                    View Uploaded File
                  </a>
                </div>
              )}
            </div>

            <div className="border-t border-[var(--color-border)] pt-4 space-y-3">
              <div>
                <label className="label">Comments (required for rejection)</label>
                <textarea
                  className="input"
                  rows={3}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Feedback for the student..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  className="btn"
                  style={{ backgroundColor: 'var(--color-success)', color: 'white' }}
                  onClick={() => handleDecision(selectedReview._id, 'APPROVED')}
                  disabled={decisionMutation.isPending}
                >
                  {decisionMutation.isPending && decisionMutation.variables?.decision === 'APPROVED' ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Approve
                </button>
                <button 
                  className="btn btn-danger"
                  onClick={() => handleDecision(selectedReview._id, 'REJECTED')}
                  disabled={decisionMutation.isPending}
                >
                  {decisionMutation.isPending && decisionMutation.variables?.decision === 'REJECTED' ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
