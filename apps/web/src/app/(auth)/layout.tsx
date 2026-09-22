export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Logo/Brand */}
        <div className="text-center">
          <h1 className="text-3xl font-bold">
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              PlaceCampus
            </span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Intelligent University Placement Readiness
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}
