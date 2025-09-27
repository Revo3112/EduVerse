"use client";

import { useEffect, useState } from "react";
import { ThirdwebProvider } from "thirdweb/react";

interface ClientThirdwebProviderProps {
  children: React.ReactNode;
}

export function ClientThirdwebProvider({ children }: ClientThirdwebProviderProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span>Loading...</span>
      </div>
    );
  }

  return <ThirdwebProvider>{children}</ThirdwebProvider>;
}
