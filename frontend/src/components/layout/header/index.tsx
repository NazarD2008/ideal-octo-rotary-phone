import HeaderTop from './HeaderTop';

export default function Header({ onMobileMenuOpen }: { onMobileMenuOpen: () => void }) {
  return (
    <header className="sticky top-0 z-40 w-full bg-card/95 backdrop-blur-md border-b border-border">
      <div className="w-full">
        <HeaderTop onMobileMenuOpen={onMobileMenuOpen} />
      </div>
    </header>
  );
}

