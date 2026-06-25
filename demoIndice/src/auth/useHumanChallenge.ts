import { useCallback, useEffect, useMemo, useState } from 'react';
import { demoAuthApi } from './demoAuthApi';
import type { HumanChallenge, HumanChallengePurpose } from './authTypes';

export function useHumanChallenge(purpose: HumanChallengePurpose) {
  const [challenge, setChallenge] = useState<HumanChallenge | null>(null);
  const [challengeAnswer, setChallengeAnswer] = useState('');
  const [website, setWebsite] = useState('');
  const [isChallengeLoading, setIsChallengeLoading] = useState(true);
  const [challengeError, setChallengeError] = useState('');

  const reloadChallenge = useCallback(async () => {
    setIsChallengeLoading(true);
    setChallengeAnswer('');
    setWebsite('');
    setChallengeError('');

    try {
      setChallenge(await demoAuthApi.getChallenge(purpose));
    } catch {
      setChallenge(null);
      setChallengeError('Security check could not load. Refresh and try again.');
    } finally {
      setIsChallengeLoading(false);
    }
  }, [purpose]);

  useEffect(() => {
    let active = true;

    demoAuthApi.getChallenge(purpose)
      .then((nextChallenge) => {
        if (!active) return;
        setChallenge(nextChallenge);
        setChallengeError('');
      })
      .catch(() => {
        if (!active) return;
        setChallenge(null);
        setChallengeError('Security check could not load. Refresh and try again.');
      })
      .finally(() => {
        if (active) setIsChallengeLoading(false);
      });

    return () => {
      active = false;
    };
  }, [purpose]);

  const humanCheck = useMemo(() => ({
    challengeToken: challenge?.token ?? '',
    challengeAnswer,
    website,
  }), [challenge, challengeAnswer, website]);

  return {
    challenge,
    challengeAnswer,
    challengeError,
    humanCheck,
    isChallengeLoading,
    reloadChallenge,
    setChallengeAnswer,
    setWebsite,
    website,
  };
}
