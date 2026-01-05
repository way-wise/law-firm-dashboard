import Navbar from "./_components/navbar";

const MainLayout = ({ children }: LayoutProps<"/">) => {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-background">
      <Navbar />
      {children}
    </div>
  );
};

export default MainLayout;
