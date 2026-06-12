import { useState, useEffect } from 'react';
import { useTelegram } from './hooks/useTelegram';
import { api } from './api/client';
import { Onboarding } from './screens/Onboarding';
import { Home } from './screens/Home';
import { Chat } from './screens/Chat';
import { Recipes } from './screens/Recipes';
import { RecipeDetail } from './screens/RecipeDetail';
import { Progress } from './screens/Progress';
import { Premium } from './screens/Premium';
import { Navigation } from './components/Navigation';
import { Screen, Recipe } from './types';

type AppState = 'loading' | 'onboarding' | 'app';

export default function App() {
  const { isReady, user } = useTelegram();
  const [appState, setAppState] = useState<AppState>('loading');
  const [userName, setUserName] = useState('');
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showPremium, setShowPremium] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    checkUser();
  }, [isReady]);

  const checkUser = async () => {
    try {
      const data = await api.getUser();
      if (data.exists && data.user?.onboardingComplete) {
        setUserName(data.user.name || user?.first_name || 'друг');
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
    setAppState('app');
  };

  const handleRecipeSelect = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
  };

  const handleBackFromRecipe = () => {
    setSelectedRecipe(null);
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
        <RecipeDetail recipe={selectedRecipe} onBack={handleBackFromRecipe} />
      </div>
    );
  }

  return (
    <div className="app-container">
      {screen === 'home' && (
        <Home
          userName={userName}
          onNavigate={setScreen}
          onRecipeSelect={handleRecipeSelect}
          onShowPremium={() => setShowPremium(true)}
        />
      )}
      {screen === 'chat' && <Chat onShowPremium={() => setShowPremium(true)} />}
      {screen === 'recipes' && <Recipes onRecipeSelect={handleRecipeSelect} />}
      {screen === 'progress' && <Progress />}

      <Navigation current={screen} onNavigate={setScreen} />

      {showPremium && <Premium onClose={() => setShowPremium(false)} />}
    </div>
  );
}
