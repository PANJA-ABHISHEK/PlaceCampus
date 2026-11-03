import { redirect } from 'next/navigation';

/** Faculty use the shared campus login; kept so old links still work. */
export default function FacultyLoginPage() {
  redirect('/login');
}
