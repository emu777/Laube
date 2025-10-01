const PageLoader = () => {
  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-[100] flex items-center justify-center pointer-events-auto">
      <div className="w-16 h-16 border-4 border-solid border-pink-500 border-t-transparent rounded-full animate-[spin_1.5s_linear_infinite]"></div>
    </div>
  );
};

export default PageLoader;
