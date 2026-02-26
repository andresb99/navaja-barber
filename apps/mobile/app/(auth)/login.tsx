import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ActionButton, Card, ErrorText, Field, Label, Screen } from '../../components/ui/primitives';
import { supabase } from '../../lib/supabase';
import { palette } from '../../lib/theme';

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

  return message;
}

export default function LoginScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const initialMode = useMemo(() => normalizeMode(typeof params.mode === 'string' ? params.mode : undefined), [params.mode]);

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

        const { error: signInError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
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
        setMessage(data.session ? 'Cuenta creada e iniciada.' : 'Cuenta creada. Revisa tu email para confirmar.');
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

        const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: 'navajastaff://login?mode=reset',
        });

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

  const modeLabel: Record<Mode, string> = {
    login: 'Ingresar',
    register: 'Registrarme',
    recover: 'Recuperar',
    reset: 'Nueva clave',
  };

  return (
    <Screen title="Acceso" subtitle="Ingresa, registrate o continua como invitado">
      <Card>
        <View style={styles.modeRow}>
          <Pressable
            style={[styles.modeButton, mode === 'login' ? styles.modeButtonActive : null]}
            onPress={() => setMode('login')}
          >
            <Text style={[styles.modeText, mode === 'login' ? styles.modeTextActive : null]}>Ingresar</Text>
          </Pressable>
          <Pressable
            style={[styles.modeButton, mode === 'register' ? styles.modeButtonActive : null]}
            onPress={() => setMode('register')}
          >
            <Text style={[styles.modeText, mode === 'register' ? styles.modeTextActive : null]}>Registrarme</Text>
          </Pressable>
          <Pressable
            style={[styles.modeButton, mode === 'recover' ? styles.modeButtonActive : null]}
            onPress={() => setMode('recover')}
          >
            <Text style={[styles.modeText, mode === 'recover' ? styles.modeTextActive : null]}>Recuperar</Text>
          </Pressable>
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
            <Field value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
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
              <Text style={styles.helper}>Tu enlace no esta activo. Solicita uno nuevo desde "Recuperar".</Text>
            ) : null}
            <Label>Nueva contrasena</Label>
            <Field value={newPassword} onChangeText={setNewPassword} secureTextEntry />
            <Label>Confirmar contrasena</Label>
            <Field value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
          </>
        ) : null}

        <ErrorText message={error} />
        {message ? <Text style={styles.success}>{message}</Text> : null}

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
        {mode === 'login' ? (
          <Pressable
            onPress={() => setMode('recover')}
            accessibilityRole="button"
            accessibilityLabel="Recuperar contrasena"
          >
            <Text style={styles.recoverLink}>Olvide mi contrasena</Text>
          </Pressable>
        ) : null}
        <ActionButton label="Continuar como invitado" variant="secondary" onPress={() => router.replace('/(tabs)/inicio')} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  modeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cfd7e2',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  modeButtonActive: {
    backgroundColor: palette.text,
    borderColor: palette.text,
  },
  modeText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 12,
  },
  modeTextActive: {
    color: '#fff',
  },
  helper: {
    color: '#a16207',
    backgroundColor: '#fef3c7',
    borderColor: '#facc15',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
  },
  success: {
    color: '#0f766e',
    fontSize: 13,
  },
  recoverLink: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    color: '#32465f',
    textAlign: 'center',
  },
});
