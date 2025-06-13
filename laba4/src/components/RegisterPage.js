import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './LoginPage.css';

function RegisterPage() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [desc, setDesc] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const validateInputs = () => {
    if (!name || !password) {
      return "Имя и пароль обязательны";
    }
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(name)) {
      return "Имя должно содержать 3-20 символов: буквы, цифры, '-', '_'";
    }
    if (password.length < 6) {
      return "Пароль должен содержать минимум 6 символов";
    }
    if (desc.length > 200) {
      return "Описание не должно превышать 200 символов";
    }
    return null;
  };

  const handleRegister = () => {
    const validationError = validateInputs();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);

    fetch("http://localhost:8000/register", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password, description: desc })
    })
      .then(res => {
        if (res.ok) {
          alert("Регистрация успешна");
          setName("");
          setPassword("");
          setDesc("");
        } else {
          throw new Error('Ошибка регистрации');
        }
      })
      .catch(err => {
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <div className="login-container">
      <div className="background-overlay"></div>
      <div className="register-card">
        <div className="login-header">
          <h2>Регистрация нового спутника</h2>
          <p>Заполните данные для регистрации в системе</p>
        </div>

        <div className="register-form">
          <div className="input-group">
            <label htmlFor="name">Имя спутника</label>
            <input
              id="name"
              type="text"
              placeholder="Введите имя спутника"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Пароль</label>
            <input
              id="password"
              type="password"
              placeholder="Введите пароль"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label htmlFor="description">Описание</label>
            <textarea
              id="description"
              placeholder="Введите описание спутника"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows="4"
            />
          </div>

          {error && (
            <div className="error-message">
              <p>{error}</p>
            </div>
          )}

          <button
            className="login-button"
            onClick={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? 'Регистрация...' : 'Зарегистрировать'}
          </button>
        </div>

        <div className="register-link">
          <span>Уже есть аккаунт? </span>
          <Link to="/login">Войти</Link>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
