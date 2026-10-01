import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { UNSAFE_NavigationContext, useLocation, type To } from 'react-router-dom';
import { PhoneOff, Radio } from 'lucide-react';

import { setHistoryGate } from '@/shared/lib/history-gate';
import { Button, Modal } from '@/shared/ui';
import { useT } from '@/shared/i18n';
import { useLiveCallStore } from '../model/live-call.store';

/** Whether `pathname` is still inside the project the call belongs to. */
const staysInProject = (pathname: string, projectId: string): boolean => {
  const base = `/projects/${projectId}`;
  return pathname === base || pathname.startsWith(`${base}/`);
};

/** The pathname a router `To` would land on, resolved against where we are. */
const pathnameOf = (to: To): string => {
  if (typeof to === 'string') return new URL(to, window.location.href).pathname;
  return to.pathname ? new URL(to.pathname, window.location.href).pathname : window.location.pathname;
};

/** The router's position in the history stack, which it keeps in the entry. */
const historyIndex = (): number | null => {
  const idx = (window.history.state as { idx?: unknown } | null)?.idx;
  return typeof idx === 'number' ? idx : null;
};

type RouterNavigator = {
  push: (to: To, state?: unknown, options?: unknown) => void;
  replace: (to: To, state?: unknown, options?: unknown) => void;
};

/**
 * "You are about to leave the call", before it happens rather than after. Leaving the *project*.
 * The call now survives moving between the project's own tabs.
 */
export const LiveCallGuard = () => {
  const t = useT();
  const active = useLiveCallStore((state) => state.active);
  const navigator = useContext(UNSAFE_NavigationContext).navigator as unknown as RouterNavigator;
  const location = useLocation();

  /**
   * The question being asked: what to do on "leave", and on "stay". Null while
   * nothing is being asked.
   */
  const [pending, setPending] = useState<{ proceed: () => void; cancel?: () => void } | null>(
    null,
  );
  /** Lets exactly the one `popstate` the reader agreed to through. */
  const bypass = useRef(false);
  /** Where the router is in the history stack, for putting a back press back. */
  const routerIndex = useRef<number | null>(historyIndex());
  /** And its address, for the rare entry that carries no index. */
  const routerHref = useRef(window.location.href);

  // After every navigation the router has accepted, the entry it is on.
  useEffect(() => {
    routerIndex.current = historyIndex();
    routerHref.current = window.location.href;
  }, [location.key]);

  const projectId = active?.projectId ?? null;

  const leaves = useCallback(
    (pathname: string) => projectId !== null && !staysInProject(pathname, projectId),
    [projectId],
  );

  // --- Links and navigate() ------------------------------------------------
  useEffect(() => {
    if (!projectId) return;

    const { push, replace } = navigator;
    const guard =
      (method: RouterNavigator['push']): RouterNavigator['push'] =>
      (to, state, options) => {
        if (!leaves(pathnameOf(to))) {
          method.call(navigator, to, state, options);
          return;
        }
        // The unwrapped method, so agreeing goes straight through.
        setPending({ proceed: () => method.call(navigator, to, state, options) });
      };

    navigator.push = guard(push);
    navigator.replace = guard(replace);
    return () => {
      navigator.push = push;
      navigator.replace = replace;
    };
  }, [leaves, navigator, projectId]);

  // --- Back and forward ------------------------------------------------------
  useEffect(() => {
    if (!projectId) return;

    /** The one `popstate` caused by putting the address back. Not a move. */
    let isRestoring = false;
    // A pass left over from a call that ended before it was used is not one
    // this call has given.
    bypass.current = false;

    const onPopState = (event: PopStateEvent) => {
      if (isRestoring) {
        isRestoring = false;
        event.stopImmediatePropagation();
        return;
      }
      if (bypass.current || !leaves(window.location.pathname)) {
        bypass.current = false;
        return;
      }

      // The router never hears about this one.
      event.stopImmediatePropagation();

      const from = routerIndex.current;
      const to = historyIndex();

      if (from !== null && to !== null && from !== to) {
        // Put the address back, and replay the same move if the reader agrees.
        const delta = from - to;
        isRestoring = true;
        window.history.go(delta);
        setPending({
          proceed: () => {
            bypass.current = true;
            window.history.go(-delta);
          },
        });
        return;
      }

      // An entry the router did not stamp, so there is no distance to put back.
      const arrived = window.location.href;
      const kept = routerHref.current;
      setPending({
        proceed: () => {
          bypass.current = true;
          window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
        },
        cancel: () => {
          if (window.location.href === arrived) window.history.pushState(null, '', kept);
        },
      });
    };

    setHistoryGate(onPopState);
    return () => setHistoryGate(null);
  }, [leaves, projectId]);

  // --- Closing or reloading the tab -----------------------------------------
  useEffect(() => {
    if (!projectId) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Still required by some engines for the prompt to show at all.
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [projectId]);

  // A call that ends on its own while the question is open has answered it.
  useEffect(() => {
    if (!active) setPending(null);
  }, [active]);

  const stay = () => {
    pending?.cancel?.();
    setPending(null);
  };

  const leave = () => {
    const question = pending;
    setPending(null);
    // Hang up first, so the room hears it from us rather than from a closed
    // connection, then let the navigation through.
    active?.leave();
    question?.proceed();
  };

  return (
    <Modal
      isOpen={pending !== null}
      onClose={stay}
      title={t('live.guardTitle')}
      description={t('live.guardBody', { room: active?.roomTitle ?? '' })}
      align="center"
      flat
      icon={
        <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-positive/12 text-positive">
          <Radio className="h-5 w-5" />
          {/* The call is still going while this is open; the dot says so. */}
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-positive motion-safe:animate-pulse" />
        </span>
      }
      footer={
        <>
          {/* Staying is the safe answer and the focused one: an Enter pressed
              without reading should not hang anybody up. */}
          <Button variant="ghost" onClick={stay} autoFocus>
            {t('live.guardStay')}
          </Button>
          <Button variant="danger" onClick={leave}>
            <PhoneOff className="h-3.5 w-3.5" />
            {t('live.guardLeave')}
          </Button>
        </>
      }
    >
      <p className="text-center text-xs leading-relaxed text-content-muted">
        {t('live.guardHint')}
      </p>
    </Modal>
  );
};
