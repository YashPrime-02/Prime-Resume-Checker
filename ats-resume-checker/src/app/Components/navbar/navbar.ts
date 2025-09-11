import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.html',
  imports : [CommonModule,RouterLink],
  styleUrls: ['./navbar.scss']
})
export class NavbarComponent {
  open = false; // controls menu open state

  toggleMenu() {
    this.open = !this.open;
  }

  handleLinkClick() {
    this.open = false;
  }
}
