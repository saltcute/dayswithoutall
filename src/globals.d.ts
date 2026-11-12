import type { Stage } from "./engine/stage";

declare global {
  interface Window {
    /** Injected by the Worker. */
    __DAY__?: number;
    __TODAY__?: number;
    __HOST_SUFFIX__?: string;
    __LANG__?: string;
    /** Exposed for test scripts. */
    __stage?: Stage;
    __ready?: boolean;
    /** Set by test scripts to keep the start screen up. */
    __noAutoplay?: boolean;
  }
}
export {};
