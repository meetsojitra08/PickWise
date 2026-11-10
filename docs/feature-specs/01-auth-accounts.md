# Feature: Authentication & Accounts

**Phase / steps:** P1 (P1-S1 to P1-S6) · **Depends on:** Docker, API conventions · **Status:** Not started

## 1. Purpose
Let people register and sign in securely so personal features (wishlist, saved comparisons, reviews, AI history) work, and so admins can access the dashboard.

## 2. User stories
- As a visitor, I want to create an account so I can save products and comparisons.
- As a customer, I want to log in and out safely on any device.
- As an admin, I want a protected area only I can open.

## 3. Functional requirements
1. Must: register with name, email, password (+ confirmation); new users get role `customer`.
2. Must: login, logout, and "who am I" (`/auth/me`) using Sanctum cookie auth.
3. Must: deactivated users (`is_active = false`) cannot log in.
4. Must: role middleware protects `/admin/*`; policies protect owned data.
5. Must: frontend route guards (`RequireAuth`, `RequireAdmin`) for UX; the API is the real gate.
6. Should: "remember me", and a friendly redirect back to the page the user came from.
7. Should: email verification (can be skipped for MVP; mail goes to Mailpit in dev).

## 4. UI
- `/login`, `/register`: single-column forms, inline field errors, password show/hide, submit button shows pending state.
- Header: "Log in" / user menu (Account, Admin if admin, Log out).
- States: pending, field errors, wrong credentials ("Email or password is incorrect."), throttled ("Too many attempts. Try again in a minute.").

## 5. API & data
`POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` · table `users`.

## 6. Validation & rules
- Name 2 to 120 chars. Email valid and unique (case-insensitive). Password ≥ 8 chars, confirmed.
- Login throttle: 5/min per IP+email. Register: 5/hour per IP.
- Regenerate the session on login; invalidate on logout.
- Never reveal whether an email exists on login failure.

## 7. Edge cases
- Session expires while using the app → API returns 401 → frontend redirects to login and returns after.
- Double-submit of the register form.
- Logged-in user visits `/login` → redirect home.

## 8. Acceptance criteria
- [ ] A new user can register, is logged in, and `/auth/me` returns role `customer`.
- [ ] Wrong password returns 422 with a generic message; the 6th attempt in a minute returns 429.
- [ ] A customer calling any `/admin/*` endpoint gets 403.
- [ ] A deactivated user cannot log in.
- [ ] No token or password appears in `localStorage` or responses.

## 9. Tests
- Backend: register success/validation, login success/failure/throttle, logout, role middleware, inactive user.
- Frontend: form validation messages, guard redirects.

## 10. Out of scope
Social login, two-factor auth, password reset emails (add later if time allows).
