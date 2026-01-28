import Image from "next/image";

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="grid grow place-items-center px-4 py-6">
      <main className="flex w-full max-w-md flex-col gap-8">
        <div className="flex justify-center">
          <Image 
            src="/logo.png" 
            alt="Law Firm Dashboard" 
            width={64}
            height={64}
            className="h-16 w-auto"
            priority
            quality={100}
          />
        </div>
        {children}
      </main>
    </div>
  );
};

export default AuthLayout;
