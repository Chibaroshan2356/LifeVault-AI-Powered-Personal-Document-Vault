/**
 * LoginComponent — Login Page
 *
 * Standalone component. Uses Angular Reactive Forms for validation.
 * On success: navigates to /dashboard.
 * On failure: displays error message from the API response.
 */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule }           from '@angular/material/card';
import { MatFormFieldModule }      from '@angular/material/form-field';
import { MatInputModule }          from '@angular/material/input';
import { MatButtonModule }         from '@angular/material/button';
import { MatIconModule }           from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize }                from 'rxjs';

import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.component.html',
  styleUrl:    './login.component.scss',
})
export class LoginComponent implements OnInit {
  form!: FormGroup;
  isLoading   = false;
  errorMessage = '';
  hidePassword = true;

  constructor(
    private readonly fb:          FormBuilder,
    private readonly authService: AuthService,
    private readonly router:      Router,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  get emailCtrl()    { return this.form.get('email')!; }
  get passwordCtrl() { return this.form.get('password')!; }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading    = true;
    this.errorMessage = '';

    this.authService.login(this.form.value).pipe(
      finalize(() => (this.isLoading = false)),
    ).subscribe({
      next: () => this.router.navigate(['/welcome']),
      error: (err) => {
        this.errorMessage =
          err?.error?.message ||
          err?.message ||
          'Login failed. Please try again.';
      },
    });
  }
}
