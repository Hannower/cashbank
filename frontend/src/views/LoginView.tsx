import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Mail,
  Lock,
  User as UserIcon,
  ArrowRight,
  Loader2,
  KeyRound,
  CheckCircle2,
  X,
  ArrowLeft,
  Copy,
  Check,
  AlertCircle,
  Send,
  ExternalLink,
  Eye,
  EyeOff,
  Sun,
  Moon,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const LoginView: React.FC = () => {
  const { login, register, verify2FA, resend2FA } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 2FA Admin Verification state
  const [is2FAMode, setIs2FAMode] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorEmail, setTwoFactorEmail] = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorResentMsg, setTwoFactorResentMsg] = useState<string | null>(null);

  // Link Recovery Modal state (Requesting link by email)
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<1 | 2>(1);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  // Theme toggle state
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

  // Lock body scroll when recovery modal is active
  useEffect(() => {
    if (!showRecoveryModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowRecoveryModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [showRecoveryModal]);

  const handleOpenRecovery = () => {
    setRecoveryEmail(email || '');
    setRecoveryStep(1);
    setRecoveryError(null);
    setShowRecoveryModal(true);
  };

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail) {
      setRecoveryError('Por favor, informe seu e-mail cadastrado.');
      return;
    }
    setRecoveryError(null);
    setRecoveryLoading(true);
    try {
      await api.forgotPassword({
        email: recoveryEmail.trim(),
        frontendUrl: window.location.origin,
      });
      setRecoveryStep(2);
    } catch (err: any) {
      setRecoveryError(err.message || 'Nenhuma conta cadastrada com este e-mail.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegisterMode) {
        await register(name, email, password);
      } else {
        const result = await login(email, password);
        if (result.requires2FA) {
          setIs2FAMode(true);
          setTwoFactorEmail(result.email || email);
          setTwoFactorCode('');
          if (result.emailSent === false && result.message) {
            setError(result.message);
          } else {
            setError(null);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao autenticar. Verifique seus dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorCode.trim()) {
      setError('Por favor, informe o código de 6 dígitos.');
      return;
    }
    setError(null);
    setTwoFactorLoading(true);
    try {
      await verify2FA(twoFactorEmail, twoFactorCode.trim());
    } catch (err: any) {
      setError(err.message || 'Código de autenticação inválido ou expirado.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleResend2FACode = async () => {
    setError(null);
    setTwoFactorResentMsg(null);
    try {
      await resend2FA(twoFactorEmail);
      setTwoFactorResentMsg('Novo código enviado com sucesso para seu e-mail!');
      setTimeout(() => setTwoFactorResentMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Erro ao reenviar código de autenticação.');
    }
  };

  return (
    <div
      className="login-page-wrapper"
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100%',
        position: 'relative',
      }}
    >
      {/* Left green panel */}
      <div
        className="login-left-banner"
        style={{
          flex: 1.1,
          backgroundColor: '#15803d',
          background: 'linear-gradient(145deg, #166534 0%, #15803d 40%, #14532d 100%)',
          color: 'white',
          padding: '48px 64px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle decorative concentric circles */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            right: '-120px',
            transform: 'translateY(-50%)',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            border: '2px solid rgba(255, 255, 255, 0.08)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            right: '-60px',
            transform: 'translateY(-50%)',
            width: '450px',
            height: '450px',
            borderRadius: '50%',
            border: '2px solid rgba(255, 255, 255, 0.06)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            right: '0',
            transform: 'translateY(-50%)',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            border: '2px solid rgba(255, 255, 255, 0.04)',
            pointerEvents: 'none',
          }}
        />

        {/* Top Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 2 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="4" y="14" width="3.5" height="6" rx="1.5" fill="#15803d" />
              <rect x="10.25" y="9" width="3.5" height="11" rx="1.5" fill="#15803d" />
              <rect x="16.5" y="4" width="3.5" height="16" rx="1.5" fill="#15803d" />
            </svg>
          </div>
          <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px' }}>CashBank</span>
        </div>

        {/* Center Text */}
        <div style={{ maxWidth: 520, position: 'relative', zIndex: 2, margin: '60px 0' }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '1.4px',
              textTransform: 'uppercase',
              color: '#86efac',
              marginBottom: 20,
            }}
          >
            SUA VIDA FINANCEIRA, ORGANIZADA
          </div>
          <h1
            style={{
              fontSize: 46,
              lineHeight: 1.15,
              fontWeight: 800,
              letterSpacing: '-1px',
              marginBottom: 24,
              whiteSpace: 'pre-line',
            }}
          >
            Decisões mais leves.{'\n'}Futuro mais tranquilo.
          </h1>
          <p
            style={{
              fontSize: 18,
              lineHeight: 1.6,
              color: 'rgba(255, 255, 255, 0.9)',
              fontWeight: 400,
            }}
          >
            Controle despesas, acompanhe receitas e construa sua reserva em um só lugar.
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            fontSize: 13,
            color: 'rgba(255, 255, 255, 0.75)',
            position: 'relative',
            zIndex: 2,
          }}
        >
          © 2025 CashBank. Seus dados, sempre protegidos.
        </div>
      </div>

      {/* Right Login / Register Card */}
      <div
        className="login-right-panel"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          position: 'relative',
        }}
      >
        {/* Floating Theme Toggle */}
        <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 10 }}>
          <button
            type="button"
            onClick={toggleTheme}
            className="login-theme-toggle"
            title={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            aria-label={isDark ? 'Tema Claro' : 'Tema Escuro'}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <div style={{ width: '100%', maxWidth: 420 }}>
          {is2FAMode ? (
            <div>
              <div style={{ marginBottom: 28, textAlign: 'center' }}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(124, 58, 237, 0.1)',
                    color: '#7c3aed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    border: '1px solid rgba(124, 58, 237, 0.25)',
                  }}
                >
                  <ShieldCheck size={30} />
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: '#7c3aed',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: 6,
                  }}
                >
                  Segurança Reforçada (2FA)
                </span>
                <h2
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: 'var(--text-main, #0f172a)',
                    letterSpacing: '-0.6px',
                    marginBottom: 8,
                  }}
                >
                  Verificação de Admin
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary, #64748b)', lineHeight: 1.5 }}>
                  Para proteger o ambiente de administração do CashBank, enviamos um código de 6 dígitos para o seu e-mail:
                  <br />
                  <strong style={{ color: 'var(--text-main, #0f172a)' }}>{twoFactorEmail}</strong>
                </p>
              </div>

              {error && (
                <div
                  style={{
                    backgroundColor: '#fef2f2',
                    color: '#b91c1c',
                    border: '1px solid #fecaca',
                    borderRadius: 10,
                    padding: '12px 14px',
                    fontSize: 13,
                    marginBottom: 20,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              {twoFactorResentMsg && (
                <div
                  style={{
                    backgroundColor: '#ecfdf5',
                    color: '#15803d',
                    border: '1px solid #a7f3d0',
                    borderRadius: 10,
                    padding: '12px 14px',
                    fontSize: 13,
                    marginBottom: 20,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                  <span>{twoFactorResentMsg}</span>
                </div>
              )}

              <form onSubmit={handleVerify2FA} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-main, #334155)',
                      marginBottom: 8,
                      textAlign: 'center',
                    }}
                  >
                    Código de 6 dígitos
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    required
                    placeholder="000000"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                    style={{
                      width: '100%',
                      padding: '14px',
                      fontSize: 26,
                      fontWeight: 800,
                      letterSpacing: '8px',
                      textAlign: 'center',
                      borderRadius: 10,
                      border: '2px solid var(--border-input, #cbd5e1)',
                      backgroundColor: 'var(--bg-input, #ffffff)',
                      color: 'var(--text-main, #0f172a)',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#7c3aed')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--border-input, #cbd5e1)')}
                  />
                </div>

                <button
                  type="submit"
                  disabled={twoFactorLoading || twoFactorCode.length < 6}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    padding: '13px',
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 700,
                    backgroundColor: '#7c3aed',
                    borderColor: '#7c3aed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    opacity: twoFactorCode.length < 6 ? 0.7 : 1,
                    cursor: twoFactorCode.length < 6 ? 'not-allowed' : 'pointer',
                  }}
                >
                  {twoFactorLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Verificando...
                    </>
                  ) : (
                    <>
                      Confirmar e Acessar <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIs2FAMode(false);
                      setError(null);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 13,
                      color: 'var(--text-secondary, #64748b)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    <ArrowLeft size={16} /> Voltar ao login
                  </button>

                  <button
                    type="button"
                    onClick={handleResend2FACode}
                    style={{
                      fontSize: 13,
                      color: '#7c3aed',
                      fontWeight: 600,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Reenviar código
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 32 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#15803d',
                    display: 'block',
                    marginBottom: 6,
                  }}
                >
                  {isRegisterMode ? 'Comece agora' : 'Bem-vindo de volta'}
                </span>
                <h2
                  style={{
                    fontSize: 32,
                    fontWeight: 800,
                    color: '#0f172a',
                    letterSpacing: '-0.8px',
                    marginBottom: 6,
                  }}
                >
                  {isRegisterMode ? 'Crie sua conta' : 'Acesse sua conta'}
                </h2>
                <p style={{ fontSize: 14, color: '#64748b' }}>
                  {isRegisterMode
                    ? 'Preencha seus dados para começar a organizar sua vida financeira.'
                    : 'Entre com seus dados para continuar.'}
                </p>
              </div>

              {error && (
                <div
                  style={{
                    backgroundColor: '#fef2f2',
                    color: '#b91c1c',
                    border: '1px solid #fecaca',
                    borderRadius: 10,
                    padding: '12px 14px',
                    fontSize: 13,
                    marginBottom: 20,
                  }}
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {isRegisterMode && (
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#334155',
                        marginBottom: 6,
                      }}
                    >
                      Nome completo
                    </label>
                    <div style={{ position: 'relative' }}>
                      <UserIcon
                        size={18}
                        color="#94a3b8"
                        style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
                      />
                      <input
                        type="text"
                        required
                        placeholder="Seu nome completo"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 14px 12px 42px',
                          borderRadius: 10,
                          border: '1px solid #cbd5e1',
                          outline: 'none',
                        }}
                        onFocus={(e) => (e.target.style.borderColor = '#15803d')}
                        onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#334155',
                      marginBottom: 6,
                    }}
                  >
                    E-mail
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail
                      size={18}
                      color="#94a3b8"
                      style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <input
                      type="email"
                      required
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px 12px 42px',
                        borderRadius: 10,
                        border: '1px solid #cbd5e1',
                        outline: 'none',
                      }}
                      onFocus={(e) => (e.target.style.borderColor = '#15803d')}
                      onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
                    />
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#334155',
                      marginBottom: 6,
                    }}
                  >
                    Senha
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock
                      size={18}
                      color="#94a3b8"
                      style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 42px 12px 42px',
                        borderRadius: 10,
                        border: '1px solid #cbd5e1',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => (e.target.style.borderColor = '#15803d')}
                      onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
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
                      title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {!isRegisterMode && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 13,
                        color: 'var(--text-secondary, #475569)',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        style={{ accentColor: '#15803d', width: 16, height: 16 }}
                      />
                      Lembrar de mim
                    </label>
                    <button
                      type="button"
                      onClick={handleOpenRecovery}
                      style={{
                        fontSize: 13,
                        color: '#15803d',
                        fontWeight: 600,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                      onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    padding: '13px',
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 700,
                    marginTop: 6,
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Carregando...
                    </>
                  ) : isRegisterMode ? (
                    <>
                      Criar conta agora <ArrowRight size={18} />
                    </>
                  ) : (
                    <>
                      Entrar na conta <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  margin: '28px 0 20px',
                  gap: 12,
                }}
              >
                <div className="login-divider-line" style={{ flex: 1, height: 1 }} />
                <span style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)' }}>ou</span>
                <div className="login-divider-line" style={{ flex: 1, height: 1 }} />
              </div>

              {/* Toggle Register / Login */}
              <div style={{ textAlign: 'center', fontSize: 14, color: '#64748b' }}>
                {isRegisterMode ? (
                  <>
                    Já possui uma conta?{' '}
                    <button
                      type="button"
                      onClick={() => setIsRegisterMode(false)}
                      style={{ color: '#15803d', fontWeight: 700, textDecoration: 'underline' }}
                    >
                      Fazer login
                    </button>
                  </>
                ) : (
                  <>
                    Ainda não tem uma conta?{' '}
                    <button
                      type="button"
                      onClick={() => setIsRegisterMode(true)}
                      style={{ color: '#15803d', fontWeight: 700, textDecoration: 'underline' }}
                    >
                      Criar conta grátis
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal 1: Request Password Reset Link */}
      {showRecoveryModal &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100dvh',
              zIndex: 9999,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
              overflowY: 'auto',
              boxSizing: 'border-box',
            }}
            onClick={() => setShowRecoveryModal(false)}
          >
            <div
              className="login-modal-box"
              style={{
                borderRadius: 20,
                width: '100%',
                maxWidth: 480,
                maxHeight: 'calc(100dvh - 32px)',
                overflowY: 'auto',
                padding: '32px 28px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
                position: 'relative',
                animation: 'modalPop 0.25s ease forwards',
                boxSizing: 'border-box',
              }}
              onClick={(e) => e.stopPropagation()}
            >
            {/* Close button */}
            <button
              onClick={() => setShowRecoveryModal(false)}
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                color: '#94a3b8',
                padding: 6,
                borderRadius: 8,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-main, #0f172a)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: '#ecfdf5',
                  color: '#15803d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {recoveryStep === 1 ? <KeyRound size={22} /> : <Send size={22} />}
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Recuperação de Senha
                </h3>
                <p style={{ fontSize: 13, color: '#64748b', margin: '2px 0 0' }}>
                  {recoveryStep === 1
                    ? 'Informe seu e-mail para receber o link de redefinição'
                    : 'Link enviado com segurança para seu e-mail'}
                </p>
              </div>
            </div>

            {/* Error banner */}
            {recoveryError && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 10,
                  padding: '10px 14px',
                  marginBottom: 16,
                  color: '#b91c1c',
                  fontSize: 13,
                  lineHeight: 1.4,
                }}
              >
                {recoveryError}
              </div>
            )}

            {/* Step 1: Input Email & Request Link */}
            {recoveryStep === 1 && (
              <form onSubmit={handleSendResetLink} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#334155',
                      marginBottom: 6,
                    }}
                  >
                    E-mail da sua conta
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail
                      size={18}
                      color="#94a3b8"
                      style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <input
                      type="email"
                      required
                      placeholder="seu@email.com"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '11px 14px 11px 42px',
                        border: '1px solid #cbd5e1',
                        borderRadius: 10,
                        fontSize: 14,
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                      onFocus={(e) => (e.target.style.borderColor = '#15803d')}
                      onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
                    />
                  </div>
                  <span style={{ display: 'block', fontSize: 12, color: '#64748b', marginTop: 6, lineHeight: 1.4 }}>
                    Um link seguro com validade de 1 hora será enviado para o endereço cadastrado.
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setShowRecoveryModal(false)}
                    className="btn-secondary"
                    style={{ flex: 1, padding: '11px' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={recoveryLoading}
                    className="btn-primary"
                    style={{ flex: 1.3, padding: '11px' }}
                  >
                    {recoveryLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Enviando...
                      </>
                    ) : (
                      <>
                        Enviar Link <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Confirmation of email sent */}
            {recoveryStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '10px 0' }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: '#dcfce7',
                    color: '#15803d',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}
                >
                  <Mail size={28} />
                </div>

                <h4 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-main, #0f172a)', margin: '0 0 8px' }}>
                  Verifique seu e-mail!
                </h4>

                <p style={{ fontSize: 13, color: 'var(--text-secondary, #475569)', lineHeight: 1.6, margin: '0 0 16px' }}>
                  Enviamos o link de recuperação de senha para:<br />
                  <strong style={{ color: 'var(--text-main, #0f172a)', fontSize: 14 }}>{recoveryEmail}</strong>
                </p>

                <div
                  className="login-info-box-light"
                  style={{
                    borderRadius: 12,
                    padding: '16px',
                    textAlign: 'left',
                    width: '100%',
                    marginBottom: 16,
                    boxSizing: 'border-box',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main, #334155)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={15} color="#15803d" /> Como prosseguir:
                  </div>
                  <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--text-secondary, #64748b)', lineHeight: 1.6 }}>
                    <li>Acesse a caixa de entrada do seu e-mail cadastrado.</li>
                    <li>Abra a mensagem com o assunto <strong>"Recuperação de Senha - CashBank"</strong>.</li>
                    <li>Clique no botão seguro <strong>"Redefinir Minha Senha"</strong>.</li>
                    <li>Você será direcionado para a página de redefinição de senha.</li>
                  </ol>
                </div>

                <div
                  className="login-info-box-blue"
                  style={{
                    borderRadius: 10,
                    padding: '10px 14px',
                    fontSize: 12,
                    marginBottom: 20,
                    width: '100%',
                    boxSizing: 'border-box',
                    textAlign: 'left',
                    lineHeight: 1.5,
                  }}
                >
                  🔒 <strong>Segurança da sua conta:</strong> O link enviado por e-mail é de uso único e possui validade de 1 hora.
                </div>

                <button
                  type="button"
                  onClick={() => setShowRecoveryModal(false)}
                  className="btn-primary"
                  style={{ width: '100%', padding: '12px', fontSize: 14 }}
                >
                  Entendi, vou checar meu e-mail
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRecoveryStep(1);
                    setRecoveryError(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    fontSize: 12,
                    cursor: 'pointer',
                    marginTop: 12,
                    padding: 4,
                  }}
                >
                  Não encontrou? Tentar outro e-mail
                </button>
              </div>
            )}
            </div>
          </div>,
          document.body
        )}

      <style>{`
        @media (max-width: 900px) {
          .login-left-banner {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
