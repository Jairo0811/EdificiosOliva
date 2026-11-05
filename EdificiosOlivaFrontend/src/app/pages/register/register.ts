import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Public sign-up is not offered: accounts are created by Edificios Oliva staff. */
@Component({
  selector: 'app-register',
  imports: [RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {}
