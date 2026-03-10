import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';
import { withComponentInputBinding, withHashLocation } from '@angular/router';
import { provideFileRouter, requestContextInterceptor } from '@analogjs/router';
import { isGitHubPagesBuild } from './shared/github-pages-data';

const routerFeatures = isGitHubPagesBuild
  ? [withComponentInputBinding(), withHashLocation()]
  : [withComponentInputBinding()];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideFileRouter(...routerFeatures),
    provideHttpClient(
      withFetch(),
      withInterceptors([requestContextInterceptor])
    ),
    provideClientHydration(),
  ],
};
