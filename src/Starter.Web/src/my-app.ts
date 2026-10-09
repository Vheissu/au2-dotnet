import { route } from '@aurelia/router';

@route({
  // The router appends this to each route title: "Workspace | Aurelia + .NET Starter".
  title: 'Aurelia + .NET Starter',
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
  workspaceActive = false;
  guideActive = false;

  focusMain() {
    this.mainElement.focus();
  }
}
