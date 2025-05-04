import { redirect } from 'next/navigation';

export default function DashboardPage() {
  // Redirect to the vehicles list by default when accessing /dashboard
  redirect('/dashboard/vehicles');
}
