import HeaderTop from './HeaderTop';
import HeaderNav from './HeaderNav';

export default function Header({ onMobileMenuOpen }: { onMobileMenuOpen: () => void }) {
  return (
    <header className="sticky top-0 z-40 w-full bg-card/95 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <HeaderTop onMobileMenuOpen={onMobileMenuOpen} />
        <HeaderNav />
      </div>
    </header>
  );
}

