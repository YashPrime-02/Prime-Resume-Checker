import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.html',
  imports : [CommonModule],
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
