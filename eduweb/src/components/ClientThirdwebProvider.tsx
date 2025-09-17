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
    return <>{children}</>;
  }

  return <ThirdwebProvider>{children}</ThirdwebProvider>;
}
