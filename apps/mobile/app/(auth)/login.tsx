import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ActionButton,
  Card,
  ErrorText,
  Field,
  HeroPanel,
  Label,
  Screen,
} from '../../components/ui/primitives';
import {
  signInWithFacebookOnMobile,
  getPasswordRecoveryRedirectUrl,
  signInWithGoogleOnMobile,
} from '../../lib/auth-links';
import { supabase } from '../../lib/supabase';
import { getStatusSurface, useNavajaTheme } from '../../lib/theme';

type Mode = 'login' | 'register' | 'recover' | 'reset';

function normalizeMode(value: string | undefined): Mode {
  if (value === 'register' || value === 'recover' || value === 'reset') {
    return value;
  }

  return 'login';
}

function isEmailValid(value: string) {
  return /\S+@\S+\.\S+/.test(value);
}

function mapAuthError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return 'Email o contrasena incorrectos.';
  }

  if (normalized.includes('email not confirmed')) {
    return 'Debes confirmar tu email antes de ingresar.';
  }

  if (normalized.includes('for security purposes')) {
    return 'Demasiados intentos. Espera unos minutos e intenta de nuevo.';
  }

  if (normalized.includes('unsupported provider') || normalized.includes('provider is not enabled')) {
    return 'El provider social no esta habilitado en Supabase para este proyecto. Activalo en Authentication > Providers.';
  }

  return message;
}

export default function LoginScreen() {
  const { colors } = useNavajaTheme();
  const warningTone = getStatusSurface(colors, 'warning');
  const params = useLocalSearchParams<{ mode?: string }>();
  const initialMode = useMemo(
    () => normalizeMode(typeof params.mode === 'string' ? params.mode : undefined),
    [params.mode],
  );

  const [mode, setMode] = useState<Mode>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [hasRecoverySession, setHasRecoverySession] = useState(initialMode !== 'reset');

  useEffect(() => {
    setMode(initialMode);
    setError(null);
    setMessage(null);
  }, [initialMode]);

  useEffect(() => {
    if (mode !== 'reset') {
      setHasRecoverySession(true);
      return;
    }

    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setHasRecoverySession(Boolean(data.session));
      }
    });

    return () => {
      active = false;
    };
  }, [mode]);

  function beginRequest() {
    setLoading(true);
    setError(null);
    setMessage(null);
  }

  function endRequest() {
    setLoading(false);
  }

  async function onSubmit() {
    beginRequest();

    try {
      if (mode === 'login') {
        const normalizedEmail = email.trim().toLowerCase();
        if (!isEmailValid(normalizedEmail)) {
          endRequest();
          setError('Ingresa un email valido.');
          return;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (signInError) {
          endRequest();
          setError(mapAuthError(signInError.message));
          return;
        }

        endRequest();
        router.replace('/(tabs)/cuenta');
        return;
      }

      if (mode === 'register') {
        const normalizedEmail = email.trim().toLowerCase();
        if (!isEmailValid(normalizedEmail)) {
          endRequest();
          setError('Ingresa un email valido.');
          return;
        }

        if (password.length < 8) {
          endRequest();
          setError('La contrasena debe tener al menos 8 caracteres.');
          return;
        }

        const signUpPayload = fullName
          ? {
              email: normalizedEmail,
              password,
              options: { data: { full_name: fullName.trim() } },
            }
          : {
              email: normalizedEmail,
              password,
            };

        const { data, error: signUpError } = await supabase.auth.signUp(signUpPayload);

        if (signUpError) {
          endRequest();
          setError(mapAuthError(signUpError.message));
          return;
        }

        if (data.user?.id) {
          await supabase.from('user_profiles').upsert(
            { auth_user_id: data.user.id, full_name: fullName.trim() || null },
            { onConflict: 'auth_user_id' },
          );
        }

        endRequest();
        setMessage(
          data.session ? 'Cuenta creada e iniciada.' : 'Cuenta creada. Revisa tu email para confirmar.',
        );
        if (data.session) {
          router.replace('/(tabs)/cuenta');
        } else {
          setMode('login');
        }
        return;
      }

      if (mode === 'recover') {
        const normalizedEmail = email.trim().toLowerCase();
        if (!isEmailValid(normalizedEmail)) {
          endRequest();
          setError('Ingresa un email valido.');
          return;
        }

        const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(
          normalizedEmail,
          {
            redirectTo: getPasswordRecoveryRedirectUrl(),
          },
        );

        endRequest();

        if (recoveryError) {
          setError(mapAuthError(recoveryError.message));
          return;
        }

        setMessage('Enviamos un enlace para actualizar tu contrasena.');
        return;
      }

      if (!hasRecoverySession) {
        endRequest();
        setError('Tu enlace ya no es valido. Solicita uno nuevo.');
        return;
      }

      if (newPassword.length < 8) {
        endRequest();
        setError('La nueva contrasena debe tener al menos 8 caracteres.');
        return;
      }

      if (newPassword !== confirmPassword) {
        endRequest();
        setError('La confirmacion no coincide.');
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      endRequest();

      if (updateError) {
        setError(mapAuthError(updateError.message));
        return;
      }

      setMessage('Contrasena actualizada. Ya puedes ingresar.');
      setMode('login');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      endRequest();
      setError('No se pudo conectar. Revisa internet y vuelve a intentar.');
    }
  }

  async function continueWithSocial(provider: 'google' | 'facebook') {
    beginRequest();
    const providerLabel = provider === 'google' ? 'Google' : 'Facebook';

    try {
      const result =
        provider === 'google' ? await signInWithGoogleOnMobile() : await signInWithFacebookOnMobile();

      if (result.error) {
        endRequest();
        setError(mapAuthError(result.error));
        return;
      }

      endRequest();
      router.replace(result.nextPath);
    } catch {
      endRequest();
      setError(`No se pudo completar el login con ${providerLabel}.`);
    }
  }

  const modeLabel: Record<Mode, string> = {
    login: 'Ingresar',
    register: 'Registrarme',
    recover: 'Recuperar',
    reset: 'Nueva clave',
  };

  return (
    <Screen
      eyebrow="Acceso"
      title="Ingresa, registrate o recupera tu clave"
      subtitle="El acceso mobile ahora usa el mismo lenguaje de superficies y acciones que el resto de la app."
    >
      <HeroPanel
        eyebrow="Cuenta"
        title="Acceso y recuperacion"
        description="Mantiene el mismo flujo base de la web y te deja seguir como invitado cuando no necesitas una cuenta."
      />

      <Card elevated>
        <View style={styles.modeRow}>
          <ModeButton
            label="Ingresar"
            active={mode === 'login'}
            onPress={() => setMode('login')}
          />
          <ModeButton
            label="Registrarme"
            active={mode === 'register'}
            onPress={() => setMode('register')}
          />
          <ModeButton
            label="Recuperar"
            active={mode === 'recover'}
            onPress={() => setMode('recover')}
          />
        </View>

        {mode === 'register' ? (
          <>
            <Label>Nombre y apellido</Label>
            <Field value={fullName} onChangeText={setFullName} />
          </>
        ) : null}

        {mode !== 'reset' ? (
          <>
            <Label>Email</Label>
            <Field
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </>
        ) : null}

        {mode === 'login' || mode === 'register' ? (
          <>
            <Label>Contrasena</Label>
            <Field value={password} onChangeText={setPassword} secureTextEntry />
          </>
        ) : null}

        {mode === 'reset' ? (
          <>
            {!hasRecoverySession ? (
              <Text
                style={[
                  styles.helper,
                  {
                    color: warningTone.textColor,
                    backgroundColor: warningTone.backgroundColor,
                    borderColor: warningTone.borderColor,
                  },
                ]}
              >
                Tu enlace no esta activo. Solicita uno nuevo desde "Recuperar".
              </Text>
            ) : null}
            <Label>Nueva contrasena</Label>
            <Field value={newPassword} onChangeText={setNewPassword} secureTextEntry />
            <Label>Confirmar contrasena</Label>
            <Field value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
          </>
        ) : null}

        <ErrorText message={error} />
        {message ? <Text style={[styles.success, { color: colors.success }]}>{message}</Text> : null}

        <ActionButton
          label={loading ? 'Procesando...' : mode === 'register' ? 'Crear cuenta' : modeLabel[mode]}
          onPress={onSubmit}
          disabled={
            loading ||
            (mode === 'login' && (!email || !password)) ||
            (mode === 'register' && (!email || !password)) ||
            (mode === 'recover' && !email) ||
            (mode === 'reset' && (!newPassword || !confirmPassword || !hasRecoverySession))
          }
          loading={loading}
        />
        {mode === 'login' || mode === 'register' ? (
          <ActionButton
            label="Continuar con Google"
            variant="secondary"
            onPress={() => {
              void continueWithSocial('google');
            }}
            disabled={loading}
            style={styles.socialButton}
          />
        ) : null}
        {mode === 'login' || mode === 'register' ? (
          <ActionButton
            label="Continuar con Facebook"
            variant="secondary"
            onPress={() => {
              void continueWithSocial('facebook');
            }}
            disabled={loading}
            style={styles.socialButton}
          />
        ) : null}
        {mode === 'login' ? (
          <Pressable
            onPress={() => setMode('recover')}
            accessibilityRole="button"
            accessibilityLabel="Recuperar contrasena"
          >
            <Text style={[styles.recoverLink, { color: colors.textAccent }]}>
              Olvide mi contrasena
            </Text>
          </Pressable>
        ) : null}
        <ActionButton
          label="Continuar como invitado"
          variant="secondary"
          onPress={() => router.replace('/(tabs)/inicio')}
        />
      </Card>
    </Screen>
  );
}

function ModeButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useNavajaTheme();

  return (
    <Pressable
      style={[
        styles.modeButton,
        {
          borderColor: active ? colors.borderActive : colors.borderMuted,
          backgroundColor: active ? colors.pillActive : colors.panelMuted,
        },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.modeText,
          { color: active ? colors.textAccent : colors.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  modeButton: {
    flex: 1,
    borderWidth: 1,
    minWidth: 92,
    borderRadius: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modeText: {
    fontWeight: '700',
    fontSize: 12,
  },
  helper: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
  },
  success: {
    fontSize: 13,
  },
  socialButton: {
    marginTop: 4,
  },
  recoverLink: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
