import { SignUp } from '@clerk/nextjs';

export const metadata = {
  title: 'Sign up',
};

export default function SignUpPage() {
  return (
    <div className="min-h-screen pt-20 pb-20 flex items-start justify-center px-4">
      <SignUp />
    </div>
  );
}
