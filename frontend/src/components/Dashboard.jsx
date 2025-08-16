import React from 'react';
import { useTranslation } from 'react-i18next';

const Dashboard = () => {
  const { t } = useTranslation();

  return (
    <div className="content-container">
      <div className="page-header">
        <h1 className="page-title">{t('dashboard.title')}</h1>
        <p className="page-subtitle">{t('dashboard.welcome')}</p>
      </div>
      <div className="empty-state">
        <div className="empty-state-icon">🏠</div>
        <h2 className="empty-state-title">{t('dashboard.comingSoon')}</h2>
        <p className="empty-state-description">{t('dashboard.comingSoonDescription')}</p>
      </div>
    </div>
  );
};

export default Dashboard;
