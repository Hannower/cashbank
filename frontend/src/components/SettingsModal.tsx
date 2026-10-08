import React, { useState, useEffect } from 'react';
import {
  X,
  User as UserIcon,
  Mail,
  Lock,
  Moon,
  Sun,
  Shield,
  Palette,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Settings,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isDark,
  onToggleTheme,
}) => {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'appearance'>('profile');

  // Profile form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Security form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securitySuccess, setSecuritySuccess] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);

  useEffect(() => {
    if (user && isOpen) {
      setName(user.name || '');
      setEmail(user.email || '');
      setProfileSuccess(null);
      setProfileError(null);
      setSecuritySuccess(null);
      setSecurityError(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    if (!name.trim()) {
      setProfileError('O nome não pode ficar em branco.');
      return;
    }
    if (!email.trim()) {
      setProfileError('O e-mail não pode ficar em branco.');
      return;
    }

    setProfileLoading(true);
    try {
      const res = await api.updateProfile({
        name: name.trim(),
        email: email.trim(),
      });
      await refreshUser();
      setProfileSuccess(res.message || 'Dados atualizados com sucesso!');
    } catch (err: any) {
      setProfileError(err.message || 'Erro ao atualizar dados do perfil.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError(null);
    setSecuritySuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setSecurityError('Preencha todos os campos de senha.');
      return;
    }
    if (newPassword.length < 6) {
      setSecurityError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityError('A confirmação da nova senha não confere.');
      return;
    }

    setSecurityLoading(true);
    try {
      const res = await api.changePassword({
        currentPassword,
        newPassword,
      });
      setSecuritySuccess(res.message || 'Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setSecurityError(err.message || 'Erro ao atualizar a senha.');
    } finally {
      setSecurityLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content animate-modal-pop"
        style={{ maxWidth: '560px', padding: 0, overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 28px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                backgroundColor: 'var(--primary-light, #ecfdf5)',
                color: 'var(--primary, #15803d)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Settings size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                Configurações da Conta
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                Gerencie suas informações pessoais e preferências.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Fechar"
            style={{
              color: 'var(--text-muted)',
              padding: 6,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-main)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color)',
            padding: '0 28px',
            backgroundColor: 'var(--bg-card)',
            gap: 20,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '14px 4px',
              fontSize: 14,
              fontWeight: 600,
              color: activeTab === 'profile' ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'profile' ? '2px solid var(--primary)' : '2px solid transparent',
              background: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <UserIcon size={16} /> Meu Perfil
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '14px 4px',
              fontSize: 14,
              fontWeight: 600,
              color: activeTab === 'security' ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'security' ? '2px solid var(--primary)' : '2px solid transparent',
              background: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Shield size={16} /> Segurança
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('appearance')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '14px 4px',
              fontSize: 14,
              fontWeight: 600,
              color: activeTab === 'appearance' ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'appearance' ? '2px solid var(--primary)' : '2px solid transparent',
              background: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Palette size={16} /> Aparência
          </button>
        </div>

        {/* Tab Contents */}
        <div style={{ padding: '24px 28px 28px', maxHeight: '70vh', overflowY: 'auto' }}>
          {/* TAB 1: PROFILE */}
          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {profileSuccess && (
                <div
                  style={{
                    backgroundColor: 'rgba(21, 128, 61, 0.12)',
                    border: '1px solid rgba(21, 128, 61, 0.3)',
                    color: '#15803d',
                    padding: '10px 14px',
                    borderRadius: 10,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <CheckCircle2 size={18} />
                  <span>{profileSuccess}</span>
                </div>
              )}

              {profileError && (
                <div
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    padding: '10px 14px',
                    borderRadius: 10,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <AlertCircle size={18} />
                  <span>{profileError}</span>
                </div>
              )}

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    marginBottom: 6,
                  }}
                >
                  Nome Completo
                </label>
                <div style={{ position: 'relative' }}>
                  <UserIcon
                    size={18}
                    color="var(--text-muted)"
                    style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    style={{
                      width: '100%',
                      padding: '11px 14px 11px 42px',
                      border: '1px solid var(--border-input)',
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--text-main)',
                      borderRadius: 10,
                      fontSize: 14,
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    marginBottom: 6,
                  }}
                >
                  E-mail
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={18}
                    color="var(--text-muted)"
                    style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    style={{
                      width: '100%',
                      padding: '11px 14px 11px 42px',
                      border: '1px solid var(--border-input)',
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--text-main)',
                      borderRadius: 10,
                      fontSize: 14,
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginTop: 5 }}>
                  Utilizado para acessar sua conta e receber comunicações do sistema.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="btn-primary"
                  style={{ padding: '11px 24px' }}
                >
                  {profileLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Salvando...
                    </>
                  ) : (
                    'Salvar Alterações'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: SECURITY */}
          {activeTab === 'security' && (
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {securitySuccess && (
                <div
                  style={{
                    backgroundColor: 'rgba(21, 128, 61, 0.12)',
                    border: '1px solid rgba(21, 128, 61, 0.3)',
                    color: '#15803d',
                    padding: '10px 14px',
                    borderRadius: 10,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <CheckCircle2 size={18} />
                  <span>{securitySuccess}</span>
                </div>
              )}

              {securityError && (
                <div
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    padding: '10px 14px',
                    borderRadius: 10,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <AlertCircle size={18} />
                  <span>{securityError}</span>
                </div>
              )}

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    marginBottom: 6,
                  }}
                >
                  Senha Atual
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={18}
                    color="var(--text-muted)"
                    style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Digite sua senha atual"
                    style={{
                      width: '100%',
                      padding: '11px 14px 11px 42px',
                      border: '1px solid var(--border-input)',
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--text-main)',
                      borderRadius: 10,
                      fontSize: 14,
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    marginBottom: 6,
                  }}
                >
                  Nova Senha
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={18}
                    color="var(--text-muted)"
                    style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo de 6 caracteres"
                    style={{
                      width: '100%',
                      padding: '11px 14px 11px 42px',
                      border: '1px solid var(--border-input)',
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--text-main)',
                      borderRadius: 10,
                      fontSize: 14,
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    marginBottom: 6,
                  }}
                >
                  Confirmar Nova Senha
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={18}
                    color="var(--text-muted)"
                    style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita sua nova senha"
                    style={{
                      width: '100%',
                      padding: '11px 14px 11px 42px',
                      border: '1px solid var(--border-input)',
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--text-main)',
                      borderRadius: 10,
                      fontSize: 14,
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                <button
                  type="submit"
                  disabled={securityLoading}
                  className="btn-primary"
                  style={{ padding: '11px 24px' }}
                >
                  {securityLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Atualizando...
                    </>
                  ) : (
                    'Atualizar Senha'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: APPEARANCE */}
          {activeTab === 'appearance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: 4 }}>
                  Tema da Interface
                </label>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                  Personalize a aparência do CashBank para o seu conforto visual.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {/* Light theme card */}
                  <div
                    onClick={() => {
                      if (isDark) onToggleTheme();
                    }}
                    style={{
                      border: !isDark ? '2px solid var(--primary)' : '1px solid var(--border-input)',
                      borderRadius: 14,
                      padding: '16px',
                      cursor: 'pointer',
                      backgroundColor: !isDark ? 'rgba(21, 128, 61, 0.04)' : 'var(--bg-input)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          backgroundColor: '#fef3c7',
                          color: '#d97706',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Sun size={20} />
                      </div>
                      {!isDark && (
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            backgroundColor: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'white' }} />
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>Tema Claro</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                        Fundo branco e claro tradicional
                      </div>
                    </div>
                  </div>

                  {/* Dark theme card */}
                  <div
                    onClick={() => {
                      if (!isDark) onToggleTheme();
                    }}
                    style={{
                      border: isDark ? '2px solid var(--primary)' : '1px solid var(--border-input)',
                      borderRadius: 14,
                      padding: '16px',
                      cursor: 'pointer',
                      backgroundColor: isDark ? 'rgba(21, 128, 61, 0.15)' : 'var(--bg-input)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          backgroundColor: '#334155',
                          color: '#38bdf8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Moon size={20} />
                      </div>
                      {isDark && (
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            backgroundColor: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'white' }} />
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>Tema Escuro</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                        Fundo escuro e fontes claras
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
