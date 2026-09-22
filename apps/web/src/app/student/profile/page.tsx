'use client';

import { useAuth } from '@/lib/auth';
import { User, Save } from 'lucide-react';

export default function StudentProfilePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">
          Manage your academic details and personal information.
        </p>
      </div>

      {/* Profile Completion */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Profile Completion</h3>
          <span className="text-sm font-medium text-[var(--color-primary)]">--</span>
        </div>
        <div className="w-full bg-[var(--color-surface)] rounded-full h-2">
          <div
            className="bg-[var(--color-primary)] h-2 rounded-full transition-all"
            style={{ width: '0%' }}
          />
        </div>
        <p className="text-xs text-[var(--color-muted)] mt-2">
          Complete your profile to improve placement eligibility.
        </p>
      </div>

      {/* Profile Form */}
      <form className="card p-6 space-y-6" onSubmit={(e) => e.preventDefault()}>
        {/* Personal Info */}
        <div>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <User size={18} />
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">First Name</label>
              <input type="text" className="input" defaultValue={user?.firstName} readOnly />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input type="text" className="input" defaultValue={user?.lastName} readOnly />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" defaultValue={user?.email} readOnly />
            </div>
            <div>
              <label className="label">Phone</label>
              <input type="tel" className="input" placeholder="+91 98765 43210" />
            </div>
          </div>
        </div>

        {/* Academic Info */}
        <div>
          <h3 className="font-semibold mb-4">Academic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Roll Number</label>
              <input type="text" className="input" placeholder="e.g., 21CS1234" required />
            </div>
            <div>
              <label className="label">Branch</label>
              <select className="input" required>
                <option value="">Select Branch</option>
                <option value="CSE">Computer Science (CSE)</option>
                <option value="IT">Information Technology (IT)</option>
                <option value="ECE">Electronics & Communication (ECE)</option>
                <option value="EEE">Electrical & Electronics (EEE)</option>
                <option value="ME">Mechanical Engineering (ME)</option>
                <option value="CE">Civil Engineering (CE)</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Graduation Year</label>
              <input type="number" className="input" placeholder="2025" min={2020} max={2030} required />
            </div>
            <div>
              <label className="label">CGPA</label>
              <input type="number" className="input" placeholder="8.5" step="0.01" min={0} max={10} required />
            </div>
            <div>
              <label className="label">10th Percentage</label>
              <input type="number" className="input" placeholder="92.5" step="0.1" min={0} max={100} />
            </div>
            <div>
              <label className="label">12th Percentage</label>
              <input type="number" className="input" placeholder="88.0" step="0.1" min={0} max={100} />
            </div>
            <div>
              <label className="label">Active Backlogs</label>
              <input type="number" className="input" placeholder="0" min={0} />
            </div>
            <div>
              <label className="label">Total Backlogs</label>
              <input type="number" className="input" placeholder="0" min={0} />
            </div>
          </div>
        </div>

        {/* Links */}
        <div>
          <h3 className="font-semibold mb-4">Online Presence</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">LinkedIn URL</label>
              <input type="url" className="input" placeholder="https://linkedin.com/in/..." />
            </div>
            <div>
              <label className="label">GitHub URL</label>
              <input type="url" className="input" placeholder="https://github.com/..." />
            </div>
            <div className="md:col-span-2">
              <label className="label">Portfolio URL</label>
              <input type="url" className="input" placeholder="https://yourportfolio.com" />
            </div>
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="label">Bio</label>
          <textarea className="input" rows={4} placeholder="Tell us about yourself, your interests, and career goals..." />
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary btn-lg">
            <Save size={16} />
            Save Profile
          </button>
        </div>
      </form>
    </div>
  );
}
