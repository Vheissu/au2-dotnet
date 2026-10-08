import Aurelia from 'aurelia';
import { RouterConfiguration } from '@aurelia/router';
import { MyApp } from './my-app';
import './styles.css';

Promise.resolve(
  Aurelia.register(
    RouterConfiguration.customize({ useUrlFragmentHash: false, activeClass: 'active' }),
  )
    .app(MyApp)
    .start(),
).catch((error: unknown) => {
  console.error('Unable to start the application', error);
  const host = document.querySelector('my-app');
  if (host) host.textContent = 'The app could not start. Please refresh the page.';
});
