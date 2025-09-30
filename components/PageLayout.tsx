import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';

type PageLayoutProps = {
  children: React.ReactNode;
  maxWidth?: string;
};

const PageLayout = ({ children, maxWidth = 'max-w-4xl' }: PageLayoutProps) => {
  return (
    <div className="bg-gray-900 min-h-screen text-white overflow-x-hidden">
      <Header />
      <main className={`p-4 pt-24 pb-24 standalone:p-0 standalone:pt-24 standalone:pb-24`}>
        <div className={`w-full ${maxWidth} mx-auto standalone:max-w-none standalone:px-4`}>{children}</div>
      </main>
      <BottomNav />
    </div>
  );
};

export default PageLayout;