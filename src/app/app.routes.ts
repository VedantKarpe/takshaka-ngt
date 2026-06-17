import { Routes } from '@angular/router';

/**
 * Lazy-loaded routes mirroring the original: the shloka story first, then the
 * 3D game. Keeping the game lazy keeps the (heavy) Three.js / NGT bundle out of
 * the initial story load.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./story/story.component').then(m => m.StoryComponent),
  },
  {
    path: 'game',
    loadComponent: () => import('./game/game-canvas.component').then(m => m.GameCanvasComponent),
  },
  { path: '**', redirectTo: '' },
];
