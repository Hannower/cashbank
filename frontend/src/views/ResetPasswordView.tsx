import React, { useState, useEffect } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Sun,
  Moon,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../services/api';

interface ResetPasswordViewProps {
  token: string;
  onFinished: () => void;
}

export const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({ token, onFinished }) => {
  const [validationState, setValidationState] = useState<'validating' | 'valid' | 'invalid'>('validating');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<{ email: string; name: string } | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Theme toggle
  const [isDark, setIsDark] = useState<boolean>(() => {
    return localStorage.getItem('cashbank_theme') === 'dark' || document.body.classList.contains('dark-theme');
  });

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.body.classList.add('dark-theme');
        localStorage.setItem('cashbank_theme', 'dark');
      } else {
        document.body.classList.remove('dark-theme');
        localStorage.setItem('cashbank_theme', 'light');
      }
      return next;
    });
  };

  useEffect(() => {
    const validate = async () => {
      setValidationState('validating');
      setErrorMessage(null);
      try {
        const res = await api.verifyResetToken({ token });
        setUserInfo({ email: res.email, name: res.name });
        setValidationState('valid');
      } catch (err: any) {
        setValidationState('invalid');
        setErrorMessage(err.message || 'O link de recuperação é inválido ou já expirou.');
      }
    };

    if (token) {
      validate();
    } else {
      setValidationState('invalid');
      setErrorMessage('Token de recuperação não fornecido.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setFormError('Preencha os campos de nova senha.');
      return;
    }
    if (newPassword.length < 6) {
      setFormError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError('As senhas não coincidem.');
      return;
    }

    setFormError(null);
    setSubmitting(true);
    try {
      await api.resetPasswordWithToken({
        token,
        newPassword,
      });

      // Clear any cached credentials/token in browser
      try {
        localStorage.removeItem('cashbank_token');
      } catch (_) {}

      setSuccess(true);
    } catch (err: any) {
      setFormError(err.message || 'Erro ao redefinir senha. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-primary, #f8fafc)',
        padding: '24px 16px',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {/* Theme toggle button in top corner */}
      <button
        onClick={toggleTheme}
        type="button"
        title={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: 'var(--card-bg, #ffffff)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: 12,
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'pointer',
          color: 'var(--text-main, #334155)',
          fontSize: 13,
          fontWeight: 600,
          boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
        }}
      >
        {isDark ? <Sun size={16} color="#eab308" /> : <Moon size={16} color="#64748b" />}
        <span>{isDark ? 'Claro' : 'Escuro'}</span>
      </button>

      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 6,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(21, 128, 61, 0.3)',
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <span
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: 'var(--text-main, #0f172a)',
              letterSpacing: '-0.5px',
            }}
          >
            CashBank
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary, #64748b)' }}>
          Controle Financeiro Pessoal • Redefinição Segura de Senha
        </p>
      </div>

      {/* Main Card */}
      <div
        className="login-modal-box"
        style={{
          width: '100%',
          maxWidth: 460,
          backgroundColor: 'var(--card-bg, #ffffff)',
          borderRadius: 20,
          border: '1px solid var(--border-color, #e2e8f0)',
          padding: '36px 32px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
          boxSizing: 'border-box',
        }}
      >
        {/* State: Validating token */}
        {validationState === 'validating' && (
          <div style={{ textAlign: 'center', padding: '36px 12px' }}>
            <Loader2
              size={40}
              className="animate-spin"
              color="#15803d"
              style={{ margin: '0 auto 18px' }}
            />
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--text-main, #0f172a)',
                margin: '0 0 8px',
              }}
            >
              Validando link de recuperação...
            </h3>
            <p
              style={{
                fontSize: 14,
                color: 'var(--text-secondary, #64748b)',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              Aguarde enquanto verificamos a autenticidade e validade do seu link seguro.
            </p>
          </div>
        )}

        {/* State: Invalid or Expired Token */}
        {validationState === 'invalid' && (
          <div style={{ textAlign: 'center', padding: '16px 8px' }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: '#fee2e2',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 18px',
              }}
            >
              <AlertCircle size={32} />
            </div>
            <h3
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--text-main, #0f172a)',
                margin: '0 0 10px',
              }}
            >
              Link Inválido ou Expirado
            </h3>
            <p
              style={{
                fontSize: 14,
                color: 'var(--text-secondary, #64748b)',
                lineHeight: 1.6,
                marginBottom: 24,
              }}
            >
              {errorMessage || 'Por motivos de segurança, os links de redefinição são de uso único e expiram após 1 hora.'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                onClick={onFinished}
                className="btn-primary"
                style={{ width: '100%', padding: '12px', fontSize: 14 }}
              >
                Voltar à Tela de Login
              </button>
            </div>
          </div>
        )}

        {/* State: Token Valid - Form or Success */}
        {validationState === 'valid' && (
          <>
            {!success ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      backgroundColor: 'var(--primary-light, #ecfdf5)',
                      color: 'var(--primary-color, #15803d)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Lock size={24} />
                  </div>
                  <div>
                    <h2
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: 'var(--text-main, #0f172a)',
                        margin: 0,
                      }}
                    >
                      Criar Nova Senha
                    </h2>
                    <p
                      style={{
                        fontSize: 13,
                        color: 'var(--text-secondary, #64748b)',
                        margin: '2px 0 0',
                      }}
                    >
                      Defina sua nova senha para acessar a conta
                    </p>
                  </div>
                </div>

                {userInfo?.email && (
                  <div
                    style={{
                      backgroundColor: 'var(--primary-light, #f0fdf4)',
                      border: '1px solid var(--border-color, #dcfce7)',
                      borderRadius: 10,
                      padding: '10px 14px',
                      fontSize: 13,
                      color: 'var(--primary-badge-text, #15803d)',
                      marginBottom: 20,
                    }}
                  >
                    Conta autenticada: <strong>{userInfo.email}</strong>
                  </div>
                )}

                {formError && (
                  <div
                    style={{
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: 10,
                      padding: '10px 14px',
                      marginBottom: 18,
                      color: '#b91c1c',
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--text-main, #334155)',
                        marginBottom: 6,
                      }}
                    >
                      Nova Senha
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Lock
                        size={18}
                        color="#94a3b8"
                        style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
                      />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        placeholder="Mínimo de 6 caracteres"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 42px 12px 42px',
                          border: '1px solid var(--border-color, #cbd5e1)',
                          borderRadius: 10,
                          fontSize: 14,
                          boxSizing: 'border-box',
                          outline: 'none',
                          backgroundColor: 'var(--input-bg, #ffffff)',
                          color: 'var(--text-main, #0f172a)',
                        }}
                        onFocus={(e) => (e.target.style.borderColor = '#15803d')}
                        onBlur={(e) => (e.target.style.borderColor = 'var(--border-color, #cbd5e1)')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        style={{
                          position: 'absolute',
                          right: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          padding: 4,
                          cursor: 'pointer',
                          color: '#94a3b8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title={showNewPassword ? 'Ocultar senha' : 'Exibir senha'}
                      >
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--text-main, #334155)',
                        marginBottom: 6,
                      }}
                    >
                      Confirmar Nova Senha
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Lock
                        size={18}
                        color="#94a3b8"
                        style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
                      />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        placeholder="Repita sua nova senha"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 42px 12px 42px',
                          border: '1px solid var(--border-color, #cbd5e1)',
                          borderRadius: 10,
                          fontSize: 14,
                          boxSizing: 'border-box',
                          outline: 'none',
                          backgroundColor: 'var(--input-bg, #ffffff)',
                          color: 'var(--text-main, #0f172a)',
                        }}
                        onFocus={(e) => (e.target.style.borderColor = '#15803d')}
                        onBlur={(e) => (e.target.style.borderColor = 'var(--border-color, #cbd5e1)')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{
                          position: 'absolute',
                          right: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          padding: 4,
                          cursor: 'pointer',
                          color: '#94a3b8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title={showConfirmPassword ? 'Ocultar senha' : 'Exibir senha'}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary"
                    style={{
                      width: '100%',
                      padding: '13px',
                      fontSize: 15,
                      fontWeight: 700,
                      marginTop: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" /> Salvando nova senha...
                      </>
                    ) : (
                      <>
                        Salvar Nova Senha <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: '#dcfce7',
                    color: '#15803d',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 18px',
                  }}
                >
                  <CheckCircle2 size={36} />
                </div>
                <h3
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: 'var(--text-main, #0f172a)',
                    margin: '0 0 10px',
                  }}
                >
                  Senha Alterada com Sucesso!
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    color: 'var(--text-secondary, #475569)',
                    lineHeight: 1.6,
                    marginBottom: 24,
                  }}
                >
                  Sua senha foi redefinida através do link seguro enviado para o seu e-mail. Agora você já pode entrar na sua conta com a nova senha cadastrada.
                </p>
                <button
                  type="button"
                  onClick={onFinished}
                  className="btn-primary"
                  style={{ width: '100%', padding: '13px', fontSize: 15, fontWeight: 700 }}
                >
                  Entrar na Minha Conta
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
