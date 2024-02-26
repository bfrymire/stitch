import { keysOf } from '@bscotch/utility';
import { ManifestView, ManifestViewContainer } from './manifest.types.mjs';

export type ViewId = keyof typeof views;
export const views = {
  'bscotch-stitch-inspector': {
    id: 'bscotch-stitch-inspector',
    name: 'Inspector',
    icon: './images/stitch-logo-mono.svg',
    type: 'tree',
  },
  'bscotch-stitch-files': {
    id: 'bscotch-stitch-files',
    name: 'Included Files',
    icon: './images/stitch-logo-mono.svg',
    type: 'tree',
  },
  'bscotch-stitch-resources': {
    id: 'bscotch-stitch-resources',
    name: 'Project',
    icon: './images/stitch-logo-mono.svg',
    type: 'tree',
  },
  'bscotch-stitch-sprite-sources': {
    id: 'bscotch-stitch-sprite-sources',
    name: 'Sprite Sources',
    icon: './images/stitch-logo-mono.svg',
    type: 'tree',
  },
} satisfies Record<string, ManifestView>;
export const viewsArray = keysOf(views).map((key) => views[key]);

export type ViewContainerId = keyof typeof viewsContainers;
export const viewsContainers = {
  'bscotch-stitch': {
    id: 'bscotch-stitch',
    title: 'Stitch',
    icon: './images/stitch-logo-mono.svg',
  },
} satisfies Record<string, ManifestViewContainer>;
export const viewsContainersArray = keysOf(viewsContainers).map(
  (key) => viewsContainers[key],
);
