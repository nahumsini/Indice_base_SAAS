import { ArrowRight, Building2, Mail } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { useHumanChallenge } from '../auth/useHumanChallenge';
import { AuthLayout } from '../components/auth/AuthLayout';
import { HumanCheckFields } from '../components/auth/HumanCheckFields';
import { loginCopy } from '../components/auth/loginCopy';
import { PasswordField } from '../components/ui/PasswordField';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { TextField } from '../components/ui/TextField';

const isValidEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value.trim());

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const human = useHumanChallenge('login');
  const [company, setCompany] = useState('Indice Demo');
  const [email, setEmail] = useState('demo@indice.com');
  const [password, setPassword] = useState('demo1234');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const emailError = useMemo(() => (
    email.trim() && !isValidEmail(email) ? 'Enter a valid email address.' : ''
  ), [email]);

  const canSubmit = company.trim().length > 1
    && isValidEmail(email)
    && password.trim().length >= 6
    && Boolean(human.challenge)
    && human.challengeAnswer.trim().length > 0
    && !human.isChallengeLoading
    && !isSubmitting;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!canSubmit) {
      setError('Enter company, valid email, password, and the security answer.');
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await login({
        company,
        email: email.trim(),
        password,
        ...human.humanCheck,
      });

      if (result.kind === 'authenticated') {
        navigate('/home-panel/profile', { replace: true });
        return;
      }

      if (result.kind === 'redirect') {
        navigate('/company-route', { state: { route: result.route, email: email.trim() } });
        return;
      }

      setError('Company was not found. Register a new demo company to continue.');
      void human.reloadChallenge();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to sign in.');
      void human.reloadChallenge();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="form-heading">
        <span>{loginCopy.accessBadge}</span>
        <h2>{loginCopy.welcomeTitle}</h2>
        <p>{loginCopy.welcomeText}</p>
      </div>
      <form className="auth-form" onSubmit={handleSubmit}>
        <TextField
          label={loginCopy.companyLabel}
          name="company"
          value={company}
          onChange={(event) => setCompany(event.target.value)}
          icon={Building2}
          autoComplete="organization"
          placeholder={loginCopy.companyPlaceholder}
        />
        <TextField
          label={loginCopy.emailLabel}
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          icon={Mail}
          error={emailError}
          autoComplete="email"
          placeholder={loginCopy.emailPlaceholder}
        />
        <PasswordField
          label={loginCopy.passwordLabel}
          name="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword((current) => !current)}
          autoComplete="current-password"
          placeholder={loginCopy.passwordPlaceholder}
          action={<button type="button" className="forgot-password-link">{loginCopy.forgotPassword}</button>}
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
          {isSubmitting ? loginCopy.signingIn : loginCopy.signIn}
          {!isSubmitting ? <ArrowRight aria-hidden /> : null}
        </PrimaryButton>
      </form>
      <div className="inside-panel">
        <p>{loginCopy.insideTitle}</p>
        <ul>
          {loginCopy.insideItems.map((item) => (
            <li key={item}>
              <span aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <p className="auth-switch">
        New demo company? <Link to="/register">Create demo account</Link>
      </p>
    </AuthLayout>
  );
}
