type PageLayoutProps = {
  children: React.ReactNode;
  maxWidth?: string;
};

const PageLayout = ({ children, maxWidth = 'max-w-4xl' }: PageLayoutProps) => {
  return <div className={`w-full ${maxWidth} mx-auto standalone:max-w-none standalone:px-4`}>{children}</div>;
};

export default PageLayout;
