/**
 * RegisterComponent — Registration Page
 *
 * Standalone component. Password confirmation validated client-side.
 * On success: navigates to /auth/login with a success message.
 */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule }           from '@angular/material/card';
import { MatFormFieldModule }      from '@angular/material/form-field';
import { MatInputModule }          from '@angular/material/input';
import { MatButtonModule }         from '@angular/material/button';
import { MatIconModule }           from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize }                from 'rxjs';

import { AuthService } from '../services/auth.service';

/** Cross-field validator: password === confirmPassword */
function passwordMatch(group: AbstractControl): ValidationErrors | null {
  const pw  = group.get('password')?.value;
  const cpw = group.get('confirmPassword')?.value;
  return pw === cpw ? null : { passwordMismatch: true };
}

/** Regex validator matching the backend Zod password policy */
function strongPassword(ctrl: AbstractControl): ValidationErrors | null {
  const v = ctrl.value as string;
  if (!v) return null;
  const errors: ValidationErrors = {};
  if (!/[A-Z]/.test(v)) errors['noUppercase']  = true;
  if (!/[a-z]/.test(v)) errors['noLowercase']  = true;
  if (!/[0-9]/.test(v)) errors['noDigit']      = true;
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(v)) errors['noSpecial'] = true;
  return Object.keys(errors).length ? errors : null;
}

@Component({
  selector: 'app-register',
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
  templateUrl: './register.component.html',
  styleUrl:    './register.component.scss',
})
export class RegisterComponent implements OnInit {
  form!: FormGroup;
  isLoading    = false;
  errorMessage = '';
  successMessage = '';
  hidePassword = true;

  constructor(
    private readonly fb:          FormBuilder,
    private readonly authService: AuthService,
    private readonly router:      Router,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group(
      {
        fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
        email:    ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(8), strongPassword]],
        confirmPassword: ['', Validators.required],
      },
      { validators: passwordMatch },
    );
  }

  get fullNameCtrl()       { return this.form.get('fullName')!; }
  get emailCtrl()          { return this.form.get('email')!; }
  get passwordCtrl()       { return this.form.get('password')!; }
  get confirmPasswordCtrl(){ return this.form.get('confirmPassword')!; }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading    = true;
    this.errorMessage = '';

    const { fullName, email, password } = this.form.value as {
      fullName: string; email: string; password: string;
    };

    this.authService.register({ fullName, email, password }).pipe(
      finalize(() => (this.isLoading = false)),
    ).subscribe({
      next: (res) => {
        this.successMessage = res.message ?? 'Registration successful!';
        setTimeout(() => this.router.navigate(['/auth/login']), 1500);
      },
      error: (err) => {
        this.errorMessage = err?.error?.message ?? 'Registration failed. Please try again.';
      },
    });
  }
}
