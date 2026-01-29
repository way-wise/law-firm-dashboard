const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="grid grow place-items-center px-4 py-6">
      <main className="flex w-full max-w-md flex-col gap-8">
        <div className="flex justify-center">
          <img src="/logo.png" alt="Brand Logo" width={200} />
        </div>
        {children}
      </main>
    </div>
  );
};

export default AuthLayout;
