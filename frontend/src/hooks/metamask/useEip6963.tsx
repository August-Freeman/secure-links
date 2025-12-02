import { useEffect, useState } from "react";

type EIP6963ProviderInfo = {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
};

type EIP6963ProviderDetail = {
  info: EIP6963ProviderInfo;
  provider: any;
};

type EIP6963AnnounceProviderEvent = {
  detail: EIP6963ProviderDetail;
};

export function useEip6963() {
  const [providers, setProviders] = useState<EIP6963ProviderDetail[]>([]);
  const [error, setError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    function onAnnounceProvider({ detail }: EIP6963AnnounceProviderEvent) {
      setProviders((current) => {
        const exists = current.some(
          (p) => p.info.uuid === detail.info.uuid
        );
        if (exists) return current;
        return [...current, detail];
      });
    }

    const w = window as unknown as {
      ethereum?: {
        providers?: any[];
        on?: (event: string, callback: (payload: any) => void) => void;
        request?: ({ method }: { method: string }) => Promise<any>;
      };
    };

    try {
      window.addEventListener(
        "eip6963:announceProvider",
        onAnnounceProvider as unknown as EventListener
      );
      window.dispatchEvent(new Event("eip6963:requestProvider"));

      // Fallback: if EIP-6963 isn't available or no providers announced,
      // try to use window.ethereum (MetaMask) directly.
      // This improves compatibility across older MetaMask versions and browsers.
      setTimeout(() => {
        try {
          const announced = (providersRef => providersRef)([]); // no-op to satisfy TS
        } catch {}
        const eth = w.ethereum as unknown as any;
        const existing: EIP6963ProviderDetail[] = [];
        if (Array.isArray(eth?.providers) && eth.providers.length > 0) {
          for (const p of eth.providers) {
            const info = (p?.providerInfo ?? p?.info ?? { name: "MetaMask" }) as { name?: string; rdns?: string; uuid?: string; icon?: string };
            existing.push({
              info: {
                uuid: info.uuid ?? "window.ethereum:" + (info.rdns ?? info.name ?? "metamask"),
                name: (info.name ?? "MetaMask") as string,
                icon: info.icon ?? "",
                rdns: info.rdns ?? "io.metamask",
              },
              provider: p,
            });
          }
        } else if (eth) {
          existing.push({
            info: {
              uuid: "window.ethereum",
              name: "MetaMask",
              icon: "",
              rdns: "io.metamask",
            },
            provider: eth,
          });
        }
        if (existing.length > 0) {
          setProviders((current) => {
            const uuids = new Set(current.map((c) => c.info.uuid));
            const merged = [...current];
            for (const e of existing) {
              if (!uuids.has(e.info.uuid)) merged.push(e);
            }
            return merged;
          });
        }
      }, 0);
    } catch (e) {
      setError(e as Error);
    }

    return () => {
      window.removeEventListener(
        "eip6963:announceProvider",
        onAnnounceProvider as unknown as EventListener
      );
    };
  }, []);

  return { providers, error } as const;
}


