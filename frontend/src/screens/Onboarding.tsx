import { useState } from 'react';
import { ProgressBar } from '../components/ProgressBar';
import { api } from '../api/client';

interface Props {
  defaultName: string;
  onComplete: () => void;
}

const ALLERGIES = [
  { id: 'gluten', label: 'Глютен' },
  { id: 'lactose', label: 'Лактоза' },
  { id: 'nuts', label: 'Орехи' },
  { id: 'seafood', label: 'Морепродукты' },
  { id: 'pork', label: 'Свинина' },
  { id: 'none', label: 'Нет ограничений' },
];

export function Onboarding({ defaultName, onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState(defaultName);
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState('');
  const [activityLevel, setActivityLevel] = useState('');
  const [mealsPerDay, setMealsPerDay] = useState(0);
  const [allergies, setAllergies] = useState<string[]>([]);

  const toggleAllergy = (id: string) => {
    if (id === 'none') {
      setAllergies(['none']);
      return;
    }
    setAllergies((prev) => {
      const filtered = prev.filter((a) => a !== 'none');
      return filtered.includes(id) ? filtered.filter((a) => a !== id) : [...filtered, id];
    });
  };

  const handleFinish = async () => {
    setLoading(true);
    setError('');
    try {
      await api.saveOnboarding({
        name,
        age: Number(age),
        gender,
        height: Number(height),
        weight: Number(weight),
        goal,
        activityLevel,
        mealsPerDay,
        allergies,
      });
      await api.generatePlan();
      onComplete();
    } catch {
      setError('Попробуй через минуту');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="spinner-container">
        <div className="spinner" />
        <p style={{ fontSize: 16, color: 'var(--text-secondary)' }}>
          AI составляет твой рацион...<br />обычно 10–15 секунд
        </p>
      </div>
    );
  }

  return (
    <div className="screen-content">
      <ProgressBar current={step} total={5} />

      {step === 1 && (
        <>
          <h2 style={{ marginBottom: 20, fontSize: 22 }}>Основные данные</h2>
          <div className="form-group">
            <label>Имя</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Твоё имя" />
          </div>
          <div className="form-group">
            <label>Возраст</label>
            <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="14–99" min={14} max={99} />
          </div>
          <div className="form-group">
            <label>Пол</label>
            <div className="options-row">
              <button className={`btn-option ${gender === 'male' ? 'selected' : ''}`} onClick={() => setGender('male')}>Мужской</button>
              <button className={`btn-option ${gender === 'female' ? 'selected' : ''}`} onClick={() => setGender('female')}>Женский</button>
            </div>
          </div>
          <button className="btn-primary" disabled={!name || !age || !gender} onClick={() => setStep(2)}>Далее</button>
        </>
      )}

      {step === 2 && (
        <>
          <h2 style={{ marginBottom: 20, fontSize: 22 }}>Параметры тела</h2>
          <div className="form-group">
            <label>Рост (см)</label>
            <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="100–250" min={100} max={250} />
          </div>
          <div className="form-group">
            <label>Вес (кг)</label>
            <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="30–300" min={30} max={300} />
          </div>
          <div className="options-row" style={{ gap: 12 }}>
            <button className="btn-secondary" onClick={() => setStep(1)}>Назад</button>
            <button className="btn-primary" disabled={!height || !weight} onClick={() => setStep(3)}>Далее</button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h2 style={{ marginBottom: 20, fontSize: 22 }}>Цель</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {[
              { id: 'lose', label: 'Похудеть' },
              { id: 'gain', label: 'Набрать массу' },
              { id: 'maintain', label: 'Поддержать вес' },
            ].map((g) => (
              <button key={g.id} className={`btn-option ${goal === g.id ? 'selected' : ''}`} onClick={() => setGoal(g.id)} style={{ flex: 'none' }}>
                {g.label}
              </button>
            ))}
          </div>
          <div className="options-row" style={{ gap: 12 }}>
            <button className="btn-secondary" onClick={() => setStep(2)}>Назад</button>
            <button className="btn-primary" disabled={!goal} onClick={() => setStep(4)}>Далее</button>
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <h2 style={{ marginBottom: 20, fontSize: 22 }}>Активность и питание</h2>
          <div className="form-group">
            <label>Уровень активности</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { id: 'sedentary', label: 'Сидячий' },
                { id: 'moderate', label: 'Умеренный' },
                { id: 'active', label: 'Активный' },
              ].map((a) => (
                <button key={a.id} className={`btn-option ${activityLevel === a.id ? 'selected' : ''}`} onClick={() => setActivityLevel(a.id)} style={{ flex: 'none' }}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Приёмов пищи в день</label>
            <div className="options-row">
              {[3, 4, 5].map((n) => (
                <button key={n} className={`btn-option ${mealsPerDay === n ? 'selected' : ''}`} onClick={() => setMealsPerDay(n)}>{n}</button>
              ))}
            </div>
          </div>
          <div className="options-row" style={{ gap: 12 }}>
            <button className="btn-secondary" onClick={() => setStep(3)}>Назад</button>
            <button className="btn-primary" disabled={!activityLevel || !mealsPerDay} onClick={() => setStep(5)}>Далее</button>
          </div>
        </>
      )}

      {step === 5 && (
        <>
          <h2 style={{ marginBottom: 20, fontSize: 22 }}>Ограничения</h2>
          <div className="form-group">
            <label>Аллергии и исключения</label>
            <div className="options-grid">
              {ALLERGIES.map((a) => (
                <button key={a.id} className={`btn-option ${allergies.includes(a.id) ? 'selected' : ''}`} onClick={() => toggleAllergy(a.id)}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="error-text">{error}</p>}
          <div className="options-row" style={{ gap: 12 }}>
            <button className="btn-secondary" onClick={() => setStep(4)}>Назад</button>
            <button className="btn-primary" onClick={handleFinish}>Создать мой рацион 🚀</button>
          </div>
        </>
      )}
    </div>
  );
}
