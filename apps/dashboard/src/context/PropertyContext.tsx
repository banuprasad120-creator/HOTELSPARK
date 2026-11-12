import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, setPropertyId as setApiPropertyId } from '../lib/api';
import { joinPropertyRoom, leavePropertyRoom } from '../lib/socket';
import {
  PORTFOLIO_MODE_ID,
  type PropertySummary,
  type OrganizationSummary,
} from '../lib/property-types';

interface PropertyContextValue {
  propertyId: string | null;
  /** null when unknown — portfolio mode, or a property with no code. Never a
   *  substituted default: see lib/money.ts. */
  currencyCode: string | null;
  setPropertyId: (id: string) => void;
  isPortfolioMode: boolean;
  properties: PropertySummary[];
  organizations: OrganizationSummary[];
  propertiesLoading: boolean;
  propertiesError: string | null;
}

const PropertyContext = createContext<PropertyContextValue>({
  propertyId: null,
  currencyCode: null,
  setPropertyId: () => {},
  isPortfolioMode: false,
  properties: [],
  organizations: [],
  propertiesLoading: false,
  propertiesError: null,
});

const DEFAULT_SPARK_ID = 'a0000001-0000-4000-a000-000000000001';

export function PropertyProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [lastPropertyId, setLastPropertyId] = useState<string | null>(() => {
    try {
      return (
        searchParams.get('propertyId') ||
        localStorage.getItem('haip_property_id') ||
        DEFAULT_SPARK_ID
      );
    } catch {
      return searchParams.get('propertyId') || DEFAULT_SPARK_ID;
    }
  });
  // Explicit deep links and browser history take precedence. Keep the last
  // selection only for in-app destinations that omit the query parameter.
  const urlPropertyId = searchParams.get('propertyId');
  const propertyId = urlPropertyId || lastPropertyId || DEFAULT_SPARK_ID;
  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);

  const isPortfolioMode = propertyId === PORTFOLIO_MODE_ID;
  // Portfolio mode spans properties that may not share a currency, so it has no
  // single answer — and NULL is that answer.
  const currencyCode =
    (!isPortfolioMode &&
      (properties.find((p) => p.id === propertyId)?.currencyCode || 'INR')) ||
    'INR';

  function setPropertyId(id: string) {
    try {
      localStorage.setItem('haip_property_id', id);
    } catch {}
    setLastPropertyId(id);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('propertyId', id);
      return next;
    });
  }

  useEffect(() => {
    if (urlPropertyId) {
      try {
        localStorage.setItem('haip_property_id', urlPropertyId);
      } catch {}
      setLastPropertyId(urlPropertyId);
      return;
    }
    const fallback =
      lastPropertyId ||
      (!propertiesLoading && properties.length > 0
        ? properties.length > 1
          ? PORTFOLIO_MODE_ID
          : properties[0].id
        : DEFAULT_SPARK_ID);
    if (fallback) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('propertyId', fallback);
          return next;
        },
        { replace: true },
      );
    }
  }, [urlPropertyId, lastPropertyId, propertiesLoading, properties, setSearchParams]);

  const loadProperties = () => {
    setPropertiesLoading(true);
    setPropertiesError(null);
    Promise.all([
      api.get('/v1/properties'),
      api.get('/v1/organizations', { skipErrorToast: true }).catch((err) => {
        console.error('Failed to load organizations:', err);
        return { data: [] };
      }),
    ])
      .then(([propRes, orgRes]) => {
        const list: PropertySummary[] = propRes.data?.data ?? propRes.data ?? [];
        const orgList: OrganizationSummary[] = orgRes.data?.data ?? orgRes.data ?? [];
        setProperties(list);
        setOrganizations(orgList);
        if (list.length > 0) {
          const targetId = list.find((p) => p.id === propertyId)?.id || list[0].id;
          try {
            localStorage.setItem('haip_property_id', targetId);
          } catch {}
        }
      })
      .catch((err) => {
        setPropertiesError(err?.message ?? 'Failed to load properties');
        setTimeout(() => {
          loadProperties();
        }, 2000);
      })
      .finally(() => setPropertiesLoading(false));
  };

  useEffect(() => {
    loadProperties();
    // Auto-retry when window/tab regains focus if properties had failed to load
    const onFocus = () => {
      setProperties((curr) => {
        if (curr.length === 0) {
          loadProperties();
        }
        return curr;
      });
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
    // Bootstrap once. Resolve defaults separately against the current URL,
    // so a delayed response cannot overwrite a selection made while loading.
  }, []);

  useEffect(() => {
    if (isPortfolioMode) {
      setApiPropertyId(null);
      return;
    }
    setApiPropertyId(propertyId);
    if (propertyId) {
      joinPropertyRoom(propertyId);
      return () => leavePropertyRoom(propertyId);
    }
  }, [propertyId, isPortfolioMode]);

  return (
    <PropertyContext.Provider
      value={{
        propertyId,
        currencyCode,
        setPropertyId,
        isPortfolioMode,
        properties,
        organizations,
        propertiesLoading,
        propertiesError,
      }}
    >
      {children}
    </PropertyContext.Provider>
  );
}

export function useProperty() {
  return useContext(PropertyContext);
}

export { PORTFOLIO_MODE_ID };
