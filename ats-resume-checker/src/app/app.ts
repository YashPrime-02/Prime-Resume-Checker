import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './Components/navbar/navbar';
import { Hero } from './Components/hero/hero';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent,Hero],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('ats-resume-checker');
}
