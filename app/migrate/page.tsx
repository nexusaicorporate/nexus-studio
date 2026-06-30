"use client";
import Page from "@/components/Page";

// This page was a legacy Supabase data migration tool.
// Data migration is now handled via the Admin panel at /admin.
export default function MigratePage() {
  return (
    <Page title="Data Migration" subtitle="Use the Admin panel for user data migration">
      <div className="card p-8 text-center max-w-lg mx-auto mt-8">
        <p className="text-muted mb-4">This legacy migration page has been superseded by the Admin Control Panel.</p>
        <a href="/admin" className="btn-primary inline-flex items-center gap-2">Go to Admin Panel</a>
      </div>
    </Page>
  );
}
