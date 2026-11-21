export default function Footer() {
  return (
    <footer className="border-t border-[#EAECF0] bg-white py-6 text-center text-xs text-[#667085]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p>© {new Date().getFullYear()} Fresher Jobs India. All posts sourced from public ATS and authorized job APIs.</p>
        <p className="text-[#98A2B3]">Automated daily via GitHub Actions</p>
      </div>
    </footer>
  );
}
