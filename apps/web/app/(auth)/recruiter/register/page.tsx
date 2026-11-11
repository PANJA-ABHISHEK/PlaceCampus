import { Metadata } from 'next';
import { RegisterForm } from '@/features/auth/components/register-form';

export const metadata: Metadata = {
  title: 'Create Recruiter Account',
  description: 'Create an external recruiter account for PlaceCampus.',
};

export default function RecruiterRegisterPage() {
  return <RegisterForm portal="recruiter" />;
}
