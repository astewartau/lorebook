import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BrowserState, parseState, serializeState } from './browserState';

/** The browser's state, read from and written to the URL. */
export function useBrowserState() {
  const [params, setParams] = useSearchParams();
  const state = useMemo(() => parseState(params), [params]);

  const update = useCallback((patch: Partial<BrowserState> | ((s: BrowserState) => BrowserState), opts?: { push?: boolean }) => {
    setParams(prev => {
      const current = parseState(prev);
      const next = typeof patch === 'function' ? patch(current) : { ...current, ...patch };
      return serializeState(next);
    }, { replace: !opts?.push });
  }, [setParams]);

  return { state, update, search: params.toString() };
}
