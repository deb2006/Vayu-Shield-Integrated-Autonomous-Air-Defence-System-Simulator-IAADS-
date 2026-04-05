import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => {
    try {
      // Provide clearer error logging for bootstrap failures
      console.error('BOOTSTRAP ERROR:', err && err.message ? err.message : err);
      if (err && err.stack) console.error(err.stack);
      // Angular may wrap original error
      if (err && err.ngOriginalError) console.error('ngOriginalError:', err.ngOriginalError);
      // Dump full object for inspection
      console.error('BOOTSTRAP ERROR OBJECT:', err);
    } catch (e) {
      console.error('Error while logging bootstrap error', e);
    }
  });
