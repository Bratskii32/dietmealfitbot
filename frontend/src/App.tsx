import { useState, useEffect } from 'react';
import { useTelegram } from './hooks/useTelegram';
import { api } from './api/client';
import { Onboarding } from './screens/Onboarding';
import { Home } from './screens/Home';
import { Chat } from './screens/Chat';
import { Recipes } from './screens/Recipes';
import { RecipeDetail } from './screens/RecipeDetail';
import { Progress } from './screens/Progress';
import { Settings } from './screens/Settings';
import { Paywall } from './screens/Paywall';
import { Navigation } from './components/Navigation';
import { Screen, Recipe } from './types';

type AppState = 'loading' | 'onboarding' | 'app';

export default function App() {
  const { isReady, user } = useTelegram();
  const [appState, setAppState] = useState<AppState>('loading');
  const [userName, setUserName] = useState('');
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumExpiresAt, setPremiumExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    checkUser();
  }, [isReady]);

  const loadSubscription = async () => {
    try {
      const sub = await api.getSubscription();
      setIsPremium(sub.isPremium);
      setPremiumExpiresAt(sub.premiumExpiresAt);
    } catch { /* ignore */ }
  };

  const checkUser = async () => {
    try {
      const data = await api.getUser();
      await loadSubscription();
      if (data.exists && data.user?.onboardingComplete) {
        setUserName(data.user.name || user?.first_name || 'друг');
        setIsPremium(data.user.isPremium);
        setAppState('app');
      } else {
        setAppState('onboarding');
      }
    } catch {
      setAppState('onboarding');
    }
  };

  const handleOnboardingComplete = () => {
    setUserName(user?.first_name || 'друг');
    loadSubscription();
    setAppState('app');
  };

  const handleClosePaywall = () => {
    setShowPaywall(false);
    loadSubscription();
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

  return (
    <div className="app-container">
      {screen === 'home' && (
        <Home
          userName={userName}
          isPremium={isPremium}
          onNavigate={setScreen}
          onRecipeSelect={setSelectedRecipe}
          onShowPaywall={() => setShowPaywall(true)}
        />
      )}
      {screen === 'chat' && <Chat onShowPaywall={() => setShowPaywall(true)} />}
      {screen === 'recipes' && <Recipes onRecipeSelect={setSelectedRecipe} />}
      {screen === 'progress' && <Progress />}
      {screen === 'settings' && (
        <Settings
          isPremium={isPremium}
          premiumExpiresAt={premiumExpiresAt}
          onShowPaywall={() => setShowPaywall(true)}
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
    </div>
  );
}
