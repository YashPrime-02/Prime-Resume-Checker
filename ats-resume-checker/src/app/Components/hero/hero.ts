import { Component, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-hero',
  standalone: true, // ✅ mark as standalone if you want to import it directly
  imports: [RouterLink],
  templateUrl: './hero.html',
  styleUrl: './hero.scss'
})
export class Hero {
  scrollPercent = 0;
  private ballValue = 0;

  // ✅ Correct HostListener usage
// In your component
@HostListener('window:scroll', [])
onWindowScroll() {
  const container = document.querySelector('.why-us-points') as HTMLElement;
  const scrollIndicator = document.querySelector('.scroll-ball') as HTMLElement;

  if (container && scrollIndicator) {
    const rect = container.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    // calculate percentage scrolled within the container
    let scrollPercent = ((windowHeight - rect.top) / (rect.height + windowHeight)) * 100;
    scrollPercent = Math.min(Math.max(scrollPercent, 0), 100); // clamp 0-100%

    scrollIndicator.style.top = `${scrollPercent}%`;
  }
}

}
