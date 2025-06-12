import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

function Dashboard() {
  const [satelliteName, setSatelliteName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('send');
  const [rawData, setRawData] = useState('');
  const [sentMessage, setSentMessage] = useState('');
  const [decryptedDataList, setDecryptedDataList] = useState([]);
  const [selectedData, setSelectedData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [logsList, setLogsList] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:8000/dashboard", {
      credentials: 'include'
    })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error("Unauthorized");
      })
      .then(data => setSatelliteName(data.msg.replace("Welcome, ", "").replace("! This is a protected dashboard.", "")))
      .catch(() => navigate("/login"));
  }, [navigate]);

  const handleLogout = async () => {
    await fetch("http://localhost:8000/logout", {
      method: "POST",
      credentials: "include"
    });
    navigate("/login");
  };

  const handleSendData = async () => {
    setSentMessage('');
    try {
      const response = await fetch("http://localhost:8000/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ raw_data: rawData })
      });

      const result = await response.json();
      if (response.ok) {
        setSentMessage("✅ Данные успешно отправлены");
        setRawData('');
      } else {
        setSentMessage("❌ Ошибка: " + result.detail);
      }
    } catch (err) {
      setSentMessage("❌ Ошибка при отправке");
    }
  };

  const loadDecryptedData = async () => {
    try {
      const response = await fetch("http://localhost:8000/encrypted", {
        credentials: 'include'
      });
      if (response.ok) {
        const result = await response.json();
        setDecryptedDataList(result.entries);
      } else {
        setDecryptedDataList([]);
      }
    } catch (err) {
      console.error("Ошибка при загрузке данных:", err);
    }
  };


  useEffect(() => {
    if (activeTab === 'view') {
        loadDecryptedData();
    } else if (activeTab === 'logs') {
        loadLogsData();
    }
    }, [activeTab]);

   const handleRowClick = (item) => {
    setSelectedData(item);
    setEditedData(item.data);
    setEditMode(true);
  };

  const handleUpdateData = async () => {
    if (!selectedData) return;
    
    setIsUpdating(true);
    try {
      const response = await fetch(`http://localhost:8000/encrypted/${selectedData.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ new_data: editedData })
      });

      if (response.ok) {
        await loadDecryptedData();
        setSelectedData(null);
        setEditMode(false);
      } else {
        const result = await response.json();
        alert("Ошибка при обновлении: " + (result.detail || "Неизвестная ошибка"));
      }
    } catch (err) {
      console.error("Ошибка при обновлении данных:", err);
      alert("Ошибка при обновлении данных");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteData = async () => {
    if (!selectedData || !window.confirm("Вы уверены, что хотите удалить эту запись?")) return;
    
    try {
      const response = await fetch(`http://localhost:8000/encrypted/${selectedData.id}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (response.ok) {
        await loadDecryptedData();
        setSelectedData(null);
        setEditMode(false);
      } else {
        const result = await response.json();
        alert("Ошибка при удалении: " + (result.detail || "Неизвестная ошибка"));
      }
    } catch (err) {
      console.error("Ошибка при удалении данных:", err);
      alert("Ошибка при удалении данных");
    }
  };

  const loadLogsData = async () => {
    try {
        const response = await fetch("http://localhost:8000/logs", {
        credentials: 'include'
        });
        if (response.ok) {
        const result = await response.json();
        setLogsList(result.logs);
        } else {
        setLogsList([]);
        }
    } catch (err) {
        console.error("Ошибка при загрузке логов:", err);
    }
    };

  return (
    <div className="dashboard-container">
      <div className="background-overlay"></div>
      <div className="dashboard-card">
        <div className="dashboard-header">
          <h2>Панель управления спутником</h2>
          <div className="user-info">
            <button className="user-button" onClick={() => setMenuOpen(!menuOpen)}>
              {satelliteName || "Loading..."}
              <span className={`arrow ${menuOpen ? 'up' : 'down'}`}></span>
            </button>
            {menuOpen && (
              <div className="user-menu">
                <div className="user-menu-content">
                  <p>Вы вошли как: <strong>{satelliteName}</strong></p>
                  <button className="logout-button" onClick={handleLogout}>Выйти</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-tabs">
          <button className={`tab-button ${activeTab === 'send' ? 'active' : ''}`} onClick={() => setActiveTab('send')}>
            📤 Отправить данные
          </button>
          <button className={`tab-button ${activeTab === 'view' ? 'active' : ''}`} onClick={() => setActiveTab('view')}>
            📄 Просмотр данных
          </button>
          <button className={`tab-button ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>
            📚 Просмотр логов
          </button>
        </div>

        <div className="dashboard-content">
          {activeTab === 'send' && (
          <div className="tab-content">
            <div className="data-card">
              <h3>Отправка данных на сервер</h3>
              <div className="input-group">
                <label>Введите данные для отправки:</label>
                <textarea
                  value={rawData}
                  onChange={(e) => setRawData(e.target.value)}
                  placeholder="Текст, JSON, команды..."
                  rows={5}
                  className="input-field"
                />
              </div>
              <button className="action-button primary" onClick={handleSendData}>
                <span className="icon">🚀</span> Отправить данные
              </button>
              {sentMessage && (
                <div className={`status-message ${sentMessage.includes('✅') ? 'success' : 'error'}`}>
                  {sentMessage}
                </div>
              )}
            </div>
          </div>
        )}

          {activeTab === 'view' && (
        <div className="tab-content">
          <div className="data-card">
            <div className="data-header">
              <h3>История передач</h3>
              <button className="action-button secondary" onClick={loadDecryptedData}>
                <span className="icon">🔄</span> Обновить
              </button>
            </div>
            
            {decryptedDataList.length === 0 ? (
              <div className="empty-state">
                <span className="icon">📭</span>
                <p>Нет данных для отображения</p>
              </div>
            ) : (
              <>
                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Время получения</th>
                        <th>Содержание</th>
                      </tr>
                    </thead>
                    <tbody>
                      {decryptedDataList.map((item) => (
                        <tr 
                          key={item.id}
                          onClick={() => handleRowClick(item)}
                          className={`data-row ${selectedData?.id === item.id ? 'selected' : ''}`}
                        >
                          <td>{item.id}</td>
                          <td>{new Date(item.received_at).toLocaleString()}</td>
                          <td className="data-content">{item.data}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {editMode && selectedData && (
                  <div className="data-edit-modal">
                    <div className="edit-modal-content">
                      <h4>Редактирование записи #{selectedData.id}</h4>
                      <textarea
                        value={editedData}
                        onChange={(e) => setEditedData(e.target.value)}
                        className="input-field"
                        rows={5}
                      />
                      <div className="edit-actions">
                        <button 
                          className="action-button primary" 
                          onClick={handleUpdateData}
                          disabled={isUpdating}
                        >
                          {isUpdating ? 'Обновление...' : 'Сохранить изменения'}
                        </button>
                        <button 
                          className="action-button danger" 
                          onClick={handleDeleteData}
                          disabled={isUpdating}
                        >
                          Удалить запись
                        </button>
                        <button 
                          className="action-button secondary" 
                          onClick={() => {
                            setEditMode(false);
                            setSelectedData(null);
                          }}
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

          {activeTab === 'logs' && (
        <div className="tab-content">
            <div className="data-card">
            <div className="data-header">
                <h3>Журнал событий</h3>
                <button className="action-button secondary" onClick={loadLogsData}>
                <span className="icon">🔄</span> Обновить
                </button>
            </div>
            
            {logsList.length === 0 ? (
                <div className="empty-state">
                <span className="icon">📭</span>
                <p>Нет данных для отображения</p>
                </div>
            ) : (
                <div className="data-table-container">
                <table className="data-table">
                    <thead>
                    <tr>
                        <th>ID</th>
                        <th>Время действия</th>
                        <th>Тип действия</th>
                        <th>Старые данные</th>
                        <th>Новые данные</th>
                    </tr>
                    </thead>
                    <tbody>
                    {logsList.map((log) => (
                        <tr key={log.id}>
                        <td>{log.id}</td>
                        <td>{new Date(log.action_time).toLocaleString()}</td>
                        <td>{log.action_type}</td>
                        <td className="data-content" title={log.old_payload}>
                            {log.old_payload}
                        </td>
                        <td className="data-content" title={log.new_payload || ''}>
                            {log.new_payload || '-'}
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            )}
            </div>
        </div>
        )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
