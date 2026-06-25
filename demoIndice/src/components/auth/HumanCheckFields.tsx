import { ShieldCheck } from 'lucide-react';
import { TextField } from '../ui/TextField';

type HumanCheckFieldsProps = {
  answer: string;
  error: string;
  isLoading: boolean;
  question?: string;
  website: string;
  onAnswerChange: (value: string) => void;
  onWebsiteChange: (value: string) => void;
};

export function HumanCheckFields({
  answer,
  error,
  isLoading,
  question,
  website,
  onAnswerChange,
  onWebsiteChange,
}: HumanCheckFieldsProps) {
  return (
    <>
      <TextField
        label="Security check"
        name="challengeAnswer"
        value={answer}
        onChange={(event) => onAnswerChange(event.target.value)}
        icon={ShieldCheck}
        inputMode="numeric"
        autoComplete="off"
        disabled={isLoading || !question}
        placeholder={isLoading ? 'Loading check...' : question}
        error={error}
      />
      <div className="bot-field" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => onWebsiteChange(event.target.value)}
        />
      </div>
    </>
  );
}
