import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiGetAvailableVouchers, apiGetPointConfig, type AvailableVoucher, type PointConfig } from '../services/api';

/**
 * Alle Punktwerte kommen aus der DB: Stations-/Belohnungspunkte, Achievements, Level-Größe
 * (get_point_config.php) und Gutscheinpreise (get_available_vouchers.php).
 * Solange nichts geladen ist (oder der Server nicht erreichbar ist), ist `config` null –
 * Konsumenten zeigen dann keine Punktwerte an statt erfundene Zahlen.
 */
interface PointConfigContextType {
  config: PointConfig | null;
  shopVouchers: AvailableVoucher[];
  /** Aufsteigend sortierte, eindeutige Gutscheinpreise des Shops */
  voucherPrices: number[];
  reloadShopVouchers: () => Promise<void>;
}

const PointConfigContext = createContext<PointConfigContextType>({
  config: null,
  shopVouchers: [],
  voucherPrices: [],
  reloadShopVouchers: async () => {},
});

export function PointConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<PointConfig | null>(null);
  const [shopVouchers, setShopVouchers] = useState<AvailableVoucher[]>([]);

  const reloadShopVouchers = useCallback(async () => {
    try {
      const res = await apiGetAvailableVouchers();
      setShopVouchers(res.vouchers.map((v) => ({ ...v, points_value: Number(v.points_value), quantity: v.quantity == null ? undefined : Number(v.quantity) })));
    } catch {
      /* Shop nicht erreichbar – keine Gutscheine anzeigen */
    }
  }, []);

  useEffect(() => {
    apiGetPointConfig().then(setConfig, () => {
      /* Server nicht erreichbar – Punktwerte bleiben unbekannt */
    });
    void reloadShopVouchers();
  }, [reloadShopVouchers]);

  const voucherPrices = useMemo(
    () => [...new Set(shopVouchers.map((v) => v.points_value))].sort((a, b) => a - b),
    [shopVouchers]
  );

  const value = useMemo(
    () => ({ config, shopVouchers, voucherPrices, reloadShopVouchers }),
    [config, shopVouchers, voucherPrices, reloadShopVouchers]
  );

  return <PointConfigContext.Provider value={value}>{children}</PointConfigContext.Provider>;
}

export function usePointConfig(): PointConfigContextType {
  return useContext(PointConfigContext);
}
