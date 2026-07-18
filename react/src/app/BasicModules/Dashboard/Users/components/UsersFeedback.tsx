interface UsersFeedbackProps {
  error: string;
  isLoading: boolean;
  loadingLabel: string;
}

export function UsersFeedback({ error, isLoading, loadingLabel }: UsersFeedbackProps) {
  return (
    <>
      {isLoading ? (
        <div role="status" aria-live="polite" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
          {loadingLabel}
        </div>
      ) : null}
      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      ) : null}
    </>
  );
}
