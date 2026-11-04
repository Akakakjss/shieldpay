import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup, configure } from '@testing-library/react';
configure({ asyncUtilTimeout: 10000 });
afterEach(cleanup);
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
if (!window.matchMedia)
  window.matchMedia = () => ({
    matches: false,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
  });
Element.prototype.scrollIntoView = () => {};
