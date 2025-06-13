// LoginPage.js
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './LoginPage.css';

function LoginPage() {
  const [satellites, setSatellites] = useState([]);
  const [selected, setSelected] = useState(null);
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Получаем список спутников
  useEffect(() => {
    setIsLoading(true);
    fetch("http://localhost:8000/satellites")
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch satellites');
        return res.json();
      })
      .then(data => {
        setSatellites(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setIsLoading(false);
      });
  }, []);

  const handleLogin = () => {
    if (!selected) return;
    
    setIsLoading(true);
    setError(null);
    fetch("http://localhost:8000/login", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: selected.name, password }),
    })
    .then(async res => {
      if (res.ok) {
        navigate("/dashboard");
      } else if (res.status === 401) {
        const msg = await res.text();
        throw new Error(msg || "Неверный пароль");
      } else if (res.status === 403) {
        const msg = await res.text();
        throw new Error(msg || "Доступ запрещён");
      } else {
        throw new Error("Ошибка входа в систему");
      }
    })
    .catch(err => {
      alert(err.message);
      setIsLoading(false);
    });
  };

  return (
    <div className="login-container">
      <div className="background-overlay"></div>
      <div className="login-card">
        <div className="login-header">
          <h2>Космическая система управления</h2>
          <p>Выберите спутник для входа в панель управления</p>
        </div>

        {isLoading && !error && (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Загрузка данных...</p>
          </div>
        )}

        {error && (
          <div className="error-message">
            <p>Ошибка: {error}</p>
            <button onClick={() => window.location.reload()}>Попробовать снова</button>
          </div>
        )}

        {!isLoading && !error && (
          <>
            <div className="satellite-list">
              {satellites.length === 0 ? (
                <p className="no-satellites">Нет доступных спутников</p>
              ) : (
                <ul>
                  {satellites.map(sat => (
                    <li 
                      key={sat.id} 
                      className={`satellite-item ${selected?.id === sat.id ? 'selected' : ''}`}
                      onClick={() => setSelected(sat)}
                    >
                      <div className="satellite-radio">
                        <input
                          type="radio"
                          name="satellite"
                          checked={selected?.id === sat.id}
                          onChange={() => setSelected(sat)}
                        />
                      </div>
                      <div className="satellite-info">
                        <h3>{sat.name}</h3>
                        <p className="satellite-description">{sat.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selected && (
              <div className="login-form">
                <h3>Вход для: <span className="satellite-name">{selected.name}</span></h3>
                <div className="input-group">
                  {error && (
                    <div className="error-message">
                      <p>{error}</p>
                    </div>
                  )}
                  <label htmlFor="password">Пароль</label>
                  <input
                    id="password"
                    type="password"
                    placeholder="Введите пароль"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleLogin()}
                  />
                </div>
                <button 
                  className="login-button"
                  onClick={handleLogin}
                  disabled={!password || isLoading}
                >
                  {isLoading ? 'Вход...' : 'Войти'}
                </button>
              </div>
            )}
          </>
        )}

        <div className="register-link">
          <span>Нет аккаунта? </span>
          <Link to="/register">Зарегистрироваться</Link>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;