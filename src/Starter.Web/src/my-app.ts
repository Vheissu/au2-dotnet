import { route } from '@aurelia/router';

@route({
  routes: [
    { path: '', redirectTo: 'workspace' },
    {
      path: 'workspace',
      id: 'workspace',
      component: import('./routes/workspace'),
      title: 'Workspace',
    },
    { path: 'guide', id: 'guide', component: import('./routes/guide'), title: 'Starter guide' },
    { path: '*path', component: import('./routes/not-found'), title: 'Page not found' },
  ],
})
export class MyApp {
  mainElement!: HTMLElement;

  focusMain() {
    this.mainElement.focus();
  }

  workspaceActive = false;
  guideActive = false;
}
