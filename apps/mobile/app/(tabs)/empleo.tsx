import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { jobApplicationCreateSchema } from '@navaja/shared';
import { ActionButton, Card, ErrorText, Field, Label, MultilineField, Screen } from '../../components/ui/primitives';
import { env } from '../../lib/env';
import { supabase } from '../../lib/supabase';
import { palette } from '../../lib/theme';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function randomId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

export default function EmpleoScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [experienceYears, setExperienceYears] = useState('1');
  const [availability, setAvailability] = useState('');
  const [cvAsset, setCvAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function pickCv() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    if (!asset) {
      return;
    }
    setCvAsset(asset);
  }

  async function submitApplication() {
    setError(null);
    setMessage(null);

    if (!cvAsset) {
      setError('Adjunta tu CV para continuar.');
      return;
    }

    if (cvAsset.size && cvAsset.size > MAX_FILE_SIZE) {
      setError('El archivo supera 5MB.');
      return;
    }

    const parsed = jobApplicationCreateSchema.safeParse({
      shop_id: env.EXPO_PUBLIC_SHOP_ID,
      name,
      phone,
      email,
      instagram: instagram || null,
      experience_years: Number(experienceYears),
      availability,
    });

    if (!parsed.success) {
      setError('Revisa los datos del formulario.');
      return;
    }

    setSubmitting(true);

    const ext = cvAsset.name?.includes('.') ? cvAsset.name.split('.').pop() : 'pdf';
    const safeName = sanitizeFilename(cvAsset.name || `cv.${ext}`);
    const path = `${parsed.data.shop_id}/${new Date().toISOString().slice(0, 10)}/${randomId()}-${safeName}`;

    try {
      const fileResponse = await fetch(cvAsset.uri);
      const fileBuffer = await fileResponse.arrayBuffer();

      const { error: uploadError } = await supabase.storage.from('cvs').upload(path, fileBuffer, {
        contentType: cvAsset.mimeType || 'application/octet-stream',
        upsert: false,
      });

      if (uploadError) {
        setSubmitting(false);
        setError(uploadError.message);
        return;
      }

      const { error: insertError } = await supabase.from('job_applications').insert({
        shop_id: parsed.data.shop_id,
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email,
        instagram: parsed.data.instagram || null,
        experience_years: parsed.data.experience_years,
        availability: parsed.data.availability,
        cv_path: path,
        status: 'new',
      });

      if (insertError) {
        await supabase.storage.from('cvs').remove([path]);
        setSubmitting(false);
        setError(insertError.message);
        return;
      }

      setSubmitting(false);
      setMessage('Postulación enviada. Te vamos a contactar.');
      setName('');
      setPhone('');
      setEmail('');
      setInstagram('');
      setExperienceYears('1');
      setAvailability('');
      setCvAsset(null);
    } catch {
      setSubmitting(false);
      setError('No se pudo enviar la postulación.');
    }
  }

  return (
    <Screen title="Empleo" subtitle="Postulate con tu CV para sumarte al equipo">
      <Card>
        <Label>Nombre y apellido</Label>
        <Field value={name} onChangeText={setName} />
        <Label>Teléfono</Label>
        <Field value={phone} onChangeText={setPhone} />
        <Label>Email</Label>
        <Field value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Label>Instagram (opcional)</Label>
        <Field value={instagram} onChangeText={setInstagram} />
        <Label>Experiencia (años)</Label>
        <Field value={experienceYears} onChangeText={setExperienceYears} keyboardType="numeric" />
        <Label>Disponibilidad</Label>
        <MultilineField value={availability} onChangeText={setAvailability} />

        <View style={styles.cvBox}>
          <Text style={styles.cvTitle}>CV (PDF/DOC hasta 5MB)</Text>
          <Text style={styles.cvName}>{cvAsset?.name || 'No seleccionaste archivo'}</Text>
          <ActionButton label="Elegir CV" variant="secondary" onPress={pickCv} />
        </View>

        <ErrorText message={error} />
        {message ? <Text style={styles.success}>{message}</Text> : null}
        <ActionButton
          label={submitting ? 'Enviando...' : 'Enviar postulación'}
          onPress={submitApplication}
          disabled={!name || !phone || !email || !availability || submitting}
          loading={submitting}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cvBox: {
    borderWidth: 1,
    borderColor: '#dbe4ee',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  cvTitle: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '700',
  },
  cvName: {
    color: '#64748b',
    fontSize: 12,
  },
  success: {
    color: '#0f766e',
    fontSize: 13,
  },
});
