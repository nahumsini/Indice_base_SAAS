import { ArrowRight, Building2, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { useHumanChallenge } from '../auth/useHumanChallenge';
import { AuthLayout } from '../components/auth/AuthLayout';
import { HumanCheckFields } from '../components/auth/HumanCheckFields';
import { PasswordField } from '../components/ui/PasswordField';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { TextField } from '../components/ui/TextField';

const isValidEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value.trim());
const toUppercaseName = (value: string) => value.toUpperCase();

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const human = useHumanChallenge('register');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = companyName.trim().length >= 2
    && isValidEmail(email)
    && password.length >= 8
    && confirmPassword.length >= 8
    && Boolean(human.challenge)
    && human.challengeAnswer.trim().length > 0
    && !human.isChallengeLoading
    && !isSubmitting;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!canSubmit) {
      setError('Company, valid email, 8 character password, and security answer are required.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Password confirmation does not match.');
      return;
    }

    try {
      setIsSubmitting(true);
      await register({
        companyName,
        email: email.trim(),
        password,
        ...human.humanCheck,
      });
      navigate('/home', { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create demo account.');
      void human.reloadChallenge();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="form-heading">
        <span>New workspace</span>
        <h2>Register</h2>
        <p>Create an account for a private demo workspace.</p>
      </div>
      <form className="auth-form" onSubmit={handleSubmit}>
        <TextField
          label="Company name"
          name="companyName"
          value={companyName}
          onChange={(event) => setCompanyName(toUppercaseName(event.target.value))}
          icon={Building2}
          autoCapitalize="characters"
          autoComplete="organization"
          placeholder="Your company"
        />
        <TextField
          label="Work email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          icon={Mail}
          autoComplete="email"
          placeholder="you@company.com"
        />
        <PasswordField
          label="Password"
          name="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword((current) => !current)}
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirm password"
          name="confirmPassword"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword((current) => !current)}
          autoComplete="new-password"
        />
        <HumanCheckFields
          answer={human.challengeAnswer}
          error={human.challengeError}
          isLoading={human.isChallengeLoading}
          question={human.challenge?.question}
          website={human.website}
          onAnswerChange={human.setChallengeAnswer}
          onWebsiteChange={human.setWebsite}
        />
        {error ? <div className="form-error">{error}</div> : null}
        <PrimaryButton type="submit" disabled={isSubmitting || human.isChallengeLoading}>
          {isSubmitting ? 'Creating demo...' : 'Create demo account'}
          {!isSubmitting ? <ArrowRight aria-hidden /> : null}
        </PrimaryButton>
      </form>
      <p className="auth-switch">
        Already have demo access? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
