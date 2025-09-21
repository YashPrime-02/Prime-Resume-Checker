import { Routes } from '@angular/router';
import { Hero } from './Components/hero/hero';
import { UploadComponent } from './Components/resume-review/upload.component/upload.component';
import { Contact } from './Components/contact/contact';
import { ResumeReviewComponent } from './Components/resume-review/resume-review';
import { AboutComponent } from './Components/about/about';

export const routes: Routes = [

  { path: '', redirectTo: 'index', pathMatch: 'full' },

  {
    path: 'index',
    component: Hero,
    data: { title: 'PRIME RESUME REVIEWER' }
  },
  {
    path: 'about',
    component: AboutComponent,
    data: { title: 'PRIME RESUME REVIEWER' }
  },

  {
    path: 'upload',
    component: UploadComponent,
    data: { title: 'Upload' }
  },
  {
    path: 'contact',
    component: Contact,
    data: { title: 'Contact' }
  },
  {
    path:'resume-review',
    component: ResumeReviewComponent,
        data: { title: 'Resume Review' },

  }

];
