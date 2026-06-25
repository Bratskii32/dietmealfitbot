import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from './hooks/useTelegram';
import { api } from './api/client';
import { isTelegramWebApp, clearStoredToken } from './utils/telegram';
import { Onboarding } from './screens/Onboarding';
import { Home } from './screens/Home';
import { Chat } from './screens/Chat';
import { Recipes } from './screens/Recipes';
import { RecipeDetail } from './screens/RecipeDetail';
import { Progress } from './screens/Progress';
import { Settings } from './screens/Settings';
import { Paywall } from './screens/Paywall';
import { PlanHistory } from './screens/PlanHistory';
import { PreferencesSheet } from './components/PreferencesSheet';
import { Navigation } from './components/Navigation';
import { Screen, Recipe, WeekPlan } from './types';

type AppState = 'loading' | 'onboarding' | 'app';

export default function App() {
  const { isReady, user } = useTelegram();
  const navigate = useNavigate();
  const [appState, setAppState] = useState<AppState>('loading');
  const [userName, setUserName] = useState('');
  const [daysAway, setDaysAway] = useState(0);
  const [screen, setScreen] = useState<Screen>('home');
  const [homeDayIndex, setHomeDayIndex] = useState(0);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumExpiresAt, setPremiumExpiresAt] = useState<string | null>(null);
  const [subscriptionCancelled, setSubscriptionCancelled] = useState(false);
  const [preferencesPrompted, setPreferencesPrompted] = useState(true);
  const [eatingStyle, setEatingStyle] = useState<string | null>(null);
  const [cookingTime, setCookingTime] = useState<string | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showPlanHistory, setShowPlanHistory] = useState(false);
  const [planVersion, setPlanVersion] = useState(0);

  useEffect(() => {
    if (!isReady) return;
    checkUser();
  }, [isReady]);

  const loadSubscription = async () => {
    try {
      const sub = await api.getSubscription();
      setIsPremium(sub.isPremium);
      setPremiumExpiresAt(sub.premiumExpiresAt);
      setSubscriptionCancelled(!!sub.cancelled);
    } catch { /* ignore */ }
  };

  const checkUser = async () => {
    try {
      const data = isTelegramWebApp() ? await api.getUser() : await api.authMe();
      await loadSubscription();
      if (data.exists && data.user?.onboardingComplete) {
        setUserName(data.user.name || user?.first_name || data.user.email?.split('@')[0] || 'друг');
        setIsPremium(data.user.isPremium);
        setDaysAway(data.daysAway || 0);
        setPreferencesPrompted(!!data.user.preferencesPrompted);
        setEatingStyle(data.user.eatingStyle || null);
        setCookingTime(data.user.cookingTime || null);
        setAppState('app');
      } else {
        setAppState('onboarding');
      }
    } catch {
      if (!isTelegramWebApp()) {
        clearStoredToken();
        navigate('/login', { replace: true });
        return;
      }
      setAppState('onboarding');
    }
  };

  const handleOnboardingComplete = () => {
    setUserName(user?.first_name || 'друг');
    setPreferencesPrompted(false);
    loadSubscription();
    checkUser();
    setAppState('app');
  };

  const handleClosePaywall = () => {
    setShowPaywall(false);
    loadSubscription();
  };

  const handlePreferencesSaved = (_plan: WeekPlan) => {
    setPreferencesPrompted(true);
    setPlanVersion((v) => v + 1);
  };

  const handlePreferencesSkip = () => {
    setPreferencesPrompted(true);
  };

  if (appState === 'loading') {
    return (
      <div className="spinner-container">
        <div className="spinner" />
      </div>
    );
  }

  if (appState === 'onboarding') {
    return (
      <div className="app-container">
        <Onboarding
          defaultName={user?.first_name || ''}
          onComplete={handleOnboardingComplete}
        />
      </div>
    );
  }

  if (selectedRecipe) {
    return (
      <div className="app-container">
        <RecipeDetail recipe={selectedRecipe} onBack={() => setSelectedRecipe(null)} />
      </div>
    );
  }

  if (showPlanHistory) {
    return (
      <div className="app-container">
        <PlanHistory
          onClose={() => setShowPlanHistory(false)}
          onRecipeSelect={setSelectedRecipe}
        />
      </div>
    );
  }

  return (
    <div className="app-container">
      {screen === 'home' && (
        <Home
          userName={userName}
          isPremium={isPremium}
          daysAway={daysAway}
          preferencesPrompted={preferencesPrompted}
          planVersion={planVersion}
          dayIndex={homeDayIndex}
          onDayIndexChange={setHomeDayIndex}
          onNavigate={setScreen}
          onRecipeSelect={setSelectedRecipe}
          onShowPaywall={() => setShowPaywall(true)}
          onOpenPreferences={() => setShowPreferences(true)}
        />
      )}
      {screen === 'chat' && <Chat onShowPaywall={() => setShowPaywall(true)} />}
      {screen === 'recipes' && <Recipes onRecipeSelect={setSelectedRecipe} />}
      {screen === 'progress' && <Progress />}
      {screen === 'settings' && (
        <Settings
          isPremium={isPremium}
          premiumExpiresAt={premiumExpiresAt}
          subscriptionCancelled={subscriptionCancelled}
          onShowPaywall={() => setShowPaywall(true)}
          onSubscriptionChange={loadSubscription}
          onConfigureRation={() => setShowPreferences(true)}
          onOpenPlanHistory={() => {
            if (isPremium) setShowPlanHistory(true);
            else setShowPaywall(true);
          }}
        />
      )}

      <Navigation current={screen} onNavigate={setScreen} />

      {showPaywall && (
        <Paywall
          onClose={handleClosePaywall}
          isPremium={isPremium}
          premiumExpiresAt={premiumExpiresAt}
        />
      )}

      {showPreferences && (
        <PreferencesSheet
          initialEatingStyle={eatingStyle}
          initialCookingTime={cookingTime}
          onClose={() => setShowPreferences(false)}
          onSaved={handlePreferencesSaved}
          onSkip={handlePreferencesSkip}
          showSkip={!preferencesPrompted}
        />
      )}
    </div>
  );
}
