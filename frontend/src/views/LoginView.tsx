import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const LoginView: React.FC = () => {
  const { login, register } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Link Recovery Modal state (Requesting link by email)
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<1 | 2>(1);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [generatedResetUrl, setGeneratedResetUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Active Reset via Token state (when URL has ?resetToken=... or user opens link)
  const [activeResetToken, setActiveResetToken] = useState<string | null>(null);
  const [tokenValidationState, setTokenValidationState] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [tokenUserInfo, setTokenUserInfo] = useState<{ email: string; name: string } | null>(null);
  const [tokenErrorMessage, setTokenErrorMessage] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tokenResetLoading, setTokenResetLoading] = useState(false);
  const [tokenResetError, setTokenResetError] = useState<string | null>(null);
  const [tokenResetSuccess, setTokenResetSuccess] = useState(false);

  // Check URL on load for ?resetToken=
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('resetToken');
    if (token) {
      setActiveResetToken(token);
      validateResetToken(token);
    }
  }, []);

  const validateResetToken = async (token: string) => {
    setTokenValidationState('validating');
    setTokenErrorMessage(null);
    setTokenResetError(null);
    setTokenResetSuccess(false);
    try {
      const res = await api.verifyResetToken({ token });
      setTokenUserInfo({ email: res.email, name: res.name });
      setTokenValidationState('valid');
    } catch (err: any) {
      setTokenValidationState('invalid');
      setTokenErrorMessage(err.message || 'O link de recuperação é inválido ou já expirou.');
    }
  };

  const handleOpenRecovery = () => {
    setRecoveryEmail(email || '');
    setRecoveryStep(1);
    setRecoveryError(null);
    setGeneratedResetUrl(null);
    setCopiedLink(false);
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
      const res = await api.forgotPassword({ email: recoveryEmail.trim() });
      setGeneratedResetUrl(res.resetUrl);
      setRecoveryStep(2);
    } catch (err: any) {
      setRecoveryError(err.message || 'Nenhuma conta cadastrada com este e-mail.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (generatedResetUrl) {
      navigator.clipboard.writeText(generatedResetUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleOpenResetLinkDirectly = () => {
    if (generatedResetUrl) {
      try {
        const url = new URL(generatedResetUrl);
        const token = url.searchParams.get('resetToken');
        if (token) {
          setShowRecoveryModal(false);
          setActiveResetToken(token);
          validateResetToken(token);
        }
      } catch {
        window.location.href = generatedResetUrl;
      }
    }
  };

  const handleSubmitTokenReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setTokenResetError('Preencha os campos de nova senha.');
      return;
    }
    if (newPassword.length < 6) {
      setTokenResetError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setTokenResetError('As senhas não coincidem.');
      return;
    }
    if (!activeResetToken) {
      setTokenResetError('Token de recuperação não encontrado.');
      return;
    }

    setTokenResetError(null);
    setTokenResetLoading(true);
    try {
      await api.resetPasswordWithToken({
        token: activeResetToken,
        newPassword,
      });
      // Clear URL parameter cleanly without page reload
      window.history.replaceState({}, document.title, window.location.pathname);
      setTokenResetSuccess(true);
    } catch (err: any) {
      setTokenResetError(err.message || 'Erro ao redefinir senha.');
    } finally {
      setTokenResetLoading(false);
    }
  };

  const handleFinishTokenReset = () => {
    if (tokenUserInfo?.email) {
      setEmail(tokenUserInfo.email);
    }
    setPassword('');
    setActiveResetToken(null);
    setTokenValidationState('idle');
    setTokenResetSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegisterMode) {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao autenticar. Verifique seus dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#ffffff',
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
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          backgroundColor: '#ffffff',
        }}
      >
        <div style={{ width: '100%', maxWidth: 420 }}>
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
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            {!isRegisterMode && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    color: '#475569',
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
            <div style={{ flex: 1, height: 1, backgroundColor: '#e2e8f0' }} />
            <span style={{ fontSize: 12, color: '#94a3b8' }}>ou</span>
            <div style={{ flex: 1, height: 1, backgroundColor: '#e2e8f0' }} />
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
        </div>
      </div>

      {/* Modal 1: Request Password Reset Link */}
      {showRecoveryModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setShowRecoveryModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              width: '100%',
              maxWidth: 480,
              padding: '32px 28px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
              position: 'relative',
              animation: 'modalPop 0.25s ease forwards',
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
              onMouseEnter={(e) => (e.currentTarget.style.color = '#0f172a')}
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

            {/* Step 2: Link Sent Confirmation & Direct Access */}
            {recoveryStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div
                  style={{
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #dcfce7',
                    borderRadius: 12,
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                  }}
                >
                  <CheckCircle2 size={20} color="#15803d" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: 13, color: '#166534', lineHeight: 1.5 }}>
                    Link de recuperação enviado para <strong>{recoveryEmail}</strong>. Por motivos de segurança, ele só pode ser utilizado através do link fornecido.
                  </div>
                </div>

                {generatedResetUrl && (
                  <div
                    style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 12,
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                      Link de redefinição de senha gerado:
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        readOnly
                        value={generatedResetUrl}
                        style={{
                          flex: 1,
                          fontSize: 11,
                          padding: '8px 10px',
                          borderRadius: 8,
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          color: '#64748b',
                          outline: 'none',
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="btn-secondary"
                        style={{ padding: '8px 12px', fontSize: 12, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
                        title="Copiar link"
                      >
                        {copiedLink ? <Check size={14} color="#15803d" /> : <Copy size={14} />}
                        {copiedLink ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenResetLinkDirectly}
                      className="btn-primary"
                      style={{
                        width: '100%',
                        padding: '10px',
                        fontSize: 13,
                        marginTop: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                    >
                      <ExternalLink size={15} /> Acessar Link e Redefinir Senha
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowRecoveryModal(false)}
                  className="btn-secondary"
                  style={{ width: '100%', padding: '11px', marginTop: 4 }}
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal 2: Reset Password via Secure Token (when visiting ?resetToken=...) */}
      {activeResetToken && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              width: '100%',
              maxWidth: 480,
              padding: '32px 28px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              position: 'relative',
              animation: 'modalPop 0.25s ease forwards',
            }}
          >
            {/* Loading token validation */}
            {tokenValidationState === 'validating' && (
              <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                <Loader2 size={36} className="animate-spin" color="#15803d" style={{ margin: '0 auto 16px' }} />
                <h4 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                  Validando link de recuperação...
                </h4>
                <p style={{ fontSize: 13, color: '#64748b' }}>
                  Aguarde enquanto conferimos a autenticidade do seu link.
                </p>
              </div>
            )}

            {/* Invalid or Expired Token */}
            {tokenValidationState === 'invalid' && (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: '#fee2e2',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  <AlertCircle size={28} />
                </div>
                <h4 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                  Link Inválido ou Expirado
                </h4>
                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, marginBottom: 22 }}>
                  {tokenErrorMessage || 'Por motivos de segurança, links de redefinição são de uso único e expiram após 1 hora.'}
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => {
                      window.history.replaceState({}, document.title, window.location.pathname);
                      setActiveResetToken(null);
                    }}
                    className="btn-secondary"
                    style={{ flex: 1, padding: '11px' }}
                  >
                    Voltar ao Login
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      window.history.replaceState({}, document.title, window.location.pathname);
                      setActiveResetToken(null);
                      handleOpenRecovery();
                    }}
                    className="btn-primary"
                    style={{ flex: 1.2, padding: '11px' }}
                  >
                    Solicitar Novo Link
                  </button>
                </div>
              </div>
            )}

            {/* Valid Token Form & Success */}
            {tokenValidationState === 'valid' && (
              <>
                {!tokenResetSuccess ? (
                  <>
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
                        <Lock size={22} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                          Criar Nova Senha
                        </h3>
                        <p style={{ fontSize: 13, color: '#64748b', margin: '2px 0 0' }}>
                          Defina sua nova senha para acessar a conta
                        </p>
                      </div>
                    </div>

                    {tokenResetError && (
                      <div
                        style={{
                          backgroundColor: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: 10,
                          padding: '10px 14px',
                          marginBottom: 16,
                          color: '#b91c1c',
                          fontSize: 13,
                        }}
                      >
                        {tokenResetError}
                      </div>
                    )}

                    <div
                      style={{
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #dcfce7',
                        borderRadius: 10,
                        padding: '10px 14px',
                        fontSize: 13,
                        color: '#15803d',
                        marginBottom: 16,
                      }}
                    >
                      Conta autenticada: <strong>{tokenUserInfo?.email}</strong>
                    </div>

                    <form onSubmit={handleSubmitTokenReset} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                          Nova Senha
                        </label>
                        <div style={{ position: 'relative' }}>
                          <Lock
                            size={18}
                            color="#94a3b8"
                            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
                          />
                          <input
                            type="password"
                            required
                            placeholder="Mínimo de 6 caracteres"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
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
                          Confirmar Nova Senha
                        </label>
                        <div style={{ position: 'relative' }}>
                          <Lock
                            size={18}
                            color="#94a3b8"
                            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
                          />
                          <input
                            type="password"
                            required
                            placeholder="Repita sua nova senha"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
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
                      </div>

                      <button
                        type="submit"
                        disabled={tokenResetLoading}
                        className="btn-primary"
                        style={{ width: '100%', padding: '12px', fontSize: 14, marginTop: 8 }}
                      >
                        {tokenResetLoading ? (
                          <>
                            <Loader2 size={16} className="animate-spin" /> Salvando nova senha...
                          </>
                        ) : (
                          'Salvar Nova Senha'
                        )}
                      </button>
                    </form>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '12px 0' }}>
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        backgroundColor: '#ecfdf5',
                        color: '#15803d',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px',
                      }}
                    >
                      <CheckCircle2 size={32} />
                    </div>
                    <h4 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                      Senha alterada com sucesso!
                    </h4>
                    <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, marginBottom: 22 }}>
                      Sua senha foi redefinida através do link seguro. Agora você pode entrar normalmente na sua conta.
                    </p>
                    <button
                      type="button"
                      onClick={handleFinishTokenReset}
                      className="btn-primary"
                      style={{ width: '100%', padding: '12px', fontSize: 14 }}
                    >
                      Entrar na Conta
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
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
