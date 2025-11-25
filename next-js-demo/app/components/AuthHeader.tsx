'use client';

import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
// TODO: Uncomment when admin dashboard is ready
// import AdminHeaderLink from './AdminHeaderLink';

export default function AuthHeader() {
  return (
    <header>
      <SignedOut>
        <SignInButton />
        <SignUpButton />
      </SignedOut>
      <SignedIn>
        {/* TODO: Uncomment when admin dashboard is ready */}
        {/* <AdminHeaderLink /> */}
        <UserButton />
      </SignedIn>
    </header>
  );
}
