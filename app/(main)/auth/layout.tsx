const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="grid grow place-items-center px-4 py-6">
      <main className="flex w-full max-w-md flex-col gap-8">{children}</main>
    </div>
  );
};

export default AuthLayout;
