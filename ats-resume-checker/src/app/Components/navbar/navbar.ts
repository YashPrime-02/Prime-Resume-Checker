import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.html',
  imports: [CommonModule, RouterLink],
  styleUrls: ['./navbar.scss']
})
export class NavbarComponent {
  open = false;

  constructor(private router: Router) {}

  toggleMenu() {
    this.open = !this.open;
  }

  handleLinkClick() {
    this.open = false;
  }

  scrollToSection(sectionId: string, route: string = '/index') {
    // Navigate first if not on the target route
    if (this.router.url !== route) {
      this.router.navigate([route]).then(() => {
        this.scrollToElement(sectionId);
      });
    } else {
      this.scrollToElement(sectionId);
    }
  }

  private scrollToElement(sectionId: string) {
    // Use setTimeout to ensure element exists in DOM
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  }
}
