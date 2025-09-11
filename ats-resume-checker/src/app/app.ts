import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './Components/navbar/navbar';
import { Hero } from './Components/hero/hero';
import { Footer } from "./Components/footer/footer";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent,Footer],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('ats-resume-checker');
}
