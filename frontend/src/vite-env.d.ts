/// <reference types="vite/client" />

// `cytoscape-cose-bilkent` ships no type declarations (unlike `cytoscape-dagre`,
// which bundles its own `index.d.ts`), and there's no `@types/cytoscape-cose-bilkent`
// package. It's a cytoscape layout extension registered via `cytoscape.use(...)`
// (see `RelationshipMap.tsx`); its default export is the extension-registration
// function cytoscape expects.
declare module 'cytoscape-cose-bilkent' {
  import type { Ext } from 'cytoscape'

  const register: Ext
  export default register
}
