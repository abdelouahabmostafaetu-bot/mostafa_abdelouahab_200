import { SignIn } from '@clerk/nextjs';

export const metadata = {
  title: 'Sign in',
};

export default function SignInPage() {
  return (
    <div className="min-h-screen pt-20 pb-20 flex items-start justify-center px-4">
      <SignIn />
    </div>
  );
}
