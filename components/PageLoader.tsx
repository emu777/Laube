const PageLoader = () => {
  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-[100] flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-pink-500"></div>
    </div>
  );
};

export default PageLoader;